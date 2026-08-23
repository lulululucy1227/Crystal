# P2A-1F0 Perceptual Hash Foundation Report

**Result:** PASS  
**Date:** 2026-08-23  
**Scope:** Schema foundation only. The real-image P2A-1 pilot was not resumed.

## Existing `image_hash` audit

`image_asset.image_hash` remains unchanged and is now explicitly documented as the cryptographic SHA-256 exact-content hash of the asset bytes. It remains separate from the historical reference-level `design_reference.image_hash` field. No existing `image_hash` values were modified.

## Migration created

- Created: `migrations/007_p2a_perceptual_hash.sql`
- Applied to the canonical SQLite database: `007_p2a_perceptual_hash`
- Existing migrations 001–006 were not edited.

## Tables added / existing tables altered

| Item | Result |
|---|---|
| New table | `image_perceptual_hash` |
| Existing tables altered | None |
| New pairwise-similarity table | None |
| New embedding table | None |
| Asset lifecycle/status redesign | None |

## Perceptual hash fields

`image_perceptual_hash` contains:

- `id`
- `image_asset_id` — foreign key to the existing asset identity
- `algorithm` — currently controlled to `phash` only
- `algorithm_version` — implementation/library and parameter version supplied by the resolver
- `hash_value` — perceptual fingerprint, not globally unique
- `source_content_sha256` — mandatory 64-character SHA-256 of the exact bytes used
- `created_at`, `updated_at`, optional `notes`

## Algorithm and source-content strategy

- **Algorithm:** Generic field, constrained to `phash` in this foundation. No dHash, wHash, colorhash, crop-resistant hash or embeddings were added.
- **Version:** Resolver must supply a compact reproducibility value such as `imagehash-<library-version>-hashsize-<n>`; no separate semantic-version system was invented.
- **Source content:** `source_content_sha256` is mandatory and hexadecimal SHA-256 shaped. A pHash cannot silently survive a content change of the same provider asset.

## Unique / idempotency strategy

The unique key is:

```text
image_asset_id + algorithm + algorithm_version + source_content_sha256
```

It prevents duplicate runs for the same asset/content/algorithm/version. `hash_value` is intentionally not globally unique: different images may produce the same visual-similarity fingerprint.

## Queryability strategy

The new exact-match index covers `algorithm + algorithm_version + hash_value`; a source-SHA index supports stale-content checks. Hamming-distance comparison and candidate generation remain future on-demand logic. No pairwise candidate rows, grouping changes or automatic merges exist.

## Automatic merge authority

**NONE.** A pHash record cannot modify `image_asset`, provider identity, `design_reference`, or `design_reference_image` relationships. It is candidate-only by design.

## Tests and results

Added `test/p2a-1f0-perceptual-hash.test.mjs` with three focused tests:

1. clean 001–007 initialization creates the table and expected fields;
2. 001–006 upgrade preserves existing image identity and creates no pHash rows;
3. pHash is content-bound and idempotent, allows identical values on different assets, rejects unsupported algorithms/missing SHA, and leaves asset/reference identity unchanged.

Full suite result: **26 passed, 0 failed**. The 23 pre-existing tests all passed.

## Canonical database verification

| Measure | Before | After |
|---|---:|---:|
| Latest migration | 006 | 007 |
| `image_perceptual_hash` rows | n/a | 0 |
| `image_asset` rows | 66 | 66 |
| `design_reference` rows | 25 | 25 |
| `design_reference_image` rows | 66 | 66 |
| `preference_evidence` rows | 34 | 34 |
| `design_assessment` rows | 24 | 24 |
| `design_pattern` rows | 26 | 26 |
| `design_principle` rows | 1 | 1 |
| Material / market / supplier records | unchanged | unchanged |

The database SHA-256 changed from `E098D3E20DE6EC54A918C21F5DACBCD82BC6C365BA29A882DB6DBBDF0F9ABDBC` to `BE8133357E1C703659B1BFCA26C64456A4E47C0B46B2C7692A970D70E1BD7917` only because the approved migration added an empty table, indexes, trigger and migration-ledger entry.

## Boundary verification

- Existing image identities changed: **0**
- Existing references changed: **0**
- Real pHashes calculated: **0**
- Real SHA-256 calculated: **0**
- ImageHash installed: **NO**
- Google Drive accessed: **NO**
- Image processing: **NO**
- Vision used: **NO**
- OpenViking touched: **NO**
- Material/sourcing/market data modified: **NO**
- Other projects modified: **NO**
- Schema boundary violations: **NONE**

## New blockers

None for P2A-1 schema capacity. The next phase still needs an explicitly isolated ImageHash installation and the existing strict 10-file/10-identity pre-write gates before it can calculate the first real pHash values.

## Recommended action to resume P2A-1

Resume only the approved 10-image deterministic pilot: verify the exact handoff manifest again, install ImageHash in an isolated project-local or user-managed environment, calculate Pillow metadata + SHA-256 + pHash for only those ten existing assets, write only supported deterministic fields and `image_perceptual_hash` rows, then rerun for idempotency. Do not proceed to visual analysis or P2A-2.
