# Milestone 1 Evidence — Immutable Scope Version Ledger

Status: **RUNTIME VALIDATED / SOURCE FROZEN**

## Accepted baseline

The previously accepted deployment remains the immutable before-state for this milestone:

```text
Accepted deployment: 0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
Accepted contract version: 0.3.0
Accepted source SHA256: dee6484d093e5487a59e83f29718fed593334d848bc52cdfc012cd5c922d3ee7
```

## Milestone deployment

```text
Milestone deployment: 0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
Contract version: 0.4.0
Source: contracts/ScopeFlow.py
Frozen SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

The deployed source adds an immutable effective-scope version ledger while preserving the existing `ScopeGuard` class and accepted governance model.

## What changed

- V1 is written only when Contractor acceptance makes the initial committed scope effective.
- Every fully approved extension appends exactly one new immutable effective-scope snapshot.
- Each version stores its previous version, originating request, exact extension text, effective timestamp, and both-party approval provenance.
- Historical effective-scope text remains queryable after later versions become active.
- `get_scope_version(project_id, version)` returns one full snapshot.
- `get_scope_versions(project_id, from_version, count)` returns ordered paginated provenance.
- `get_project()` now exposes `scope_version_count`.
- The frontend includes a Scope Ledger timeline and historical-snapshot inspection UI.

## Fresh StudioNet runtime result

The load-bearing path was executed on the milestone deployment.

### R1 — clean deployment profile — PASS

`get_registry()` returned a fresh state with:

```text
project_count = 0
contract_version = 0.4.0
scope_version_ledger = true
```

Evidence: `docs/evidence/m1-01-fresh-deploy-registry.png`

### R2 — no effective snapshot before acceptance; Contractor acceptance creates V1 — PASS

Before acceptance, Project #1 was pending with `scope_version_count = 0`, and `get_scope_version(1,1)` was unavailable. After the named Contractor accepted, Project #1 became ACTIVE with:

```text
active_scope_version = 1
scope_version_count = 1
```

V1 returned:

```text
version = 1
previous_version = 0
origin = INITIAL_SCOPE
originating_request_id = 0
client_approved = true
contractor_approved = true
active = true
```

Evidence: `docs/evidence/m1-02-v1-snapshot.png`

### R3 — two V1 extensions; first creates V2 — PASS

Requests #1 and #2 were both classified `SCOPE_EXTENSION` against version 1. Request #1 received both party approvals and created V2:

```text
version = 2
previous_version = 1
origin = APPROVED_EXTENSION
originating_request_id = 1
client_approved = true
contractor_approved = true
active = true
```

V1 remained unchanged and became inactive.

Evidence: `docs/evidence/m1-03-v2-snapshot.png`

### R4 — stale V1 request is superseded and cannot mutate V2 — PASS

After V2 became active, Request #2 derived:

```text
classified_against_version = 1
status = SUPERSEDED
```

A later `approve_extension(1,2)` reached consensus but execution failed and rolled back with:

```text
Request superseded by scope change
```

Post-state remained exactly V1 + V2.

Evidence: `docs/evidence/m1-04-superseded-rollback.png`

### R5 — V2 extension creates V3 with ordered provenance — PASS

Request #3 was classified against V2 and, after both approvals, created V3:

```text
version = 3
previous_version = 2
origin = APPROVED_EXTENSION
originating_request_id = 3
client_approved = true
contractor_approved = true
active = true
```

Its effective scope contains the initial scope, the Request #1 authentication extension, and the Request #3 analytics extension.

Evidence: `docs/evidence/m1-05-v3-snapshot.png`

`get_scope_versions(1,1,10)` returned exactly three versions in order:

```text
V1 -> previous 0 -> INITIAL_SCOPE -> inactive
V2 -> previous 1 -> request #1 -> inactive
V3 -> previous 2 -> request #3 -> active
count = 3
total = 3
```

Evidence: `docs/evidence/m1-06-ordered-ledger.png`

### R6 — unrelated wallet cannot approve — PASS

Request #4 was a fresh `SCOPE_EXTENSION` against V3. An unrelated third wallet called `approve_extension(1,4)`.

Consensus was accepted, but execution returned ERROR and rolled back with:

```text
Only project parties
```

The request remained unapproved and unapplied; the scope ledger stayed at three versions.

Evidence: `docs/evidence/m1-07-unauthorized-rollback.png`

### R7 — terminal replay cannot create a phantom version — PASS

A legitimate project party replayed `approve_extension(1,3)` after Request #3 had already been applied.

Consensus was accepted, but execution returned ERROR and rolled back with:

```text
Extension already applied
```

Final project state remained:

```text
status = ACTIVE
active_scope_version = 3
scope_version_count = 3
request_count = 4
```

Final ledger remained:

```text
count = 3
total = 3
```

Evidence:

- `docs/evidence/m1-08-replay-rollback.png`
- `docs/evidence/m1-09-final-project-state.png`
- `docs/evidence/m1-10-final-ledger-state.png`

## Local deterministic/source-derived validation

Reproduction command:

```bash
npm run test:ledger
```

Fresh result after runtime completion:

```text
52/52 directed/source checks passed
Property sweep: 5000 traces / 80313 transitions / 0 invariant failures
Contract SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

Full captured output: `docs/evidence/milestone-v1-ledger-local-output.txt`

## Runtime conclusion

```text
R1 clean deployment profile                         PASS
R2 acceptance creates immutable V1                 PASS
R3 approved V1 extension creates V2                PASS
R4 stale V1 request superseded + rollback/no-write PASS
R5 V2 extension creates V3 + ordered ledger        PASS
R6 unrelated-wallet approval rollback/no-write     PASS
R7 applied-extension replay rollback/no-write      PASS
```

The exact deployed contract source is now frozen at the SHA256 above. Any later contract-source edit requires a new deployment and fresh runtime validation.
