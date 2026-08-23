PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migration (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reference_enum (
  domain TEXT NOT NULL,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (domain, code)
);

CREATE TABLE IF NOT EXISTS source (
  id INTEGER PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('supplier','marketplace','brand','editorial','social','user_upload','internal_note','other')),
  name TEXT NOT NULL,
  source_url TEXT,
  geography TEXT,
  observed_on TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','partially_verified','verified','disputed')),
  evidence_strength TEXT NOT NULL DEFAULT 'low' CHECK (evidence_strength IN ('low','medium','high')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS material (
  id INTEGER PRIMARY KEY,
  canonical_name TEXT NOT NULL UNIQUE,
  material_family TEXT NOT NULL CHECK (material_family IN ('mineral','crystal','gemstone','wood','pearl','metal','organic','other')),
  natural_status TEXT NOT NULL DEFAULT 'unknown' CHECK (natural_status IN ('natural','cultured','synthetic','treated','unknown')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS material_variant (
  id INTEGER PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES material(id),
  variant_code TEXT NOT NULL UNIQUE,
  grade_label TEXT,
  color_description TEXT,
  transparency TEXT CHECK (transparency IN ('transparent','semi_transparent','opaque','cloudy','unknown')),
  optical_features TEXT,
  inclusion_features TEXT,
  cut_description TEXT,
  size_range_mm TEXT,
  treatment_disclosure TEXT,
  reproducibility TEXT NOT NULL DEFAULT 'repeatable' CHECK (reproducibility IN ('repeatable','limited_lot','one_of_one')),
  unique_piece_code TEXT,
  indicative_currency TEXT,
  indicative_price_minor INTEGER CHECK (indicative_price_minor >= 0),
  provenance_source_id INTEGER REFERENCES source(id),
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','partially_verified','verified','disputed')),
  notes TEXT,
  CHECK ((reproducibility = 'one_of_one' AND unique_piece_code IS NOT NULL) OR reproducibility <> 'one_of_one')
);

CREATE TABLE IF NOT EXISTS component (
  id INTEGER PRIMARY KEY,
  component_code TEXT NOT NULL UNIQUE,
  component_type TEXT NOT NULL CHECK (component_type IN ('round_bead','oval_bead','cube_bead','disc_bead','freeform_mineral','wood_piece','pearl','spacer','cap','connector','chain','clasp','extension','charm','other')),
  material_variant_id INTEGER REFERENCES material_variant(id),
  shape_code TEXT NOT NULL,
  size_mm TEXT,
  hole_spec TEXT,
  design_role TEXT NOT NULL CHECK (design_role IN ('hero','anchor','atmosphere','texture','transition','light','shadow','accent','structural_mineral')),
  visual_weight TEXT NOT NULL CHECK (visual_weight IN ('light','medium','heavy')),
  hardware_finish TEXT,
  source_id INTEGER REFERENCES source(id),
  is_one_of_one INTEGER NOT NULL DEFAULT 0 CHECK (is_one_of_one IN (0,1)),
  image_path TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS design_pattern (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pattern_family TEXT NOT NULL,
  description TEXT NOT NULL,
  applicability_notes TEXT
);

CREATE TABLE IF NOT EXISTS hardware_language (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hardware_role TEXT NOT NULL CHECK (hardware_role IN ('frame','cap','transition','separator','anchor','extension','secondary_line','micro_accent','narrative_component')),
  metal_material TEXT,
  finish TEXT NOT NULL CHECK (finish IN ('brushed','matte','oxidized','hammered','rock_texture','fine_engraving','mirror','other')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS focal_assembly (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  focal_intent TEXT NOT NULL,
  assembly_status TEXT NOT NULL DEFAULT 'concept' CHECK (assembly_status IN ('concept','sampled','approved','retired')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS focal_assembly_item (
  focal_assembly_id INTEGER NOT NULL REFERENCES focal_assembly(id) ON DELETE CASCADE,
  component_id INTEGER NOT NULL REFERENCES component(id),
  hardware_language_id INTEGER REFERENCES hardware_language(id),
  position_role TEXT NOT NULL CHECK (position_role IN ('hero','left_frame','right_frame','transition','connector','secondary_line','accent')),
  sequence_order INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (focal_assembly_id, sequence_order)
);

CREATE TABLE IF NOT EXISTS design_reference (
  id INTEGER PRIMARY KEY,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('uploaded_image','external_image','product_page','editorial','social','other')),
  source_id INTEGER REFERENCES source(id),
  local_image_path TEXT,
  source_url TEXT,
  brand_or_designer TEXT,
  reference_date TEXT,
  relevance_score INTEGER CHECK (relevance_score BETWEEN 1 AND 5),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS design_reference_observation (
  id INTEGER PRIMARY KEY,
  design_reference_id INTEGER NOT NULL REFERENCES design_reference(id) ON DELETE CASCADE,
  observation_type TEXT NOT NULL CHECK (observation_type IN ('material','shape','size','hardware','composition','focal_structure','rhythm','asymmetry','color_system','transparency_system','texture_system')),
  observed_value TEXT NOT NULL,
  identification_status TEXT NOT NULL CHECK (identification_status IN ('observed','uncertain','confirmed')),
  confirmed_material_variant_id INTEGER REFERENCES material_variant(id),
  confidence TEXT NOT NULL CHECK (confidence IN ('low','medium','high')),
  notes TEXT,
  CHECK ((identification_status = 'confirmed' AND confirmed_material_variant_id IS NOT NULL) OR (identification_status <> 'confirmed' AND confirmed_material_variant_id IS NULL))
);

CREATE TABLE IF NOT EXISTS design_assessment (
  id INTEGER PRIMARY KEY,
  design_reference_id INTEGER NOT NULL UNIQUE REFERENCES design_reference(id) ON DELETE CASCADE,
  strengths TEXT,
  weaknesses TEXT,
  reusable_patterns TEXT,
  risks TEXT,
  brand_relevance TEXT,
  possible_theme TEXT CHECK (possible_theme IN ('Mountain','Ocean','Forest','Sunrise','Starlight','Glacier','Unassigned')),
  assistant_assessment TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preference_evidence (
  id INTEGER PRIMARY KEY,
  design_reference_id INTEGER REFERENCES design_reference(id) ON DELETE SET NULL,
  product_concept_id INTEGER,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('explicit_like','explicit_dislike','explicit_constraint','explicit_priority')),
  statement TEXT NOT NULL,
  rationale TEXT,
  recorded_on TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_context TEXT
);

CREATE TABLE IF NOT EXISTS visual_communication_reference (
  id INTEGER PRIMARY KEY,
  design_reference_id INTEGER UNIQUE REFERENCES design_reference(id) ON DELETE CASCADE,
  composition TEXT,
  camera_angle TEXT,
  crop TEXT,
  background TEXT,
  lighting TEXT,
  contrast TEXT,
  shadow TEXT,
  color_grading TEXT,
  depth_of_field TEXT,
  props TEXT,
  model_styling TEXT,
  typography TEXT,
  layout_description TEXT,
  copy_style TEXT,
  product_scale TEXT,
  presentation_mode TEXT CHECK (presentation_mode IN ('editorial','ecommerce','gallery','campaign','other')),
  perceived_premium_level INTEGER CHECK (perceived_premium_level BETWEEN 1 AND 5),
  strengths TEXT,
  weaknesses TEXT,
  reusable_visual_patterns TEXT
);

CREATE TABLE IF NOT EXISTS market_evidence (
  id INTEGER PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES source(id),
  brand TEXT,
  product_name TEXT,
  market TEXT,
  price_currency TEXT,
  price_minor INTEGER CHECK (price_minor >= 0),
  observed_on TEXT NOT NULL,
  claim TEXT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified','partially_verified','verified','disputed')),
  evidence_strength TEXT NOT NULL CHECK (evidence_strength IN ('low','medium','high')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS supplier (
  id INTEGER PRIMARY KEY,
  source_id INTEGER UNIQUE REFERENCES source(id),
  supplier_name TEXT NOT NULL,
  geography TEXT,
  supplier_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','partially_verified','verified','disputed')),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS supplier_offer (
  id INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES supplier(id),
  material_variant_id INTEGER REFERENCES material_variant(id),
  component_id INTEGER REFERENCES component(id),
  quote_currency TEXT NOT NULL,
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  unit_label TEXT NOT NULL,
  moq INTEGER,
  grade_claim TEXT,
  quoted_on TEXT,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified','partially_verified','verified','disputed')),
  notes TEXT,
  CHECK (material_variant_id IS NOT NULL OR component_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS product_concept (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  theme TEXT NOT NULL CHECK (theme IN ('Mountain','Ocean','Forest','Sunrise','Starlight','Glacier','Unassigned')),
  version_label TEXT NOT NULL DEFAULT 'v0',
  status TEXT NOT NULL DEFAULT 'concept' CHECK (status IN ('concept','research','sample','approved','archived')),
  intent TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS bom (
  id INTEGER PRIMARY KEY,
  product_concept_id INTEGER NOT NULL REFERENCES product_concept(id) ON DELETE CASCADE,
  version_label TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','estimated','quoted','approved')),
  UNIQUE (product_concept_id, version_label)
);

CREATE TABLE IF NOT EXISTS bom_line (
  id INTEGER PRIMARY KEY,
  bom_id INTEGER NOT NULL REFERENCES bom(id) ON DELETE CASCADE,
  component_id INTEGER NOT NULL REFERENCES component(id),
  quantity REAL NOT NULL CHECK (quantity > 0),
  waste_rate REAL NOT NULL DEFAULT 0 CHECK (waste_rate >= 0 AND waste_rate < 1),
  unit_cost_minor INTEGER NOT NULL CHECK (unit_cost_minor >= 0),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_variant_material ON material_variant(material_id);
CREATE INDEX IF NOT EXISTS idx_component_variant ON component(material_variant_id);
CREATE INDEX IF NOT EXISTS idx_observation_reference ON design_reference_observation(design_reference_id);
CREATE INDEX IF NOT EXISTS idx_market_source ON market_evidence(source_id);
CREATE INDEX IF NOT EXISTS idx_offer_supplier ON supplier_offer(supplier_id);
