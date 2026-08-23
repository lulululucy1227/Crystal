PRAGMA foreign_keys = ON;

-- P1C-F1: project/collection-level synthesis, intentionally independent from
-- references, preferences, patterns, materials, and market evidence.
CREATE TABLE IF NOT EXISTS design_principle (
  id INTEGER PRIMARY KEY,
  principle_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  statement TEXT NOT NULL,
  rationale TEXT,
  principle_type TEXT NOT NULL CHECK (principle_type IN ('composition','material','color','hardware','rhythm','visual_identity','commercial_design','general')),
  status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','active','deprecated')),
  confidence TEXT NOT NULL DEFAULT 'low' CHECK (confidence IN ('low','medium','high')),
  author_type TEXT NOT NULL CHECK (author_type IN ('assistant_synthesis','user_explicit','joint_project_decision')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TRIGGER IF NOT EXISTS trg_design_principle_updated_at
AFTER UPDATE ON design_principle
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE design_principle SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
