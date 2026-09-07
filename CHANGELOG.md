# Changelog

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
