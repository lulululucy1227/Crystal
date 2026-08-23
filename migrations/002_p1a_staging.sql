PRAGMA foreign_keys = ON;

-- P1A-R: provenance-safe import, review and packaging support.
CREATE TABLE IF NOT EXISTS material_alias (
  id INTEGER PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES material(id) ON DELETE CASCADE,
  alias_raw TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  language_code TEXT,
  source_id INTEGER REFERENCES source(id),
  review_status TEXT NOT NULL DEFAULT 'proposed' CHECK (review_status IN ('proposed','reviewed','rejected')),
  confidence TEXT NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (material_id, alias_raw)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_material_alias_reviewed_identity
  ON material_alias(normalized_alias) WHERE review_status = 'reviewed';

CREATE TABLE IF NOT EXISTS material_claim (
  id INTEGER PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES material(id) ON DELETE CASCADE,
  claim_field TEXT NOT NULL,
  raw_value TEXT NOT NULL,
  normalized_value TEXT,
  source_id INTEGER REFERENCES source(id),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','partially_verified','verified','disputed')),
  confidence TEXT NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  observation_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_narrative (
  id INTEGER PRIMARY KEY,
  material_id INTEGER REFERENCES material(id) ON DELETE SET NULL,
  narrative_type TEXT NOT NULL CHECK (narrative_type IN ('cultural_symbolism','traditional_association','brand_story','other')),
  statement TEXT NOT NULL,
  source_id INTEGER REFERENCES source(id),
  source_context TEXT,
  confidence TEXT NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_assessment (
  id INTEGER PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('material','material_variant','component','product_concept','packaging_option','other')),
  subject_id INTEGER,
  target_market TEXT NOT NULL,
  assessment_text TEXT NOT NULL,
  analyst TEXT NOT NULL,
  basis_notes TEXT,
  assessment_date TEXT NOT NULL DEFAULT CURRENT_DATE,
  confidence TEXT NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packaging_option (
  id INTEGER PRIMARY KEY,
  packaging_code TEXT NOT NULL UNIQUE,
  packaging_type TEXT NOT NULL CHECK (packaging_type IN ('pouch','envelope_pouch','gift_box','rigid_box','large_packaging','insert','card','other')),
  material_description TEXT,
  dimensions TEXT,
  finish TEXT,
  suitable_tier TEXT NOT NULL DEFAULT 'unclassified' CHECK (suitable_tier IN ('accessible','mid','premium','unclassified')),
  source_id INTEGER REFERENCES source(id),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','partially_verified','verified','disputed')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS packaging_supplier_offer (
  id INTEGER PRIMARY KEY,
  packaging_option_id INTEGER NOT NULL REFERENCES packaging_option(id),
  supplier_id INTEGER REFERENCES supplier(id),
  source_id INTEGER REFERENCES source(id),
  quote_currency TEXT NOT NULL,
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  unit_label TEXT NOT NULL,
  moq INTEGER,
  quoted_on TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','partially_verified','verified','disputed')),
  notes TEXT
);

ALTER TABLE material_variant ADD COLUMN commercial_tier TEXT NOT NULL DEFAULT 'unclassified'
  CHECK (commercial_tier IN ('accessible','mid','premium','unclassified'));
ALTER TABLE material_variant ADD COLUMN source_tier_label TEXT;
ALTER TABLE supplier_offer ADD COLUMN commercial_tier TEXT NOT NULL DEFAULT 'unclassified'
  CHECK (commercial_tier IN ('accessible','mid','premium','unclassified'));
ALTER TABLE supplier_offer ADD COLUMN source_tier_label TEXT;

CREATE TABLE IF NOT EXISTS import_batch (
  id INTEGER PRIMARY KEY,
  source_file TEXT NOT NULL,
  source_format TEXT NOT NULL CHECK (source_format IN ('csv','xlsx','manual','other')),
  source_description TEXT,
  imported_by TEXT NOT NULL,
  batch_status TEXT NOT NULL DEFAULT 'staged' CHECK (batch_status IN ('staged','validated','ready_for_review','completed','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staged_record (
  id INTEGER PRIMARY KEY,
  import_batch_id INTEGER NOT NULL REFERENCES import_batch(id) ON DELETE CASCADE,
  source_sheet TEXT,
  source_row INTEGER,
  raw_record_json TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  validation_status TEXT NOT NULL DEFAULT 'staged' CHECK (validation_status IN ('staged','validated','ready','review_required','human_approved','rejected','promoted')),
  warning_summary TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(import_batch_id, source_sheet, source_row, target_entity)
);

CREATE TABLE IF NOT EXISTS staged_field (
  id INTEGER PRIMARY KEY,
  staged_record_id INTEGER NOT NULL REFERENCES staged_record(id) ON DELETE CASCADE,
  source_column TEXT,
  raw_value TEXT,
  normalized_value TEXT,
  target_entity TEXT NOT NULL,
  target_field TEXT NOT NULL,
  field_status TEXT NOT NULL DEFAULT 'staged' CHECK (field_status IN ('staged','valid','warning','error','review_required')),
  warning_or_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_decision (
  id INTEGER PRIMARY KEY,
  staged_record_id INTEGER NOT NULL REFERENCES staged_record(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  reviewer TEXT NOT NULL,
  decided_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS promotion_log (
  id INTEGER PRIMARY KEY,
  staged_record_id INTEGER NOT NULL UNIQUE REFERENCES staged_record(id),
  canonical_entity TEXT NOT NULL,
  canonical_id INTEGER NOT NULL,
  promoted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  promoted_by TEXT NOT NULL,
  provenance_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_claim_material ON material_claim(material_id);
CREATE INDEX IF NOT EXISTS idx_narrative_material ON material_narrative(material_id);
CREATE INDEX IF NOT EXISTS idx_stage_batch ON staged_record(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_stage_field_record ON staged_field(staged_record_id);
