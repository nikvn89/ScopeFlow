# Changelog

## 0.5.0 — Milestone v2 candidate: Deterministic Lifecycle Finality

### Added

- Configurable Contractor acceptance windows bounded from 300 to 2,592,000 seconds.
- Seven-day default window on the preserved `create_project` entry point.
- Contractor-only `decline_project(project_id)`.
- Permissionless `expire_project(project_id)` after the exact deadline.
- Version-pinned two-party `approve_close(project_id)`; stale votes cannot close a newer scope.
- Terminal states `DECLINED`, `EXPIRED`, and `CLOSED`, with chain timestamps and final scope version.
- `PROJECT_CLOSED` derived status for pending extensions after mutual close.
- Direct production-contract harness with 99 behavioral checks.
- Reproducible dependency lockfile and CI that runs contract tests plus the production frontend build.

### Corrected

- The dApp now waits for `FINALIZED`, requires `FINISHED_WITH_RETURN`, reports `FINISHED_WITH_ERROR` as execution failure, refreshes state for rollback inspection, and verifies successful method-specific postconditions.
- Finalized receipts without an execution result are now followed by a bounded transaction poll, eliminating the observed manual-refresh path while remaining fail-closed.
- Scope Ledger UI now loads all pages instead of silently stopping after the first 20 versions.
- Frontend code splitting reduced the largest production JavaScript chunk from 786.94 kB to 286.93 kB.

### Preserved

- Accepted v0.3.0 deployment and frozen Milestone v1 v0.4.0 deployment remain unchanged.
- Existing `create_project` signature and all prior public methods.
- Contractor opt-in, pre-acceptance Client cancellation, semantic enum, fail-closed classification, two-party extensions, supersession, capacity, replay guards, and immutable scope ledger.
- Lifecycle transitions use deterministic contract logic and perform zero semantic evaluations.

### Deployment status

```text
Accepted baseline v0.3.0: 0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
Milestone v1 v0.4.0:     0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
Milestone v2 v0.5.0:     0xBe44d208A83b15973b91932f75eaA354795E907e (SOURCE PARITY + CORE RUNTIME PASS)
Candidate SHA256:        ac4ff25ac0bd4ead34db528e97f3d822e96a39fbc88e8fbd37b66a7eb1e704bc
```

## 0.4.0 — Milestone v1: Immutable Scope Version Ledger

### Added

- Immutable effective-scope version ledger.
- `get_scope_version(project_id, version)` full historical snapshot view.
- `get_scope_versions(project_id, from_version, count)` paginated provenance view.
- `scope_version_count` in `get_project()`.
- Contract capability/version fields in `get_registry()`.
- Scope Ledger frontend timeline with snapshot inspection and approval provenance.
- Source/model invariant suite with 52 directed checks and a 5,000-trace property sweep.
- Fresh StudioNet runtime evidence bundle.

### Preserved

- Existing `ScopeGuard` class name and baseline public methods.
- Contractor opt-in gate.
- Client-only cancellation before acceptance.
- Existing semantic enum and conservative classification rules.
- Two-party extension approval.
- Scope-version pinning and supersession protection.
- Duplicate/rejected/applied replay guards.
- 6,000-character append-time capacity guard.

### Deployment

```text
Accepted baseline: 0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
Milestone v1:     0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
Frozen SHA256:    4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

Fresh runtime validation passed V1 creation, V2/V3 provenance, historical immutability, supersession rollback/no-write, unrelated-wallet authorization rollback/no-write, and applied-extension replay rollback/no-write.
