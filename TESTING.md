# ScopeFlow V5 verification

Contract 0.8.0; local execution verified on 21 October 2026. The fresh v5 deployment is verified;
the core signed business flow and all three native payouts are **VERIFIED**. The source fingerprint in `release.json` is checked
by every production build.

| Gate | Executed result | Scope |
| --- | --- | --- |
| Real SDK Direct Mode | 129 passing cases | Production contract; 38 escrow, 33 timed offers, 58 delivery/integration |
| Compact deploy SDK | 129 passing cases | The same cases against the actual Studio artifact |
| Build equivalence | PASS | Exact AST equality after reversing internal-name mapping |
| Frontend Node suite | 29 passing tests | Amounts, action gates, exact allocation postconditions, raw receipt policy, revert catalog |
| DOM integration | 11 passing scenarios | React delivery board with jsdom and controlled RPC fixtures |
| GenVM lint | 3 checks passed | Existing pinned contract dependency |
| Source/directed ledger checks | 73 passed | Existing scope/lifecycle invariants |
| Production-code stub harness | 99 passed | Retained baseline regressions |
| Legacy ledger model sweep | 5,000 traces / 80,313 transitions / zero invariant failures | Scope ledger model, not a model of new staged payments |
| Mutation matrix | 68 / 68 killed | 52 retained faults + 16 delivery/reservation/payment faults |
| Deployment payload budget | PASS | 95,135 / 95,199 JSON bytes for SDK ABI v5/v6, below conservative 100 KB guard |
| TypeScript and Vite | PASS | Production build with the verified v5 address |
| Live two-wallet delivery/payment flow | PASS | Project #1, GAPS then MATCHES, exact approval, active progress withdrawal, final split and both final withdrawals |
| Native delivery | 3 payouts verified | Linked finalized credited children and wallet deltas; Contractor 0.002 GEN, Client 0.001 GEN, contract zero |

Executed gate and mutation results are recorded in `tests/evidence/local-results.json`. The runner requires a passing production baseline,
unambiguous source anchors and collected tests. Import/collection errors and
missing reports cannot count as kills. The two old equivalent settlement-pin
mutants remain excluded rather than counted as additional coverage.

## New delivery and integration cases

The suite covers every actor gate; budget/text bounds; over-reservation;
acceptance after top-up; proposed cancellation; stale proposed scope and fixed
accepted criteria; all three verdicts; malformed model outputs and rollback;
exact latest-attempt approvals; revision history; five-attempt cap; URL/report
limits; no payment on submission; allocation exactly once; immutable receipts;
active-project withdrawal; financial-revision invalidation even after top-up;
close-vote reset; whole-escrow milestone payment; final settlement over unfinished
reservations; pagination/project isolation; and priced-extension refund isolation.
Eight seeded multi-item SDK scenarios mix allocations, top-ups, withdrawals and
final splits while checking conservation and unchanged earlier receipts.

DOM scenarios exercise actual input events and buttons: exact GEN conversion,
acceptance, report submission, revision, exact attempt approval, receipt display,
rejected/pending transactions, wrong poststate and failed-read write suppression.
The private DOM harness is not part of the public repository; its scenario/result
summary is retained in the machine-readable local evidence. Node helper tests
and all SDK suites are reproducible from this repository.

## Reproduce

```bash
npm ci
npm run verify
pip install -r requirements-test.txt
python -m pytest tests/direct -q -p no:cacheprovider
python -m genvm_linter.cli lint contracts/ScopeFlow.py
python scripts/compact-contract.py --check
SCOPEFLOW_CONTRACT=deploy/ScopeFlow.py python -m pytest tests/direct -q -p no:cacheprovider
python -m genvm_linter.cli lint deploy/ScopeFlow.py
python tests/mutation_check.py
```

The SDK suite uses real py-genlayer v0.2.16 storage/execution with controlled
model answers and a native-transfer recorder. It is not distributed GenVM
consensus or proof of model accuracy/native delivery. DOM tests are not browser
layout or wallet signing tests. See RUNTIME_TEST.md for the executed signed
path and SECURITY.md for semantic and settlement limits. V4 historical results
are preserved under `docs/history/v4` and are not v5 proof.

Deployment source parity and finalized registry/execution were verified on 21 October 2026; see `tests/evidence/deployment-0.8.0.json`. No delivery-flow or native-payout PASS is inferred from deployment.

The core live result is recorded in `tests/evidence/verified-runtime-0.8.0.json`. Revision/stale-offer/authorization/replay/cap failures were not separately exercised as live negative cases for v5; their results above are local SDK coverage. The production URL and pinned submission SHA are still to be confirmed.
