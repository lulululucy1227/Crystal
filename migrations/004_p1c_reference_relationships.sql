PRAGMA foreign_keys = ON;

-- P1C-F0: structured reference relationships and evidence identity.
-- Legacy design_assessment.possible_theme and reusable_patterns remain intact.
CREATE TABLE IF NOT EXISTS design_reference_pattern (
  id INTEGER PRIMARY KEY,
  design_reference_id INTEGER NOT NULL REFERENCES design_reference(id) ON DELETE CASCADE,
  design_pattern_id INTEGER NOT NULL REFERENCES design_pattern(id) ON DELETE RESTRICT,
  relevance TEXT NOT NULL DEFAULT 'moderate' CHECK (relevance IN ('low','moderate','strong')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (design_reference_id, design_pattern_id)
);

CREATE TABLE IF NOT EXISTS design_reference_theme (
  id INTEGER PRIMARY KEY,
  design_reference_id INTEGER NOT NULL REFERENCES design_reference(id) ON DELETE CASCADE,
  theme TEXT NOT NULL CHECK (theme IN ('Mountain','Ocean','Forest','Sunrise','Starlight','Glacier')),
  relevance TEXT NOT NULL DEFAULT 'moderate' CHECK (relevance IN ('low','moderate','strong')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (design_reference_id, theme)
);

ALTER TABLE design_reference ADD COLUMN reference_key TEXT;
ALTER TABLE design_reference ADD COLUMN record_status TEXT NOT NULL DEFAULT 'synthetic'
  CHECK (record_status IN ('real','demo','test_fixture','synthetic'));
ALTER TABLE design_reference ADD COLUMN evidence_status TEXT NOT NULL DEFAULT 'unknown'
  CHECK (evidence_status IN ('source_confirmed','user_supplied','assistant_observed','external_unverified','unknown'));
ALTER TABLE design_reference ADD COLUMN source_url_normalized TEXT;
ALTER TABLE design_reference ADD COLUMN image_hash TEXT;

-- Existing rows receive deterministic keys.  New rows receive a key immediately
-- after insert when none was supplied; callers may also supply a stable unique key.
UPDATE design_reference
SET reference_key = printf('REF-%06d', id)
WHERE reference_key IS NULL OR trim(reference_key) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_design_reference_key ON design_reference(reference_key);
CREATE INDEX IF NOT EXISTS idx_reference_pattern_pattern ON design_reference_pattern(design_pattern_id);
CREATE INDEX IF NOT EXISTS idx_reference_theme_theme ON design_reference_theme(theme);
CREATE INDEX IF NOT EXISTS idx_design_reference_normalized_url ON design_reference(source_url_normalized)
  WHERE source_url_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_design_reference_image_hash ON design_reference(image_hash)
  WHERE image_hash IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS trg_design_reference_assign_key
AFTER INSERT ON design_reference
WHEN NEW.reference_key IS NULL OR trim(NEW.reference_key) = ''
BEGIN
  UPDATE design_reference SET reference_key = printf('REF-%06d', NEW.id) WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_design_reference_no_blank_key
BEFORE UPDATE OF reference_key ON design_reference
WHEN NEW.reference_key IS NULL OR trim(NEW.reference_key) = ''
BEGIN
  SELECT RAISE(ABORT, 'design_reference.reference_key must not be blank');
END;

-- Explicit duplicate candidates; this is deliberately a view, not an automatic
-- merge or raw-URL uniqueness rule. Hash matches are hard; normalized URL matches
-- are strong candidates. Soft candidates remain a review workflow.
CREATE VIEW IF NOT EXISTS design_reference_duplicate_candidate AS
SELECT a.id AS reference_id, b.id AS candidate_reference_id, 'hard_image_hash' AS duplicate_level
FROM design_reference a JOIN design_reference b
  ON a.id < b.id AND a.image_hash IS NOT NULL AND a.image_hash = b.image_hash
UNION ALL
SELECT a.id, b.id, 'strong_normalized_url'
FROM design_reference a JOIN design_reference b
  ON a.id < b.id AND a.source_url_normalized IS NOT NULL
 AND a.source_url_normalized = b.source_url_normalized
 AND (a.image_hash IS NULL OR b.image_hash IS NULL OR a.image_hash <> b.image_hash);
