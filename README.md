# ScopeFlow

**Consensus-governed project scope with immutable scope history and deterministic lifecycle finality.**

ScopeFlow lets a Client commit an initial scope, requires explicit Contractor opt-in, classifies change requests with bounded GenLayer consensus, and requires both parties to approve material extensions. Milestone v1 added the immutable effective-scope ledger. Milestone v2 adds deterministic deadlines and terminal lifecycle paths without expanding the semantic question.

## Deployments and source parity

### Accepted baseline — unchanged

```text
Address: 0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
Contract version: 0.3.0
Source SHA256: dee6484d093e5487a59e83f29718fed593334d848bc52cdfc012cd5c922d3ee7
```

### Milestone v1 — runtime validated and frozen

```text
Address: 0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
Contract version: 0.4.0
Source SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

### Milestone v2 — fresh deployment and runtime evidence

```text
Contract version: 0.5.0
Source: contracts/ScopeFlow.py
Candidate SHA256: ac4ff25ac0bd4ead34db528e97f3d822e96a39fbc88e8fbd37b66a7eb1e704bc
Deployment: 0xBe44d208A83b15973b91932f75eaA354795E907e
Deploy Tx: 0x19e66a9d81001a2f3e452e61a22c23332c96b1c54b05fc3fc61a69f2796ceb82
Runtime status: source parity and core lifecycle/ledger path verified on StudioNet
```

`npm run verify:deployed` independently fetches the deployed code and proves
that its normalized SHA256 matches the frozen repository source.

## Milestone v2 — Deterministic Lifecycle Finality

New behavior:

- `create_project` remains compatible and uses a seven-day acceptance window;
- `create_project_with_window` supports an immutable 300-second to 30-day window;
- only the named Contractor can accept or decline before the deadline;
- anyone can materialize expiry at or after the deadline;
- Client cancellation remains limited to the open pre-acceptance window;
- active projects close only after both parties approve against the same active scope version;
- a scope upgrade makes older close votes stale automatically;
- closing freezes the final scope version and makes pending extensions non-actionable;
- cancellation, decline, expiry, and close record deterministic chain timestamps;
- all lifecycle paths and terminal guards use zero semantic evaluations.

Terminal outcomes:

```text
PENDING_CONTRACTOR_ACCEPTANCE -> CANCELLED
PENDING_CONTRACTOR_ACCEPTANCE -> DECLINED
PENDING_CONTRACTOR_ACCEPTANCE -> EXPIRED
PENDING_CONTRACTOR_ACCEPTANCE -> ACTIVE -> CLOSED
```

## Preserved Milestone v1 ledger

- no effective snapshot exists before Contractor acceptance;
- acceptance writes immutable V1 from the exact committed scope;
- each fully approved extension appends exactly one version;
- historical snapshots remain readable after newer versions become active;
- rejected, failed, superseded, unauthorized, replayed, and post-close paths cannot create phantom versions;
- paginated reads expose the ordered chain.

Read methods:

```text
get_registry()
get_project(project_id)
get_scope_version(project_id, version)
get_scope_versions(project_id, from_version, count)
get_request(project_id, request_id)
get_requests(project_id, from_id, count)
get_projects_by_client(client, from_index, count)
```

Milestone v2 write methods:

```text
create_project_with_window(contractor, initial_scope, acceptance_window_seconds)
decline_project(project_id)
expire_project(project_id)
approve_close(project_id)
```

## Semantic boundary

GenLayer semantic validation remains limited to one narrow question: whether a cleaned change request is wholly covered by the active scope.

```text
SCOPE_IN
SCOPE_EXTENSION
SCOPE_UNCLEAR
```

Invalid, uncertain, or malformed evaluation output raises before consequential request, counter, cooldown, or cache writes complete. Lifecycle consequences are never selected by the model.

## Reproduce verification

```bash
npm ci
npm run verify
npm run verify:deployed
```

Current local result:

```text
73/73 directed/source checks passed
99/99 direct production-contract checks passed
Property sweep: 5000 traces / 80313 transitions / 0 invariant failures
Frontend execution polling: 5/5 tests passed
Frontend production build: PASS
Largest JavaScript chunk: 286.93 kB
Candidate SHA256: ac4ff25ac0bd4ead34db528e97f3d822e96a39fbc88e8fbd37b66a7eb1e704bc
```

The direct harness imports and calls the production `ScopeGuard` implementation. The separate seeded model remains as a high-volume ledger property sweep.

`npm run verify:runtime-receipts` additionally runs the frontend receipt policy
against one real successful StudioNet transaction and one real rollback.

## Frontend safety

The dApp:

- waits for `FINALIZED`;
- polls finalized transactions whose execution result is briefly absent;
- distinguishes `FINISHED_WITH_RETURN` from `FINISHED_WITH_ERROR`;
- never treats consensus acceptance alone as execution success;
- verifies action-specific on-chain postconditions before claiming completion;
- loads the full paginated scope ledger;
- exposes acceptance deadline, decline, expiry recording, close votes, and final closed version.

Current environment targets the fresh runtime-validated v0.5.0 deployment:

```text
VITE_CONTRACT_ADDRESS=0xBe44d208A83b15973b91932f75eaA354795E907e
```

## Evidence

- `MILESTONE_1_EVIDENCE.md` — frozen Milestone v1 runtime proof.
- `MILESTONE_1_RUNTIME_TEST.md` — executed v0.4.0 path.
- `MILESTONE_2_EVIDENCE.md` — before/after measurements and candidate status.
- `MILESTONE_2_RUNTIME_TEST.md` — exact fresh-deployment runtime path.
- `TESTING.md` — local verifier and runtime gates.
