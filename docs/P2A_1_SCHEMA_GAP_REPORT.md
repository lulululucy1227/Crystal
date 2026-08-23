# P2A-1 Schema Gap Report

**Phase:** P2A-1 Small Real-Image Asset Resolution Pilot  
**Result:** **STOPPED BEFORE IMPLEMENTATION**  
**Date:** 2026-08-23

## Gate result

The input and provider-identity gates passed, but the mandatory schema-safety gate failed.

`image_asset` can honestly store the following P2A-1 deterministic values already:

| Required value | Current field | Result |
|---|---|---|
| Detected MIME | `mime_type` | Representable |
| Width | `width_px` | Representable |
| Height | `height_px` | Representable |
| Byte size | `byte_size` | Representable |
| SHA-256 | `image_hash` | Representable if P2A-1 fixes its documented algorithm to SHA-256 |
| Content resolved state | `asset_status`: `unresolved -> available` | Representable without redefining the current vocabulary |
| pHash | No field or related table | **NOT REPRESENTABLE** |

P2A-1 requires pHash to be calculated and treated as a structured, candidate-only visual-similarity signal. Persisting it in `notes` would make algorithm, version, value, distance and provenance non-queryable; storing it in `image_hash` would overwrite or conflate the SHA-256 exact-content identity. Both are prohibited by the task.

## Input validation

| Check | Result |
|---|---|
| Expected pilot image files | 10 |
| Found pilot image files | 10 |
| Missing files | 0 |
| Unexpected image files | 0 |
| Existing provider identities found | 10/10 |
| Provider identity uniqueness | 10/10 exactly one `image_asset` |
| Existing reference links validated | 10/10 |

Validated reference mapping:

| Asset key | Filename | Reference key |
|---|---|---|
| ASSET-000001 | IMG_7633.PNG | REF-000002 |
| ASSET-000002 | IMG_7634.PNG | REF-000002 |
| ASSET-000015 | IMG_7668.PNG | REF-000006 |
| ASSET-000016 | IMG_7669.PNG | REF-000006 |
| ASSET-000046 | IMG_7717.PNG | REF-000019 (R2C-03) |
| ASSET-000047 | IMG_7718.PNG | REF-000019 (R2C-03) |
| ASSET-000048 | IMG_7719.PNG | REF-000019 (R2C-03) |
| ASSET-000064 | IMG_7746.PNG | REF-000025 (R2C-09) |
| ASSET-000065 | IMG_7747.PNG | REF-000025 (R2C-09) |
| ASSET-000066 | IMG_7748.PNG | REF-000025 (R2C-09) |

## Dependency inspection

- Bundled runtime: Python 3.12.13.
- Existing Pillow: 12.3.0 in the Codex bundled runtime.
- ImageHash: not installed.
- No installation was attempted, because schema validation failed first.

## Required decision before resuming

Explicit approval is required for a later migration that introduces a dedicated, queryable perceptual-hash representation. The smallest durable option is a child record or table keyed by `image_asset_id`, containing at minimum:

- algorithm (`phash`)
- encoded hash value
- algorithm/library version and hash-size parameters
- source SHA-256 or content-version link
- calculated timestamp

It must remain candidate-only and must not cause automatic asset or reference merges.

No migration is proposed or created in this phase.

## No-write verification

- Canonical DB modified: **NO**
- Schema modified: **NO**
- Migration created: **NO**
- Resolver/application code added: **NO**
- ImageHash installed: **NO**
- Google Drive accessed: **NO**
- Images downloaded: **0**
- Real images hashed: **0**
- pHash calculated: **0**
- Vision used: **NO**
- Semantic records modified: **0**
- Material/market/supplier writes: **0**
- Other projects modified: **NO**
- Boundary violations: **NO**

Database SHA-256 at gate evaluation: `E098D3E20DE6EC54A918C21F5DACBCD82BC6C365BA29A882DB6DBBDF0F9ABDBC`.
