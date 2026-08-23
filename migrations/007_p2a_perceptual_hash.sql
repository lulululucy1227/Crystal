PRAGMA foreign_keys = ON;

-- P2A-1F0: pHash is a visual-similarity fingerprint, never an asset identity.
-- image_asset.image_hash remains reserved for the cryptographic SHA-256 of bytes.
CREATE TABLE IF NOT EXISTS image_perceptual_hash (
  id INTEGER PRIMARY KEY,
  image_asset_id INTEGER NOT NULL REFERENCES image_asset(id) ON DELETE CASCADE,
  algorithm TEXT NOT NULL CHECK (algorithm IN ('phash')),
  algorithm_version TEXT NOT NULL CHECK (trim(algorithm_version) <> ''),
  hash_value TEXT NOT NULL CHECK (trim(hash_value) <> ''),
  source_content_sha256 TEXT NOT NULL
    CHECK (length(source_content_sha256) = 64 AND source_content_sha256 NOT GLOB '*[^0-9A-Fa-f]*'),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  UNIQUE (image_asset_id, algorithm, algorithm_version, source_content_sha256)
);

CREATE INDEX IF NOT EXISTS idx_image_perceptual_hash_exact
  ON image_perceptual_hash(algorithm, algorithm_version, hash_value);
CREATE INDEX IF NOT EXISTS idx_image_perceptual_hash_source_sha
  ON image_perceptual_hash(source_content_sha256);

CREATE TRIGGER IF NOT EXISTS trg_image_perceptual_hash_updated_at
AFTER UPDATE ON image_perceptual_hash
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE image_perceptual_hash SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
