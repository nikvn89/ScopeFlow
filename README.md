# ScopeFlow

**Consensus-governed project scope, with the money held in escrow.**

ScopeFlow lets a Client commit an initial scope, requires explicit Contractor opt-in, classifies change requests with bounded GenLayer consensus, and requires both parties to approve material extensions. Milestone v1 added the immutable effective-scope ledger. Milestone v2 added deterministic deadlines and terminal lifecycle paths. Milestone v3 puts the budget in the contract: the Client's deposit is escrowed, a scope extension carries a price the Client deposits when approving, and the escrow is released, refunded or split by the lifecycle.

## Deployments and source parity

### Milestone v3 — funded scope escrow

```text
Contract version: 0.6.0
Source: contracts/ScopeFlow.py
Source SHA256: 161a7900286927010281b976ff617f222e3a17ae5440462b294982bd10202777
Deployment: 0x64F2a2C73203448bBF258CF842D308ffEdDDC5D0
Deploy Tx: 0x57fda4a4f6300a8065ebbc6e205903c948a150a00cc9f95191c36f6f91b2fbf2
Runtime status: escrow, priced extension, agreed split, withdrawals and decline refund verified on StudioNet (TESTING.md)
```

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
Source: contracts/ScopeFlow.py at the Milestone v2 commit
Candidate SHA256: ac4ff25ac0bd4ead34db528e97f3d822e96a39fbc88e8fbd37b66a7eb1e704bc
Deployment: 0xBe44d208A83b15973b91932f75eaA354795E907e
Deploy Tx: 0x19e66a9d81001a2f3e452e61a22c23332c96b1c54b05fc3fc61a69f2796ceb82
Runtime status: source parity and core lifecycle/ledger path verified on StudioNet
```

`npm run verify:deployed` independently fetches the deployed code and proves
that its normalized SHA256 matches the repository source.

## Milestone v3 — Funded Scope Escrow

Until v0.5.0 ScopeFlow recorded who agreed to what, but the budget lived outside the contract. v0.6.0 holds it:

- the Client deposits the budget when creating the project (`create_project*` are payable) and can add more with `fund_project`;
- a change request can carry a price (`submit_priced_request`). **The GenLayer classification decides whether anyone pays:** the price is kept only for `SCOPE_EXTENSION`; in-scope work is already covered by the escrow, so its price is dropped;
- the Client's approval of a priced extension must deposit exactly the price; when both parties approve, the deposit joins the escrow with the new scope version;
- a deposit whose extension can no longer apply (rejected, superseded, project closed) goes back to the Client with `reclaim_extension_deposit`;
- mutual close → the whole escrow to the Contractor; cancel / decline / expiry → back to the Client; `withdraw` pays each party its own allocation once;
- if the work ends early, `propose_settlement` lets both parties agree the Contractor's share; matching proposals (same share, same scope version, same escrow) close the project and split the escrow.

Money paths never call the model. The app shows the escrow and each party's due balance, a fund box for the Client, an early-settlement box with **Accept** for the other party's proposal, the price on every extension, **Approve & deposit** for the Client, and **Reclaim deposit** where it applies.

New write methods:

```text
fund_project(project_id)                                  payable, Client
submit_priced_request(project_id, text, price_wei)
approve_extension(project_id, request_id)                 now payable; Client deposits the price
reclaim_extension_deposit(project_id, request_id)         Client
propose_settlement(project_id, contractor_share_wei)
withdraw(project_id)
```

See [SECURITY.md](./SECURITY.md) for the escrow rules and limits.

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
pip install -r requirements-test.txt
python -m pytest tests/direct -q -p no:cacheprovider
python tests/mutation_check.py
npm run verify:deployed
```

Current local result:

```text
73/73 directed/source checks passed
99/99 direct production-contract checks passed
Property sweep: 5000 traces / 80313 transitions / 0 invariant failures
GenVM Direct Mode escrow suite: 38/38 passed
Escrow mutation matrix: 40/40 mutants killed
Frontend tests: 14/14 passed
Frontend production build: PASS
Source SHA256: 161a7900286927010281b976ff617f222e3a17ae5440462b294982bd10202777
```

The direct harness imports and calls the production `ScopeGuard` implementation. The separate seeded model remains as a high-volume ledger property sweep.

`npm run verify:runtime-receipts` additionally runs the frontend receipt policy
against one real successful StudioNet transaction and one real rollback.

## Frontend safety

The dApp:

- switches or adds StudioNet with standard wallet RPC (no GenLayer Snap);
- shows the contract's own revert sentence when a write rolls back;
- waits for `ACCEPTED`, then requires an explicit leader execution result (it re-reads state as soon as consensus accepts, instead of waiting minutes for finality);
- polls finalized transactions whose execution result is briefly absent;
- distinguishes `FINISHED_WITH_RETURN` from `FINISHED_WITH_ERROR`;
- never treats consensus acceptance alone as execution success;
- verifies action-specific on-chain postconditions before claiming completion;
- loads the full paginated scope ledger;
- exposes acceptance deadline, decline, expiry recording, close votes, and final closed version.

Production targets the v0.6.0 deployment:

```text
VITE_CONTRACT_ADDRESS=0x64F2a2C73203448bBF258CF842D308ffEdDDC5D0
```

## Evidence

- `MILESTONE_1_EVIDENCE.md` — frozen Milestone v1 runtime proof.
- `MILESTONE_1_RUNTIME_TEST.md` — executed v0.4.0 path.
- `MILESTONE_2_EVIDENCE.md` — before/after measurements and candidate status.
- `MILESTONE_2_RUNTIME_TEST.md` — exact fresh-deployment runtime path.
- `TESTING.md` — local verifier, Milestone v3 runtime matrix and gates.
- `SECURITY.md` — escrow rules, invariants and limits.
