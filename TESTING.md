# ScopeFlow v4 verification

Current candidate: contract **0.7.0**, `contracts/ScopeFlow.py`, class `ScopeGuard`. Normalized SHA256 (CRLF to LF only):

```text
25001c63873668b4fb25bbde32b5f4dc71ba088dea28dcc545ef34d672ce9a8f
```

Recorded 21 October 2026. The release fingerprint is enforced by `npm run build`; [release.json](release.json) is the candidate manifest.

## Executed local gates

| Gate | Result | Scope |
| --- | --- | --- |
| SDK GenVM Direct Mode | 71 passed | Production source, real SDK storage/clock/leader-validator functions; controlled model response and native transfer recorder |
| Frontend unit tests | 19 passed | Exact wei, offer availability/expiry, nonce and allocation postconditions, receipt confirmation and known reverts |
| GenVM lint | 3 checks passed | Static contract checks |
| Existing directed/source checks | 73 passed | Scope ledger and lifecycle source/model regression |
| Production Python harness | 99 passed | Production source under a stubbed SDK; distinct from SDK Direct Mode |
| Existing ledger-model sweep | 5,000 traces / 80,313 transitions / 0 failures | Scope/version/lifecycle model, not a proof of network behavior |
| Mutation matrix | 52/52 killed | 38 retained legacy faults and 14 offer faults; baseline first; test infrastructure errors invalidate the run |
| TypeScript and production build | PASS | 480 transformed modules; largest bundle 286.93 kB |

Machine-readable summary: [tests/evidence/local-results.json](tests/evidence/local-results.json).

The mutation runner excludes two old equivalent pin mutants: removal of one redundant pin check cannot change behavior because the offer-open gate independently checks scope and escrow. They are not counted as killed. Collection/import/infrastructure errors are not valid mutation kills.

## New offer coverage

- Window lower/upper bounds; exact min/max; expiry one second before, at and after deadline.
- Both parties may propose; outsiders cannot propose, cancel or accept.
- Timed publication cannot settle implicitly even when the amounts match.
- Cancellation preserves escrow/dues; replay rejected; republishing at the same price creates a new ID.
- Old IDs cannot cancel or accept replacements; one party cannot accept its own offer.
- Both proposer roles; zero, partial and full Contractor allocations; one-time acceptance and withdrawal conservation.
- Scope/escrow changes invalidate old consent; other projects cannot use that consent.
- Legacy matching cannot revive cancelled or expired offers. Existing legacy price/pin/escrow guards still pass.
- Offer settlement has zero model calls; tests exercise a native-transfer recorder, not asynchronous GEN delivery.

## Reproduce

```bash
npm ci
npm run verify
pip install -r requirements-test.txt
python -m pytest tests/direct -q -p no:cacheprovider
python -m genvm_linter.cli lint contracts/ScopeFlow.py
python tests/mutation_check.py
```

The frontend suite uses Node's TypeScript stripping (Node 22.18+ or Node 24). SDK version is v0.2.16, genlayer-test 0.29.2, genvm-linter 0.11.0 and pytest 9.1.1. `requirements-test.txt` and `package-lock.json` pin the tooling.

## Fresh runtime remains pending

No new 0.7.0 deployment address, on-chain offer result or wallet payment is claimed. Browser visual verification and wallet signing were not run in this environment. [RUNTIME_TEST.md](RUNTIME_TEST.md) contains the short manual path. For withdrawals, verify the finalized parent, linked native transfer and recipient balance independently of contract counters.

Historical v3 runtime evidence is preserved in [docs/history/TESTING-v0.6.0.md](docs/history/TESTING-v0.6.0.md); its screenshots and transaction hashes are not v4 runtime evidence. `verify:runtime-receipts` uses historical v2 receipt fixtures and does not run fresh v4 writes.
