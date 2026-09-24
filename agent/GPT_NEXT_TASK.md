# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: ADMIN-REPOSITORY-VISIBILITY-PRIVATE-20260924
Status: READY
Execution class: GITHUB_ADMIN_ONLY

EXECUTION_MODEL: GPT-5.6 Terra
EFFORT: Medium
REASON: Security-sensitive GitHub repository administration change; no product/code work is required.

## Goal

Change the GitHub repository visibility of `lulululucy1227/Crystal` from PUBLIC to PRIVATE.

## User authorization

The repository owner explicitly authorized this visibility change in ChatGPT on 2026-09-24.

## Execute

1. Preflight the exact repository `lulululucy1227/Crystal` and confirm its current visibility.
2. Confirm the authenticated GitHub identity has repository Administration permission.
3. Change ONLY repository visibility to `private`.
   - GitHub CLI is acceptable, e.g.:
     `gh repo edit lulululucy1227/Crystal --visibility private --accept-visibility-change-consequences`
   - Equivalent GitHub administration API/UI automation is acceptable if available.
4. Read back repository metadata and verify `visibility=private` / `private=true`.
5. Update the normal Crystal handoff with the terminal result, then STOP.

## Hard boundaries

- Do NOT modify product files, data, SQLite, Workbench, outputs, branches, refs, releases, Actions, collaborators, secrets, webhooks, default branch, branch protection, rulesets, or Pages settings.
- Do NOT perform product engineering.
- Do NOT reset/clean/stash/rebase or otherwise normalize local work.
- Do NOT create a replacement repository.
- Do NOT rename or transfer the repository.
- If Administration permission is unavailable or GitHub requires an owner-only confirmation that the agent cannot complete, report `BLOCKED_ADMIN_PERMISSION` and stop. Do not bypass it.
- Do not claim that changing visibility erases prior public clones/caches; it only restricts future repository access.

## Acceptance

- Exact target: `lulululucy1227/Crystal`
- GitHub metadata read-back reports PRIVATE.
- No unrelated code/data/worktree change.
