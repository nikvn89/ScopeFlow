# ScopeFlow

**Consensus-governed project scope with an immutable effective-scope version ledger.**

ScopeFlow lets a Client commit an initial scope, requires explicit Contractor opt-in, classifies change requests with GenLayer consensus, and requires both parties to approve material scope extensions. Milestone v1 adds a permanent on-chain history of every scope version that actually became effective.

## Deployments

### Accepted baseline

```text
Address: 0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
Contract version: 0.3.0
Source SHA256: dee6484d093e5487a59e83f29718fed593334d848bc52cdfc012cd5c922d3ee7
```

### Milestone v1

```text
Address: 0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
Contract version: 0.4.0
Contract source: contracts/ScopeFlow.py
Source SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

The baseline is retained as the before-state. Milestone v1 was deployed as a fresh StudioNet instance because the Intelligent Contract changed.

## Milestone v1 — Immutable Scope Version Ledger

New behavior:

- no effective snapshot exists before Contractor acceptance;
- Contractor acceptance writes immutable V1 from the exact committed initial scope;
- each fully approved extension appends exactly one new version;
- every version records previous version, originating request, extension text, effective time, and approval provenance;
- historical effective-scope text remains readable after newer versions become active;
- rejected, failed, superseded, unauthorized, or replayed paths cannot create phantom versions;
- paginated ledger reads expose an ordered, gap-free chain.

New read methods:

```text
get_scope_version(project_id, version)
get_scope_versions(project_id, from_version, count)
```

`get_project()` also exposes `scope_version_count`, and `get_registry()` advertises `contract_version = 0.4.0` plus `scope_version_ledger = true`.

## Scope Ledger UI

The History area is upgraded to a Scope Ledger workspace with:

- V1 → V2 → V3 timeline;
- current-version marker;
- previous-version link;
- originating request;
- effective timestamp;
- Client/Contractor approval provenance;
- full historical effective-scope snapshot;
- request audit trail.

The frontend is configured for the milestone deployment address.

## Preserved governance invariants

- only the named Contractor can activate a pending project;
- Client cancellation is limited to the pre-acceptance state;
- requests are blocked before acceptance and after cancellation;
- semantic decisions remain `SCOPE_IN`, `SCOPE_EXTENSION`, or `SCOPE_UNCLEAR`;
- only `SCOPE_EXTENSION` enters two-party approval;
- each request is pinned to the scope version it was classified against;
- stale requests become non-actionable after another extension advances scope;
- duplicate approval, rejected-extension replay, applied-extension replay, and scope-capacity overflow remain guarded;
- semantic failure raises before consequential request/counter writes complete.

## Reproduce local ledger checks

```bash
npm run test:ledger
```

Current result:

```text
52/52 directed/source checks passed
Property sweep: 5000 traces / 80313 transitions / 0 invariant failures
Contract SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

## Frontend

```bash
npm install
npm run build
npm run dev
```

Environment:

```text
VITE_CONTRACT_ADDRESS=0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
```

## Evidence

See:

- `MILESTONE_1_EVIDENCE.md` — fresh StudioNet runtime proof and milestone comparison;
- `MILESTONE_1_RUNTIME_TEST.md` — executed load-bearing runtime sequence;
- `TESTING.md` — baseline and milestone testing notes;
- `docs/evidence/` — runtime screenshots and captured local test output.
