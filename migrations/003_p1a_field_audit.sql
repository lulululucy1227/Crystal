PRAGMA foreign_keys = ON;

-- P1A-F0: human field decisions and canonical-write provenance are deliberately
-- separate from staged-field validation and the legacy row-level summary log.
CREATE TABLE IF NOT EXISTS field_review_decision (
  id INTEGER PRIMARY KEY,
  staged_field_id INTEGER NOT NULL REFERENCES staged_field(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected','retained_staged')),
  reviewer TEXT NOT NULL,
  reason TEXT,
  reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_field_review_effective
  ON field_review_decision(staged_field_id, reviewed_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS field_promotion_log (
  id INTEGER PRIMARY KEY,
  staged_record_id INTEGER NOT NULL REFERENCES staged_record(id),
  canonical_entity TEXT NOT NULL,
  canonical_record_id INTEGER NOT NULL,
  canonical_field TEXT,
  operation TEXT NOT NULL CHECK (operation IN ('create','update','link')),
  promotion_reason TEXT NOT NULL,
  promoted_by TEXT NOT NULL,
  promoted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_field_promotion_record ON field_promotion_log(staged_record_id);

CREATE TABLE IF NOT EXISTS field_promotion_source (
  field_promotion_log_id INTEGER NOT NULL REFERENCES field_promotion_log(id) ON DELETE CASCADE,
  staged_field_id INTEGER NOT NULL REFERENCES staged_field(id),
  PRIMARY KEY (field_promotion_log_id, staged_field_id)
);
CREATE INDEX IF NOT EXISTS idx_field_promotion_source_field ON field_promotion_source(staged_field_id);
