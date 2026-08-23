# Agent Watcher V1.4 OSS pattern audit

## GitHub Actions Runner

REUSE: authorization/listening is separate from the worker that actually executes a job.

ADAPT: record a watcher-owned active run only after the child process is created.

DO NOT USE: runner service architecture, runner protocol, or IPC.

## RunWisp

REUSE: a run has an explicit start, finish, exit code, duration, and terminal result.

ADAPT: retain only one active run plus the existing bounded retry state in local JSON.

DO NOT USE: daemon, web dashboard, REST API, or supervisor.

## TaskFerry

REUSE: task identity, run identity, result, and logs are different objects.

ADAPT: bind a run to the authorized task fingerprint and phase.

DO NOT USE: queue or daemon architecture.

## HomeRun

REUSE: show the current task, plain execution state, elapsed time, and log entry.

ADAPT: keep this to a small WinForms window.

DO NOT USE: runner management or any background manager.

## PsUi

REUSE: the UI consumes state from background work rather than deciding work state itself.

ADAPT: use the built-in WinForms timer only for local state/process refresh.

DO NOT USE: PsUi dependency or another UI framework.
