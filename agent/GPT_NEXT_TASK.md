# GPT NEXT TASK

Protocol: AGENT-HANDOFF-V1

Phase: AGENT-WATCHER-V1.2-DESKTOP-CONTROL
Status: authorized
Model: Luna
Strength: Medium

## Objective
Replace the current always-on watcher experience with a user-controlled Windows desktop controller for Crystal Codex automation. The user must be able to turn automatic task pickup ON or OFF with one click and visibly see the current state.

This phase is watcher/control infrastructure only. Do not execute any business task, do not rerun P2A-2R, and do not modify database/schema/image/semantic data.

## User intent and safety priority
The user explicitly does NOT want background polling or writes running all day by default. Resource impact, memory use, disk writes, network use, sleep/wake behavior, and reversibility must be treated as first-class requirements.

Default state after installation must be OFF.
No startup auto-enable.
No wake-from-sleep behavior.
No administrator requirement.
When OFF there must be no periodic polling, no network fetch, no watcher process, and no background Codex launch.

## Desktop UX
Create a simple Windows-native desktop control surface, preferably PowerShell + WinForms/WPF or another already-available Windows-native mechanism. Do not introduce Electron, Python GUI frameworks, web servers, or large new dependencies.

The user should have a clearly named desktop shortcut, for example:
`Crystal Codex 自动接任务`

The controller should show at minimum:
- AUTO MODE: ON / OFF
- scheduler/watcher status
- current task phase/status if locally available
- last poll time
- last Codex run time/status if available
- retry count / blocked state if available

Provide one-click actions:
- 开启自动接任务
- 关闭自动接任务
- 立即检查一次
- 打开日志

Keep the UI small and obvious. No background tray agent is required unless it is materially simpler and lower-resource than the alternatives.

## Preferred scheduling model
When AUTO MODE is ON:
- use a Windows user-level scheduled task or equivalent low-overhead Windows-native scheduler;
- invoke the existing watcher in one-shot mode (`watcher.ps1 -Once`) at a conservative interval of 5 minutes;
- each poll process must exit after the one-shot cycle;
- do not keep a resident PowerShell watcher alive between polls;
- preserve the watcher lock so overlapping runs skip safely.

When AUTO MODE is OFF:
- disable/remove the periodic scheduled trigger or otherwise guarantee zero recurring poll execution;
- any currently idle watcher process should be stopped safely if it exists;
- do not terminate unrelated PowerShell/Codex processes.

Do not configure the task to wake the computer.
Do not run when the user is logged out unless required by the existing local environment; prefer current-user interactive mode only.

## Resource limits
Implement conservative resource behavior:
- poll interval: 5 minutes
- one-shot polling only
- max one Codex process at a time
- same fingerprint max automatic retries: 2
- retry backoff: at least 5 minutes
- after retry limit, stop retrying that fingerprint and expose BLOCKED / NEEDS REVIEW in the controller
- log rotation or truncation so watcher/controller logs remain bounded, target total 2-5 MB
- no continuous memory-resident service
- no busy loop

If the existing watcher state format must be extended for retry count or controller state, keep it minimal and gitignored.

## Existing watcher reuse
First audit and reuse the current implementation under:
`tools/agent-watcher/`

Do not rewrite from scratch.
Preserve:
- task fingerprinting
- lock / single-run protection
- clean-worktree safety
- fetch + fast-forward-only behavior
- workspace-write sandbox
- on-request approval policy
- failure/backoff logic where compatible

The earlier AGENT-WATCHER-V1.1-RECOVERY phase was not successfully auto-launched. Do not execute its previous business of interrupted-task recovery unless a tiny part is strictly necessary to support the desktop controller. The priority of this phase is manual ON/OFF control and low-resource scheduling.

## Windows integration
Create a reversible, user-level setup.
Allowed examples:
- one Task Scheduler task named `Crystal Agent Watcher`
- one desktop shortcut to the controller
- versioned source files under `tools/agent-watcher/`

Do not require admin privileges.
Do not add a Windows service.
Do not add a startup launcher that turns auto mode ON after reboot.
If any old Startup launcher/resident watcher from previous phases still exists, safely disable/remove only the Crystal-specific one so there is no duplicate scheduling path.

Provide a clean uninstall/remove path that removes:
- Crystal-specific scheduled task
- Crystal-specific desktop shortcut
- optional local controller state
without touching unrelated Windows tasks or user files.

## Safety before OS-level changes
Before creating/removing Task Scheduler entries or desktop shortcuts, inspect the exact current local state first.
If Windows requires interactive approval or an operation cannot be safely scoped to Crystal, stop and clearly show:
`【需要你确认】`

## Validation
At minimum prove:
1. install completes without admin rights
2. default AUTO MODE after setup is OFF
3. OFF means no periodic watcher process/poll/network fetch is scheduled
4. clicking ON enables 5-minute one-shot polling
5. clicking OFF disables recurring polling
6. `立即检查一次` runs exactly one safe poll
7. watcher lock prevents overlap
8. same fingerprint cannot auto-retry more than 2 times
9. failure/backoff state is visible to the controller
10. logs remain bounded under a synthetic repeated-log test
11. scheduled task does not have WakeToRun enabled
12. no old Crystal Startup/resident watcher remains active
13. desktop shortcut opens the controller successfully
14. no business task is executed during tests; use synthetic/dry-run/mock Codex launch

## Performance / hardware impact report
The handoff MUST include a concise resource impact section with:
- expected steady-state RAM when OFF: should be effectively zero for this feature
- expected steady-state RAM between polls when ON: should be effectively zero except Task Scheduler itself
- transient PowerShell memory during one poll
- expected CPU behavior
- disk/log write behavior and cap
- network behavior
- sleep/wake behavior
- exact way to disable/uninstall
- worst-case automatic retry behavior

Do not claim exact MB numbers unless measured locally. If measured, report the measurement context.

## Deliverables
Expected minimal deliverables may include:
- desktop controller script/UI under `tools/agent-watcher/`
- enable/disable/check-once helper scripts if useful
- Task Scheduler setup/remove helpers
- desktop shortcut setup/remove helper
- watcher changes only if needed for retry caps/log bounds/controller-readable state
- focused tests
- README update
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/AGENT-WATCHER-V1.2-DESKTOP-CONTROL.json`

## Boundaries
Forbidden:
- business-task execution
- database/schema/data/image changes
- P2A-2R rerun
- new large dependencies/frameworks
- Windows service installation
- admin-only design
- always-on resident watcher
- auto-enable at boot/login
- wake-computer scheduling
- sandbox/approval weakening
- modifying any other repository

## Reporting
Update:
- `outputs/GPT_HANDOFF.json`
- `outputs/handoffs/AGENT-WATCHER-V1.2-DESKTOP-CONTROL.json`

Include:
- controller mechanism
- desktop shortcut path/name
- scheduler mechanism and interval
- default ON/OFF state
- exact enable/disable behavior
- retry cap/backoff
- log cap
- tests
- performance/resource impact
- uninstall method
- any user confirmation still required
- boundary check

After push, stop. Do not authorize or start any business phase automatically.