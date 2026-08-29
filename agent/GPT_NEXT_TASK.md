# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1
Phase: CRYSTAL-LOCAL-WORKTREE-RECOVERY-AUDIT
Status: authorized
Model: Luna
Strength: Low
Execution class: READ_ONLY

## Objective
Diagnose the local dirty working tree that blocked `P2A-IMAGE-BACKLOG-CONTINUOUS-COMPLETION`, without modifying the local project, database, Git index, branches, or files. Produce the exact recovery facts needed for GPT to choose a safe cleanup path.

## Context
The previous attempt reported that fast-forward sync was blocked by local/uncommitted Bridge-related changes to:
- `AGENTS.md`
- `agent/GPT_NEXT_TASK.md`
- `outputs/GPT_HANDOFF.json`
- plus untracked Bridge-related files

No backlog/database execution started. Preserve all unknown local changes.

## Mandatory reads
Operate in:
`C:\Users\luo_d\Documents\企划\crystal-design-db`

Read only:
1. current local `HEAD` SHA and branch
2. `origin/main` SHA after a normal fetch if fetch itself does not alter the worktree
3. `git status --short --branch`
4. full tracked diff for the three known modified files above
5. staged diff, if any
6. complete untracked file list with sizes; for text files, read enough content to classify purpose
7. compare local HEAD vs origin/main: ahead/behind counts and changed paths
8. read local and origin versions of `AGENTS.md`, `agent/GPT_NEXT_TASK.md`, `outputs/GPT_HANDOFF.json`
9. identify whether each local change is:
   - Bridge/control-plane integration change
   - Crystal project business/data change
   - generated execution output
   - unknown
10. identify whether any untracked Bridge files belong inside `crystal-design-db` or should live only under `C:\Users\luo_d\Documents\企划\Local-Codex-Bridge`

## Strict boundaries
READ_ONLY only.
Do NOT:
- stash
- reset
- checkout/restore
- clean
- add/commit
- move/copy/delete/rename files
- edit files
- merge/rebase/pull
- write database
- run migrations
- execute backlog import
- change Git config
- modify Bridge code

A normal `git fetch origin` is allowed only if it leaves the worktree/index untouched.

## Required final response
PHASE:
CRYSTAL-LOCAL-WORKTREE-RECOVERY-AUDIT

STATUS:
COMPLETED / BLOCKED

LOCAL HEAD:
<sha>

ORIGIN MAIN:
<sha>

AHEAD / BEHIND:
<ahead> / <behind>

TRACKED MODIFIED:
<paths and concise classification>

STAGED:
<none or paths>

UNTRACKED:
<paths and concise classification>

CONTROL FILE DIFF SUMMARY:
- AGENTS.md: <summary>
- agent/GPT_NEXT_TASK.md: <summary>
- outputs/GPT_HANDOFF.json: <summary>

BRIDGE FILE PLACEMENT:
<which files appear misplaced in crystal repo vs legitimately project-local>

DATABASE TOUCHED:
NO

SAFE RECOVERY OPTIONS:
Rank 1-3, but do not execute them. Each option must state exactly what would be preserved/discarded and why.

RECOMMENDED RECOVERY:
<one concise recommendation>

BLOCKER:
NONE or exact reason

Stop after the audit. Do not perform recovery yet.
