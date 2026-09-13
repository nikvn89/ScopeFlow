# Milestone 2 Evidence — Deterministic Lifecycle Finality

Status: **LOCAL VERIFIED / SOURCE PARITY PASS / CORE RUNTIME PASS / FINAL FRONTEND REDEPLOY PENDING**

## Immutable before-states

```text
Accepted baseline v0.3.0
Deployment: 0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
SHA256: dee6484d093e5487a59e83f29718fed593334d848bc52cdfc012cd5c922d3ee7

Milestone v1 v0.4.0
Deployment: 0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

Neither deployment was upgraded or modified.

## Milestone v2 candidate

```text
Version: 0.5.0
Source: contracts/ScopeFlow.py
Candidate SHA256: ac4ff25ac0bd4ead34db528e97f3d822e96a39fbc88e8fbd37b66a7eb1e704bc
Fresh StudioNet deployment: 0xBe44d208A83b15973b91932f75eaA354795E907e
Deploy transaction: 0x19e66a9d81001a2f3e452e61a22c23332c96b1c54b05fc3fc61a69f2796ceb82
```

StudioNet evidence confirms `ACCEPTED`, GenVM `SUCCESS`, and a fresh
`project_count = 0` registry reporting v0.5.0 with the expected ledger,
lifecycle, and acceptance-window values. `npm run verify:deployed` fetched the
deployed code and proved byte-for-byte equality after CRLF/LF normalization;
both normalized sources hash to the frozen candidate SHA256.

## Meaningful protocol improvement

Milestone v1 proved what scope became effective. Milestone v2 independently solves lifecycle liveness and terminality:

- every project receives an immutable Contractor-acceptance deadline;
- the Contractor can decline during the open window;
- anyone can materialize expiry at or after the deadline;
- Client cancellation is restricted to the same open pre-acceptance window;
- an active project closes only with matching Client and Contractor votes;
- each close vote is pinned to the exact active scope version;
- an intervening approved extension invalidates the older vote without mutation or discretionary judgment;
- close freezes the final version and terminalizes pending extensions;
- terminal replays and post-terminal writes fail before consequential mutation.

No lifecycle consequence is delegated to semantic validation.

## Before/after measurements

| Measure | Milestone v1 | Milestone v2 candidate |
| --- | ---: | ---: |
| Deterministic terminal outcomes | 1 | 4 |
| Explicit acceptance deadline | No | Yes |
| Contractor decline path | No | Yes |
| Permissionless expiry path | No | Yes |
| Version-pinned mutual close | No | Yes |
| Direct production-contract checks | 0 | 99 |
| Ledger property traces | 5,000 | 5,000 |
| Generated ledger transitions | 80,313 | 80,313 |
| Lifecycle semantic evaluations | N/A | 0 |
| Largest production JS chunk | 786.94 kB | 286.93 kB |
| Reproducible npm lockfile | No | Yes |

The largest JavaScript chunk decreased by approximately 63.5%.

## Local verification

Command:

```bash
npm ci
npm run verify
```

Observed:

```text
73/73 directed/source checks passed
99/99 direct production-contract checks passed
Property sweep: 5000 traces / 80313 transitions / 0 invariant failures
Frontend transaction polling: 5/5 tests passed
TypeScript production build: PASS
Largest JavaScript chunk: 286.93 kB
```

The direct suite imports `contracts/ScopeFlow.py`, instantiates the production `ScopeGuard`, calls its real public methods through a deterministic GenLayer test adapter, and restores snapshots on simulated transaction rollback. It covers deadline boundaries, roles, terminal replays, stale close votes, post-close guards, capacity rollback, semantic failure no-write, and ledger immutability.

## Escape-path audit

| Path | Authorization/trigger | Terminal protection | Local result |
| --- | --- | --- | --- |
| Cancel | Client, before deadline and acceptance | No replay; blocks accept/decline/expire | PASS |
| Decline | Contractor, before deadline and acceptance | No replay; blocks accept/cancel/expire | PASS |
| Expire | Any wallet, at/after deadline | No early call or replay | PASS |
| Close | Both parties at same active version | Stale vote cannot combine; no replay | PASS |
| Submit after close | Project party | Rejected; no request/counter/cache write | PASS |
| Approve/reject after close | Project party | Rejected; no ledger/request mutation | PASS |
| Capacity overflow | Second approver | Approval and new version roll back | PASS |
| Semantic failure | Project party | No request/counter/cooldown/cache write | PASS |
| Refund/withdraw/release | Not applicable; contract holds no payout balance | N/A | N/A |

## Frontend execution correctness

The previous UI could receive a finalized receipt before StudioNet exposed its
execution-result field, leaving the user to refresh manually. The candidate now:

1. waits for `TransactionStatus.FINALIZED`;
2. polls the transaction for up to 60 seconds when the finalized receipt lacks an explicit result;
3. accepts only `ExecutionResult.FINISHED_WITH_RETURN` as execution success;
4. reports `FINISHED_WITH_ERROR` as execution failure and refreshes state for rollback inspection;
5. verifies an action-specific postcondition before showing completion;
6. remains fail-closed and warns against resubmission if the bounded poll still cannot resolve the result.

## StudioNet runtime evidence

The following matrix was executed on 2026-09-13 using the fresh v0.5.0 deployment:

| Gate | Transaction/Explorer link | Execution result | Post-state | Evidence file |
| --- | --- | --- | --- | --- |
| Fresh deploy | [Explorer](https://explorer-studio.genlayer.com/address/0xBe44d208A83b15973b91932f75eaA354795E907e) | SUCCESS / Accepted | v0.5.0; project_count 0 | `docs/evidence/m2-01-fresh-registry.png`, `m2-02-deploy-success-explorer.png` |
| Exact deployed-source parity | `npm run verify:deployed` | PASS | Normalized deployed/repo SHA256 match | `docs/evidence/m2-deployed-source-parity.txt` |
| Cancel Project #1 | [cancel](https://explorer-studio.genlayer.com/transactions/0xfba66296c107fe7b4caf7bb2614691a5a1b01dba7ed4f6c6536861d121ba43ae), [accept replay](https://explorer-studio.genlayer.com/transactions/0xbd9f27507c8516d314c0b90acce0fee6c8e12b1318001a196fe775a06dc77e7b) | SUCCESS; replay ERROR/rollback | CANCELLED; V0; immutable | `m2-06-cancelled-accept-replay-rollback.png`, `m2-07-project1-cancelled-poststate.png`, `m2-08-cancel-success-explorer.png` |
| Decline Project #2 | [decline](https://explorer-studio.genlayer.com/transactions/0x8cd76040ddf83825a340b3bb5b95057252604e725e8fab9e570bd1b4d84a89d8), [cancel replay](https://explorer-studio.genlayer.com/transactions/0x330ee1c2612fdcf296079e81239f145f7cfecbb8c6886ced199d1ba86486395e) | SUCCESS; replay ERROR/rollback | DECLINED; V0; immutable | `m2-09-project2-declined-poststate.png`, `m2-10-declined-client-terminal-ui.png`, `m2-11-declined-cancel-replay-rollback.png` |
| Exact-deadline expiry Project #4 | [early expiry](https://explorer-studio.genlayer.com/transactions/0x90b1a4eb1d2f9c44f523faac825b48357a34f46e29d7c3da9317d858bc36048c), [late accept](https://explorer-studio.genlayer.com/transactions/0x3b86458a92b2aaab743d592454d425b653cf63472f583cbdf5d772441e61187f), [record expiry](https://explorer-studio.genlayer.com/transactions/0x05184dc5941fc3591d2d82857a8918bca49b17617c99141709f1b0f7857870c3) | early/late ERROR; expiry SUCCESS | EXPIRED; expiry recorded; V0 | `m2-14-project4-derived-expired.png` through `m2-17-expire-success-explorer.png` |
| V1 close vote and V1→V2 extension | [V1 vote](https://explorer-studio.genlayer.com/transactions/0xe8353b0092fa51faecefc1948396251c888f65d3468819ccd0da3277cbe9143e), [request](https://explorer-studio.genlayer.com/transactions/0xd1f5f3d3d6e59f9b7a8c18e992ec88e7c0fdd26cb4703e8ff2be4b6c1f0cb7ff), [W2 approve](https://explorer-studio.genlayer.com/transactions/0x6c0ebb7715782f9576d8452c98c306ade928372c3e604fa876cb0303e6b063b7), [W1 approve](https://explorer-studio.genlayer.com/transactions/0x0594e790c9a66c3755029f663c5f9e42cea96d3c8625dd097932a1319c7f45d8) | SUCCESS | ACTIVE V2; ledger 2 | `m2-18-v1-client-close-vote.png` through `m2-21-project3-active-v2.png` |
| Stale close-vote isolation | Read/post-state | PASS | Both V2 close votes Pending; V1 vote did not carry | `m2-22-v2-stale-close-vote.png` |
| Pending V2 request | [submit](https://explorer-studio.genlayer.com/transactions/0xc59d3fe05ea4f67923ec4a9062ceedb57cacfab31068a2f5e6066cd31b76c729) | SUCCESS | Request #2 awaiting both approvals | `m2-23-request2-pending-v2.png` |
| Matching V2 mutual close | [Client vote](https://explorer-studio.genlayer.com/transactions/0x85a10fa4b65b4d2adf4459cc2257b0087e7d399e84529462e771e32949959687), [Contractor vote](https://explorer-studio.genlayer.com/transactions/0xc699524036af38aecb1745ab4b1842b41345031f472a41b579229b6763714970) | SUCCESS | CLOSED at V2; ledger frozen at 2 | `m2-24-v2-client-close-approved.png`, `m2-25-project3-closed-v2.png` |
| Pending-request terminalization | Read/post-state | PASS | Request #2 non-actionable; project read-only | `m2-26-project3-pending-request-locked.png` |
| Unauthorized/post-close forced writes | Direct production harness | 12 rollback/no-write checks PASS | No terminal or ledger mutation | Runtime forced-write screenshots not captured; UI correctly withholds actions |
| Final frontend polling patch | `npm run test:frontend`, `npm run verify:runtime-receipts` | 5/5 unit PASS + real StudioNet SUCCESS/ERROR resolution PASS | Explorer leader result is resolved by the frontend policy | Live Vercel recheck pending redeploy |

Any contract edit after deployment changes the SHA and requires a new deployment and full runtime rerun.
