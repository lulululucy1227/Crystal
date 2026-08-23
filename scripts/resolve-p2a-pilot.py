"""Deterministic resolver for the explicitly approved P2A-1R ten-image pilot.

This script deliberately has no provider API, Vision, OCR, semantic inference,
or asset creation path. Provider identity is validated against existing SQLite
rows before local handoff bytes can update deterministic asset metadata.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from dataclasses import asdict, dataclass
from itertools import combinations
from pathlib import Path
from typing import Any

import imagehash
from PIL import Image, UnidentifiedImageError, __version__ as PILLOW_VERSION


PILOT = (
    ("IMG_7633.PNG", "1qS7NQNzDumzUY4AkUkG-yNZZMOJP4aAn"),
    ("IMG_7634.PNG", "15J4Ez8epFIP9eUrnLRCL_is9aIwo1_18"),
    ("IMG_7668.PNG", "13g7OoySHNNqRTxDbM7C0KMQlPY4my7mr"),
    ("IMG_7669.PNG", "1ZzYQA4n6qr8k0WIR2yERh73dB2rf0EeQ"),
    ("IMG_7717.PNG", "1g6yv6Us99R2cZo0LnkREVy1Ay06v2y21"),
    ("IMG_7718.PNG", "17LJ0d7HrM8q1_tZ90Tawg_d9ls0wpFcn"),
    ("IMG_7719.PNG", "1hHNYxMLEigF5LWeRR2cr9jn4mpHfvmuC"),
    ("IMG_7746.PNG", "18MJC1bptZd2zkKmQuqyrz__8dS66IUqB"),
    ("IMG_7747.PNG", "1eM8jLX-2TBR_H-capyHhZwyhqcWKQVqY"),
    ("IMG_7748.PNG", "1GKxvYZThWTXNpkHEIoEzXlgiL1C6K5jQ"),
)
EXPECTED_FILENAMES = frozenset(filename for filename, _ in PILOT)
PHASH_THRESHOLD = 6  # Conservative <=6 Hamming-distance candidate over 64 bits; advisory only.
PHASH_VERSION = f"imagehash-{imagehash.__version__}-hashsize-8"
MIME_BY_FORMAT = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp", "GIF": "image/gif", "TIFF": "image/tiff"}
EXTENSION_BY_FORMAT = {"PNG": ".png", "JPEG": ".jpg", "WEBP": ".webp", "GIF": ".gif", "TIFF": ".tiff"}


class PilotError(RuntimeError):
    pass


@dataclass(frozen=True)
class ResolvedInput:
    filename: str
    provider_file_id: str
    asset_id: int
    asset_key: str
    reference_key: str
    detected_format: str
    mime_type: str
    width_px: int
    height_px: int
    byte_size: int
    sha256: str
    phash: str
    status_before: str


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_exact_manifest(pilot_dir: Path) -> None:
    if not pilot_dir.is_dir():
        raise PilotError(f"Pilot directory does not exist: {pilot_dir}")
    found = {path.name for path in pilot_dir.iterdir() if path.is_file()}
    missing = sorted(EXPECTED_FILENAMES - found)
    unexpected = sorted(found - EXPECTED_FILENAMES)
    if missing or unexpected:
        raise PilotError(json.dumps({"missing": missing, "unexpected": unexpected}, ensure_ascii=False))


def inspect_file(filename: str, provider_file_id: str, asset: sqlite3.Row, pilot_dir: Path) -> ResolvedInput:
    path = pilot_dir / filename
    try:
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            image.load()
            detected_format = image.format
            width_px, height_px = image.size
            phash = str(imagehash.phash(image, hash_size=8))
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise PilotError(f"Malformed or undecodable image {filename}: {error}") from error
    if detected_format not in MIME_BY_FORMAT:
        raise PilotError(f"Unsupported detected format for {filename}: {detected_format}")
    expected_extension = EXTENSION_BY_FORMAT[detected_format]
    if path.suffix.lower() != expected_extension:
        raise PilotError(f"Filename/content conflict for {filename}: detected {detected_format}")
    return ResolvedInput(
        filename=filename,
        provider_file_id=provider_file_id,
        asset_id=asset["id"],
        asset_key=asset["asset_key"],
        reference_key=asset["reference_key"],
        detected_format=detected_format,
        mime_type=MIME_BY_FORMAT[detected_format],
        width_px=width_px,
        height_px=height_px,
        byte_size=path.stat().st_size,
        sha256=sha256_file(path),
        phash=phash,
        status_before=asset["asset_status"],
    )


def preflight(db: sqlite3.Connection, pilot_dir: Path) -> list[ResolvedInput]:
    assert_exact_manifest(pilot_dir)
    migration = db.execute("SELECT 1 FROM schema_migration WHERE version='007_p2a_perceptual_hash'").fetchone()
    table = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='image_perceptual_hash'").fetchone()
    if not migration or not table:
        raise PilotError("P2A-1F0 schema foundation is missing.")
    select_asset = """
      SELECT a.id, a.asset_key, a.image_hash, a.asset_status, r.reference_key,
             COUNT(ri.id) AS link_count
      FROM image_asset a
      JOIN design_reference_image ri ON ri.image_asset_id=a.id
      JOIN design_reference r ON r.id=ri.design_reference_id
      WHERE a.provider='google_drive' AND a.provider_file_id=?
      GROUP BY a.id
    """
    rows: list[ResolvedInput] = []
    for filename, provider_file_id in PILOT:
        matches = db.execute(select_asset, (provider_file_id,)).fetchall()
        if len(matches) != 1 or matches[0]["link_count"] < 1:
            raise PilotError(f"Provider identity must map to exactly one linked asset: {provider_file_id}")
        asset = matches[0]
        existing = db.execute(
            "SELECT source_content_sha256 FROM image_perceptual_hash WHERE image_asset_id=?", (asset["id"],)
        ).fetchall()
        if asset["image_hash"] is None and existing:
            raise PilotError(f"Unexpected pHash without resolved SHA-256 for {filename}")
        if asset["image_hash"] is not None and any(row["source_content_sha256"].lower() != asset["image_hash"].lower() for row in existing):
            raise PilotError(f"Unexpected stale pHash state for {filename}")
        rows.append(inspect_file(filename, provider_file_id, asset, pilot_dir))
    conflicts = [row.filename for row in rows if db.execute("SELECT image_hash FROM image_asset WHERE id=?", (row.asset_id,)).fetchone()[0] not in (None, row.sha256)]
    if conflicts:
        raise PilotError(f"CONTENT_CHANGED / STALE CANDIDATE: {', '.join(conflicts)}")
    return rows


def resolve(db_path: Path, pilot_dir: Path) -> dict[str, Any]:
    db = sqlite3.connect(db_path)
    db.row_factory = sqlite3.Row
    try:
        resolved = preflight(db, pilot_dir)
        created_hashes = reused_hashes = updated_assets = 0
        db.execute("BEGIN IMMEDIATE")
        try:
            for row in resolved:
                current = db.execute(
                    "SELECT mime_type,width_px,height_px,byte_size,image_hash,asset_status FROM image_asset WHERE id=?", (row.asset_id,)
                ).fetchone()
                if current is None or current["image_hash"] not in (None, row.sha256):
                    raise PilotError(f"CONTENT_CHANGED / STALE CANDIDATE during commit: {row.filename}")
                for field, expected in (("mime_type", row.mime_type), ("width_px", row.width_px), ("height_px", row.height_px), ("byte_size", row.byte_size)):
                    if current[field] is not None and current[field] != expected:
                        raise PilotError(f"Existing deterministic metadata conflict for {row.filename}: {field}")
                needs_update = any(current[field] is None for field in ("mime_type", "width_px", "height_px", "byte_size", "image_hash")) or current["asset_status"] == "unresolved"
                if needs_update:
                    db.execute(
                        "UPDATE image_asset SET mime_type=?,width_px=?,height_px=?,byte_size=?,image_hash=?,asset_status=? WHERE id=?",
                        (row.mime_type, row.width_px, row.height_px, row.byte_size, row.sha256, "available", row.asset_id),
                    )
                    updated_assets += 1
                existing = db.execute(
                    "SELECT id,hash_value FROM image_perceptual_hash WHERE image_asset_id=? AND algorithm='phash' AND algorithm_version=? AND source_content_sha256=?",
                    (row.asset_id, PHASH_VERSION, row.sha256),
                ).fetchone()
                if existing:
                    if existing["hash_value"] != row.phash:
                        raise PilotError(f"Existing pHash conflict for {row.filename}")
                    reused_hashes += 1
                else:
                    db.execute(
                        "INSERT INTO image_perceptual_hash(image_asset_id,algorithm,algorithm_version,hash_value,source_content_sha256) VALUES (?,?,?,?,?)",
                        (row.asset_id, "phash", PHASH_VERSION, row.phash, row.sha256),
                    )
                    created_hashes += 1
            db.commit()
        except Exception:
            db.rollback()
            raise

        exact = []
        near = []
        for left, right in combinations(resolved, 2):
            if left.sha256 == right.sha256:
                exact.append([left.asset_key, right.asset_key])
            distance = int(imagehash.hex_to_hash(left.phash) - imagehash.hex_to_hash(right.phash))
            if distance <= PHASH_THRESHOLD:
                near.append({"assets": [left.asset_key, right.asset_key], "distance": distance})
        statuses = {row.asset_id: db.execute("SELECT asset_status FROM image_asset WHERE id=?", (row.asset_id,)).fetchone()[0] for row in resolved}
        return {
            "runtime": {"pillow": PILLOW_VERSION, "imagehash": imagehash.__version__, "phash_version": PHASH_VERSION},
            "requested": len(PILOT),
            "resolved": [{**asdict(row), "asset_status": statuses[row.asset_id]} for row in resolved],
            "created": {"image_assets": 0, "reference_links": 0, "perceptual_hashes": created_hashes, "updated_assets": updated_assets},
            "reused_perceptual_hashes": reused_hashes,
            "exact_duplicate_candidates": exact,
            "near_duplicate_candidates": near,
            "phash_threshold": PHASH_THRESHOLD,
        }
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("pilot_dir", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        result = resolve(args.database, args.pilot_dir)
    except PilotError as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(2)
    payload = json.dumps({"ok": True, **result}, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
    print(payload)


if __name__ == "__main__":
    main()
