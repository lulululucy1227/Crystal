# AGENT-HANDOFF-V1

GitHub is the shared task and handoff layer between GPT and Codex.

Bridge and Agent operations must also comply with `agent/BRIDGE_PERMISSION_PROTOCOL.md`. The default is `READ_ONLY + DEFAULT DENY`; an Agent may not expand a path or capability without a new explicit user/GPT grant.

## Codex protocol

1. Before a new phase, read `agent/GPT_NEXT_TASK.md`.
2. Execute only the phase named there.
3. Do not auto-advance to another phase.
4. Respect model/strength guidance, write boundaries, approval gates, and acceptance criteria.
5. If Codex requires user approval, pause and request it. Never bypass approval controls.
6. At completion or safe stop:
   - run required tests/checks;
   - commit, push, or update handoff files only when the current task grant explicitly includes the corresponding capability and path;
   - archive the same result to `outputs/handoffs/<PHASE>.json` only when explicitly authorized.
7. Handoffs must report DELTA only, not repeat the full project history.
8. Detailed reports are optional and only warranted for migrations, complex failures, security/data-integrity issues, or major architecture decisions.
9. After publishing the handoff, STOP and wait for a new task.
10. Never infer a new implementation phase from old reports.

## Handoff minimum fields

- protocol_version
- phase
- status
- commit_sha
- branch
- changed_files
- actual_changes
- critical_boundaries_preserved
- tests_or_checks
- risks_or_blockers
- requires_gpt_decision
- next_minimum_action

## Source of truth

- SQLite/project files = product/data truth
- GitHub = shared code/task/handoff transport
- `agent/GPT_NEXT_TASK.md` = current task
- `outputs/GPT_HANDOFF.json` = latest execution result

Keep handoffs concise and factual. Use file/table/test pointers instead of duplicated prose.
