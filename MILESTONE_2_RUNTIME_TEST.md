# ScopeFlow Milestone 2 — Fresh StudioNet Runtime Test

Status: **SOURCE PARITY + CORE RUNTIME FLOW PASS; FINAL FRONTEND PATCH RECHECK PENDING**

## Frozen candidate

```text
Contract file: contracts/ScopeFlow.py
Version: 0.5.0
Expected SHA256: ac4ff25ac0bd4ead34db528e97f3d822e96a39fbc88e8fbd37b66a7eb1e704bc
Fresh deployment address: 0xBe44d208A83b15973b91932f75eaA354795E907e
Deploy transaction: 0x19e66a9d81001a2f3e452e61a22c23332c96b1c54b05fc3fc61a69f2796ceb82
```

Do not reuse either historical deployment. Deploy a new instance from the exact candidate source.

## Wallet roles

```text
Wallet 1: Client
Wallet 2: Contractor
Wallet 3: Outsider / permissionless expiry caller
```

Any wallets may be used. Do not hardcode them in the source.

## Evidence rule for every write

Record:

- full transaction hash and Explorer link;
- consensus status;
- `txExecutionResultName`;
- rollback reason for negative tests;
- exact before and after values from `get_project`, `get_request`, or ledger reads.

`ACCEPTED` or `FINALIZED` alone is not success. Positive writes require `FINISHED_WITH_RETURN` plus the stated postcondition. Negative writes require `FINISHED_WITH_ERROR` plus unchanged post-state.

## Gate 1 — fresh deployment and parity

1. Deploy the exact `contracts/ScopeFlow.py`.
2. Record the fresh address.
3. Recalculate the repo source SHA256 and confirm exact match.
4. Call `get_registry()`.

Expected:

```text
project_count = 0
contract_version = 0.5.0
scope_version_ledger = true
lifecycle_finality = true
default_acceptance_window_seconds = 604800
min_acceptance_window_seconds = 300
max_acceptance_window_seconds = 2592000
```

Observed on 2026-09-13:

```text
Deployment consensus = ACCEPTED
GenVM result = SUCCESS
project_count = 0
contract_version = 0.5.0
scope_version_ledger = true
lifecycle_finality = true
default_acceptance_window_seconds = 604800
min_acceptance_window_seconds = 300
max_acceptance_window_seconds = 2592000
```

Evidence: `docs/evidence/m2-01-fresh-registry.png` and
`docs/evidence/m2-02-deploy-success-explorer.png`.

`npm run verify:deployed` fetched the source directly from the deployed
address. After CRLF/LF normalization, deployed and repository sources were
identical and both produced the expected SHA256. Gate 1: **PASS**.

## Gate 2 — cancellation terminal path

Wallet 1 calls:

```text
create_project_with_window(
  <WALLET_2>,
  "Build a responsive marketing website with home, pricing, documentation, and contact pages only.",
  600
)
```

Record Project A id. Confirm:

```text
status = PENDING_CONTRACTOR_ACCEPTANCE
scope_version_count = 0
acceptance_deadline > created_at
```

Wallet 1 calls `cancel_project(ProjectA)`.

Expected:

```text
status = CANCELLED
terminal = true
cancelled = true
cancelled_at > 0
scope_version_count = 0
```

Wallet 2 replays `accept_project(ProjectA)`. Expected execution ERROR/rollback and unchanged CANCELLED state.

Observed Project #1: cancellation finalized, state became `CANCELLED` with
zero ledger snapshots, and Contractor replay rolled back with
`Project cancelled`. Gate 2: **PASS**. Transactions:

```text
cancel_project: 0xfba66296c107fe7b4caf7bb2614691a5a1b01dba7ed4f6c6536861d121ba43ae
accept replay:  0xbd9f27507c8516d314c0b90acce0fee6c8e12b1318001a196fe775a06dc77e7b
```

## Gate 3 — Contractor decline terminal path

Wallet 1 creates Project B with the same scope and a 600-second window. Wallet 2 calls `decline_project(ProjectB)`.

Expected:

```text
status = DECLINED
terminal = true
declined = true
declined_at > 0
scope_version_count = 0
```

Wallet 1 calls `cancel_project(ProjectB)`. Expected execution ERROR/rollback and unchanged DECLINED state.

Observed Project #2: Contractor decline finalized, state became `DECLINED`
with zero ledger snapshots, and Client cancel replay rolled back with
`Project declined`. Gate 3: **PASS**. Transactions:

```text
decline_project: 0x8cd76040ddf83825a340b3bb5b95057252604e725e8fab9e570bd1b4d84a89d8
cancel replay:   0x330ee1c2612fdcf296079e81239f145f7cfecbb8c6886ced199d1ba86486395e
```

## Gate 4 — exact deadline and permissionless expiry

Wallet 1 creates Project C using a 300-second window. Record `acceptance_deadline`.

Before the deadline, Wallet 3 calls `expire_project(ProjectC)`.

Expected:

```text
Execution result = ERROR
Reason contains "Acceptance window still open"
status remains PENDING_CONTRACTOR_ACCEPTANCE
```

At or after the recorded deadline:

1. call `get_project(ProjectC)`; it must derive `status = EXPIRED` and `expiry_recorded = false`;
2. Wallet 2 attempts `accept_project(ProjectC)`; expect execution ERROR/rollback;
3. Wallet 3 calls `expire_project(ProjectC)`;
4. call `get_project(ProjectC)` again.

Final expected state:

```text
status = EXPIRED
terminal = true
expired = true
expiry_recorded = true
expired_at >= acceptance_deadline
scope_version_count = 0
```

Observed: an early expiry call rolled back with `Acceptance window still
open`; after the Project #4 deadline, Contractor acceptance rolled back with
`Acceptance window expired`; Wallet 3 then materialized expiry successfully.
Final state was recorded `EXPIRED` with zero snapshots. Gate 4: **PASS**.

```text
early expire: 0x90b1a4eb1d2f9c44f523faac825b48357a34f46e29d7c3da9317d858bc36048c
late accept:  0x3b86458a92b2aaab743d592454d425b653cf63472f583cbdf5d772441e61187f
record expiry: 0x05184dc5941fc3591d2d82857a8918bca49b17617c99141709f1b0f7857870c3
```

## Gate 5 — active project and stale close-vote isolation

Wallet 1 creates Project D with a 600-second window. Wallet 2 accepts it.

Expected after acceptance:

```text
status = ACTIVE
active_scope_version = 1
scope_version_count = 1
```

Wallet 1 calls `approve_close(ProjectD)`.

Expected:

```text
client_close_vote_version = 1
client_close_approved = true
contractor_close_approved = false
closed = false
```

Wallet 1 submits:

```text
"Add secure customer authentication with email sign-in, password reset, and protected account pages."
```

Require:

```text
classification = SCOPE_EXTENSION
classified_against_version = 1
status = AWAITING_APPROVAL
```

Both Wallet 1 and Wallet 2 approve the extension. Confirm exact V2:

```text
active_scope_version = 2
scope_version_count = 2
client_close_vote_version = 1
client_close_approved = false
closed = false
```

The old V1 close vote must not count at V2.

Observed Project #3: Contractor acceptance created V1; Client voted to close
V1; Request #1 was classified `SCOPE_EXTENSION` against V1; both approvals
created exact V2; the former V1 close vote became stale and both V2 close
indicators returned to Pending. Gate 5: **PASS**.

## Gate 6 — unauthorized close rollback

Before either current-version party vote closes Project D, Wallet 3 calls `approve_close(ProjectD)`.

Expected:

```text
Consensus may be ACCEPTED
Execution result = ERROR
Reason contains "Only project parties"
status remains ACTIVE
active_scope_version remains 2
closed remains false
```

The production direct harness exercised this exact outsider call and proved
ERROR/atomic rollback. The Vercel UI also correctly identified Wallet 3 as an
Observer and withheld the close action. A forced unauthorized StudioNet write
was not captured in the browser runtime session. Gate 6: **DIRECT HARNESS PASS;
OPTIONAL LIVE FORCED-WRITE EVIDENCE NOT CAPTURED**.

## Gate 7 — exact-version mutual close

Wallet 2 calls `approve_close(ProjectD)`.

Expected:

```text
contractor_close_vote_version = 2
contractor_close_approved = true
client_close_approved = false
closed = false
```

Wallet 1 calls `approve_close(ProjectD)`.

Expected:

```text
status = CLOSED
terminal = true
closed = true
closed_at > 0
closed_scope_version = 2
client_close_vote_version = 2
contractor_close_vote_version = 2
scope_version_count = 2
```

Read V1 and V2 and save their exact text/provenance.

Observed order was Client V2 vote followed by Contractor V2 vote. Project #3
became `CLOSED`, `closed_scope_version = 2`, and the ledger remained exactly
two snapshots. Gate 7: **PASS**.

```text
Client V2 close:     0x85a10fa4b65b4d2adf4459cc2257b0087e7d399e84529462e771e32949959687
Contractor V2 close: 0xc699524036af38aecb1745ab4b1842b41345031f472a41b579229b6763714970
```

## Gate 8 — post-close guards and frozen ledger

Create one pending V2 extension before the final close if Gate 7 does not already have one. After closure it must derive `status = PROJECT_CLOSED`.

After closure:

1. a project party calls `submit_request(ProjectD, "Add another new deliverable after closure.")`;
2. a project party replays `approve_close(ProjectD)`;
3. a project party attempts approve/reject on the pending extension.

Every call must return execution ERROR/rollback. Final reads must prove:

```text
status = CLOSED
active_scope_version = 2
scope_version_count = 2
closed_scope_version = 2
V1 unchanged
V2 unchanged
no V3
no new request from the post-close submission
```

Observed: Request #2 was submitted against V2 before closure and remained
awaiting both approvals. After closure it disappeared from actionable
extensions, the form became disabled, and the UI reported the project and
pending extension read-only. The direct production harness separately proved
post-close submit, close replay, approve, and reject all roll back without a
V3 or ledger mutation. Gate 8: **POST-STATE + DIRECT HARNESS PASS; OPTIONAL
LIVE FORCED-WRITE SCREENSHOT NOT CAPTURED**.

## Gate 9 — dApp verification after contract gates pass

Only after Gates 1–8 pass:

1. set `VITE_CONTRACT_ADDRESS` to the fresh v0.5.0 address;
2. deploy the updated frontend;
3. connect Wallet 1 and create a 600-second project;
4. confirm the UI shows the exact deadline;
5. connect Wallet 2 and verify Accept and Decline actions;
6. accept, then verify version-pinned mutual-close cards;
7. submit and approve an extension; confirm any V1 close vote becomes stale;
8. mutually close at V2;
9. confirm the UI becomes read-only and shows the frozen closed version;
10. inspect each transaction link and confirm the UI never labels execution ERROR as success.

Save screenshots only for the fresh registry, each terminal outcome, stale vote at V2, unauthorized rollback, final close, post-close rollback, and final dApp state.

The original v0.5.0 Vercel session exercised the complete project lifecycle
and exposed one frontend integration issue: StudioNet sometimes returned a
finalized receipt before `txExecutionResultName`, so safe confirmation fell
back to a warning and manual refresh. The final frontend patch now polls the
transaction for up to 60 seconds, accepts only explicit return/error, and then
runs existing action-specific postcondition reads. The patch passed 5/5 unit
tests, resolved real StudioNet success/rollback receipts, and passed a
production build. One live transaction after redeploy remains.

## Final runtime result

```text
Fresh source parity                          PASS
Cancellation terminality                    PASS
Contractor decline terminality              PASS
Exact-deadline permissionless expiry        PASS
Stale close-vote isolation                  PASS
Unauthorized close rollback/no-write        PASS — direct harness; live forced write optional
Exact-version mutual close                  PASS
Post-close guards and ledger freeze         PASS — post-state + direct harness
dApp execution-result/postcondition checks  LOCAL PATCH PASS / LIVE REDEPLOY CHECK PENDING
```
