PRAGMA foreign_keys = ON;

-- P2A-3F1: append-only reference-level synthesis with image-observation provenance.
CREATE TABLE IF NOT EXISTS design_reference_synthesis_assertion (
  id INTEGER PRIMARY KEY,
  assertion_key TEXT NOT NULL UNIQUE CHECK (trim(assertion_key) <> ''),
  design_reference_id INTEGER NOT NULL REFERENCES design_reference(id) ON DELETE RESTRICT,
  synthesis_scope TEXT NOT NULL CHECK (synthesis_scope IN ('product_design','assistant_assessment','promotional_visual')),
  assertion_class TEXT NOT NULL CHECK (assertion_class IN ('observation','inference')),
  assertion_type TEXT NOT NULL CHECK (trim(assertion_type) <> ''),
  asserted_value TEXT NOT NULL CHECK (trim(asserted_value) <> ''),
  confidence TEXT NOT NULL CHECK (confidence IN ('low','medium','high')),
  notes TEXT,
  producer_type TEXT NOT NULL CHECK (producer_type IN ('assistant_model','human')),
  producer_id TEXT NOT NULL CHECK (trim(producer_id) <> ''),
  analysis_version TEXT NOT NULL CHECK (trim(analysis_version) <> ''),
  synthesis_run_key TEXT NOT NULL CHECK (trim(synthesis_run_key) <> ''),
  supersedes_assertion_id INTEGER REFERENCES design_reference_synthesis_assertion(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (supersedes_assertion_id IS NULL OR supersedes_assertion_id <> id),
  UNIQUE (
    design_reference_id, synthesis_scope, assertion_class, assertion_type,
    asserted_value, producer_type, producer_id, analysis_version
  )
);

CREATE INDEX IF NOT EXISTS idx_reference_synthesis_assertion_lookup
  ON design_reference_synthesis_assertion(design_reference_id, synthesis_scope);

CREATE TABLE IF NOT EXISTS design_reference_synthesis_source (
  synthesis_assertion_id INTEGER NOT NULL
    REFERENCES design_reference_synthesis_assertion(id) ON DELETE RESTRICT,
  image_visual_observation_id INTEGER NOT NULL
    REFERENCES image_visual_observation(id) ON DELETE RESTRICT,
  PRIMARY KEY (synthesis_assertion_id, image_visual_observation_id)
);

CREATE INDEX IF NOT EXISTS idx_reference_synthesis_source_observation
  ON design_reference_synthesis_source(image_visual_observation_id);

CREATE TRIGGER IF NOT EXISTS trg_reference_synthesis_assertion_lineage_insert
BEFORE INSERT ON design_reference_synthesis_assertion
WHEN NEW.supersedes_assertion_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NEW.supersedes_assertion_id = NEW.id
      THEN RAISE(ABORT, 'design_reference_synthesis_assertion cannot supersede itself')
    WHEN (SELECT design_reference_id FROM design_reference_synthesis_assertion
          WHERE id = NEW.supersedes_assertion_id) <> NEW.design_reference_id
      THEN RAISE(ABORT, 'synthesis supersession must use the same design reference')
    WHEN (SELECT synthesis_scope FROM design_reference_synthesis_assertion
          WHERE id = NEW.supersedes_assertion_id) <> NEW.synthesis_scope
      THEN RAISE(ABORT, 'synthesis supersession must use the same scope')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_reference_synthesis_assertion_no_update
BEFORE UPDATE ON design_reference_synthesis_assertion
BEGIN
  SELECT RAISE(ABORT, 'design_reference_synthesis_assertion is append-only; insert a correction row');
END;

CREATE TRIGGER IF NOT EXISTS trg_reference_synthesis_assertion_no_delete
BEFORE DELETE ON design_reference_synthesis_assertion
BEGIN
  SELECT RAISE(ABORT, 'design_reference_synthesis_assertion history cannot be deleted');
END;

CREATE TRIGGER IF NOT EXISTS trg_reference_synthesis_source_reference_insert
BEFORE INSERT ON design_reference_synthesis_source
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM design_reference_synthesis_assertion assertion
      JOIN image_visual_observation observation
        ON observation.id = NEW.image_visual_observation_id
      JOIN design_reference_image reference_image
        ON reference_image.image_asset_id = observation.image_asset_id
       AND reference_image.design_reference_id = assertion.design_reference_id
      WHERE assertion.id = NEW.synthesis_assertion_id
    ) THEN RAISE(ABORT, 'synthesis source observation must belong to the assertion design reference')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_reference_synthesis_source_no_update
BEFORE UPDATE ON design_reference_synthesis_source
BEGIN
  SELECT RAISE(ABORT, 'design_reference_synthesis_source is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_reference_synthesis_source_no_delete
BEFORE DELETE ON design_reference_synthesis_source
BEGIN
  SELECT RAISE(ABORT, 'design_reference_synthesis_source evidence cannot be deleted');
END;
