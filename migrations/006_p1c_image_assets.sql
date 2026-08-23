PRAGMA foreign_keys = ON;

-- P1C-R2A: durable asset identity, deliberately separate from design semantics.
CREATE TABLE IF NOT EXISTS image_asset (
  id INTEGER PRIMARY KEY,
  asset_key TEXT UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('google_drive','local','chat_upload','other')),
  provider_file_id TEXT,
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  width_px INTEGER CHECK (width_px IS NULL OR width_px > 0),
  height_px INTEGER CHECK (height_px IS NULL OR height_px > 0),
  byte_size INTEGER CHECK (byte_size IS NULL OR byte_size >= 0),
  image_hash TEXT,
  external_locator TEXT,
  asset_status TEXT NOT NULL DEFAULT 'available' CHECK (asset_status IN ('available','unresolved','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_asset_provider_identity
  ON image_asset(provider, provider_file_id) WHERE provider_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_image_asset_hash ON image_asset(image_hash) WHERE image_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS design_reference_image (
  id INTEGER PRIMARY KEY,
  design_reference_id INTEGER NOT NULL REFERENCES design_reference(id) ON DELETE CASCADE,
  image_asset_id INTEGER NOT NULL REFERENCES image_asset(id) ON DELETE RESTRICT,
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  image_role TEXT NOT NULL DEFAULT 'unknown' CHECK (image_role IN ('overall','detail','on_wrist','promotional','unknown')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  UNIQUE (design_reference_id, image_asset_id),
  UNIQUE (design_reference_id, display_order)
);
CREATE INDEX IF NOT EXISTS idx_reference_image_asset ON design_reference_image(image_asset_id);

CREATE TRIGGER IF NOT EXISTS trg_image_asset_assign_key
AFTER INSERT ON image_asset
WHEN NEW.asset_key IS NULL OR trim(NEW.asset_key) = ''
BEGIN
  UPDATE image_asset SET asset_key = printf('ASSET-%06d', NEW.id) WHERE id = NEW.id;
END;

-- Assets require a stable key after insert; provider file IDs and hashes remain optional.
CREATE TRIGGER IF NOT EXISTS trg_image_asset_no_blank_key
BEFORE UPDATE OF asset_key ON image_asset
WHEN NEW.asset_key IS NULL OR trim(NEW.asset_key) = ''
BEGIN
  SELECT RAISE(ABORT, 'image_asset.asset_key must not be blank');
END;

CREATE VIEW IF NOT EXISTS image_asset_duplicate_candidate AS
SELECT a.id AS image_asset_id, b.id AS candidate_image_asset_id, 'hard_image_hash' AS duplicate_level
FROM image_asset a JOIN image_asset b
  ON a.id < b.id AND a.image_hash IS NOT NULL AND a.image_hash = b.image_hash;
