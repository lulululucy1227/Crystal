PRAGMA foreign_keys = ON;

-- P2A-2F1: image-level visual assertions. Confirmed facts remain outside this table.
CREATE TABLE IF NOT EXISTS image_visual_observation (
  id INTEGER PRIMARY KEY,
  image_asset_id INTEGER NOT NULL REFERENCES image_asset(id) ON DELETE CASCADE,
  source_content_sha256 TEXT NOT NULL
    CHECK (length(source_content_sha256) = 64 AND source_content_sha256 NOT GLOB '*[^0-9A-Fa-f]*'),
  observation_scope TEXT NOT NULL CHECK (observation_scope IN ('product_design','promotional_visual')),
  assertion_class TEXT NOT NULL CHECK (assertion_class IN ('observation','inference')),
  observation_type TEXT NOT NULL CHECK (trim(observation_type) <> ''),
  observed_value TEXT NOT NULL CHECK (trim(observed_value) <> ''),
  confidence TEXT NOT NULL CHECK (confidence IN ('low','medium','high')),
  producer_type TEXT NOT NULL CHECK (producer_type IN ('assistant_model','human')),
  producer_id TEXT NOT NULL CHECK (trim(producer_id) <> ''),
  analysis_version TEXT NOT NULL CHECK (trim(analysis_version) <> ''),
  supersedes_observation_id INTEGER REFERENCES image_visual_observation(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  UNIQUE (
    image_asset_id, source_content_sha256, observation_scope, assertion_class,
    observation_type, observed_value, producer_type, producer_id, analysis_version
  )
);

CREATE INDEX IF NOT EXISTS idx_image_visual_observation_asset
  ON image_visual_observation(image_asset_id, source_content_sha256);
CREATE INDEX IF NOT EXISTS idx_image_visual_observation_analysis
  ON image_visual_observation(analysis_version, producer_type, producer_id);

CREATE TRIGGER IF NOT EXISTS trg_image_visual_observation_source_sha_insert
BEFORE INSERT ON image_visual_observation
BEGIN
  SELECT CASE
    WHEN (SELECT image_hash FROM image_asset WHERE id = NEW.image_asset_id) IS NULL
      THEN RAISE(ABORT, 'image_visual_observation requires a resolved image_asset SHA-256')
    WHEN lower((SELECT image_hash FROM image_asset WHERE id = NEW.image_asset_id)) <> lower(NEW.source_content_sha256)
      THEN RAISE(ABORT, 'image_visual_observation source SHA-256 does not match image_asset')
  END;
  SELECT CASE
    WHEN NEW.supersedes_observation_id = NEW.id
      THEN RAISE(ABORT, 'image_visual_observation cannot supersede itself')
    WHEN NEW.supersedes_observation_id IS NOT NULL
      AND (SELECT image_asset_id FROM image_visual_observation WHERE id = NEW.supersedes_observation_id) <> NEW.image_asset_id
      THEN RAISE(ABORT, 'image_visual_observation supersede lineage must use the same asset')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_image_visual_observation_no_update
BEFORE UPDATE ON image_visual_observation
BEGIN
  SELECT CASE
    WHEN (SELECT image_hash FROM image_asset WHERE id = NEW.image_asset_id) IS NULL
      THEN RAISE(ABORT, 'image_visual_observation requires a resolved image_asset SHA-256')
    WHEN lower((SELECT image_hash FROM image_asset WHERE id = NEW.image_asset_id)) <> lower(NEW.source_content_sha256)
      THEN RAISE(ABORT, 'image_visual_observation source SHA-256 does not match image_asset')
    ELSE RAISE(ABORT, 'image_visual_observation is append-only; insert a correction row')
  END;
END;
