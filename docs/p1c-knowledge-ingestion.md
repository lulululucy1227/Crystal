# P1C Real Design Knowledge JSONL

Each line is one JSON object. The importer accepts `user_preference`, `design_pattern` and the explicit `assistant_design_principle` record in P1C. A supplied image path, URL, reference record, assistant assessment, material, component, supplier or market-evidence field is rejected rather than silently repurposed.

Required common keys: `seed_key`, `record_type`, `record_status`, `evidence_status`.

- `record_status`: `real`, `demo`, `test_fixture`, `synthetic`
- `evidence_status`: `source_confirmed`, `user_supplied`, `assistant_observed`, `external_unverified`, `unknown`
- `user_preference`: requires `evidence_type`, `title`, `preference_features[]`.
- `design_pattern`: requires `name`, `pattern_family`, `description`.
- `assistant_design_principle`: requires `principle_key`, `name`, `statement`, `rationale`, `principle_type`, `status`, `confidence`, `author_type`. It never becomes a reference-bound assistant assessment.

For non-reference preference records, status provenance is preserved in the existing `preference_evidence.source_context` using a stable `seed_key`; it does not create a fake `design_reference`. Re-importing the same seed key is idempotent. This format does not infer theme links: theme relations require a real reference and explicitly supplied theme relevance.

The current seed pack uses `unclassified` as `pattern_family` and the exact pattern name as `description` where the supplied seed had no longer definition. That preserves the label without inventing design meaning.
