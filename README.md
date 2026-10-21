# ScopeFlow V5 — Milestone Delivery & Staged Escrow

ScopeFlow helps a Client and Contractor agree scope, track changes, review deliveries and allocate payment for completed milestones. GenLayer evaluates two narrow textual questions: whether a requested change extends the agreed scope, and whether a delivery report describes satisfying a milestone's fixed criteria. Money moves only through explicit party-authorized contract transitions.

**Milestone v5 / contract `ScopeGuard` 0.8.0. Local verification and the fresh deployment are verified; v5 business-flow runtime and native payouts are pending.**

## What changed from v4

| Capability | Frozen v4 / 0.7.0 | V5 / 0.8.0 |
| --- | --- | --- |
| Work breakdown | Whole-project scope and change requests | Up to 20 individually agreed milestones |
| Budget consent | Whole escrow at final closure/split | Contractor acceptance reserves each milestone budget |
| Delivery review | No delivery workflow | Up to five immutable reports per milestone; bounded semantic verdict |
| Acceptance | Project-level consent | Client approves the exact latest matching submission or requests revision |
| Payment timing | Final settlement | Milestone budget becomes withdrawable while project remains ACTIVE |
| Allocation history | Current final offers and final provenance | Append-only milestone payment receipts and per-attempt reviews |
| Old consent | Scope/escrow/offer ID/expiry pins | Additional monotonic financial revision and close-vote reset |

The frozen v4 source is commit [`351e93957b516bd0349bc754453161c2787d4452`](https://github.com/nikvn89/ScopeFlow/tree/351e93957b516bd0349bc754453161c2787d4452). It was runtime-tested; its review outcome has not been supplied. The known accepted v3 commit is `24e3c6d3bc318c791045eb53fe31d7fdd3a9cc67`. V5 must use a **new contract instance**. No state migration or modification of older deployments is provided.

## Verified v5 deployment

- StudioNet address: [`0xF18DbCe66c93C85d80bf7ABF19a3d79Db72D358C`](https://explorer-studio.genlayer.com/address/0xF18DbCe66c93C85d80bf7ABF19a3d79Db72D358C).
- Deployment transaction: [`0xae058e2dc80b9a45ecda912d7902a899d25b612139d3a891a186c1c53512d307`](https://explorer-studio.genlayer.com/tx/0xae058e2dc80b9a45ecda912d7902a899d25b612139d3a891a186c1c53512d307).
- Checked 21 October 2026: FINALIZED, normal GenVM return, exact compact-source fingerprint; finalized registry 0.8.0, all delivery/payment capabilities true and project_count 0.
- Public selected fields: [deployment evidence](tests/evidence/deployment-0.8.0.json). This is deployment proof, not delivery/payment-flow proof.

## Delivery workflow

1. Client creates/funds a project; the named Contractor accepts its scope.
2. Client proposes a title, acceptance criteria and positive budget. This does not reserve funds.
3. Contractor accepts against the proposal's exact scope version. The budget must fit in unreserved escrow. Criteria and budget cannot be edited; an unaccepted proposal can be cancelled.
4. Contractor submits a self-contained report and optional HTTPS artifact URL. GenLayer returns exactly `DELIVERY_MATCHES`, `DELIVERY_GAPS` or `DELIVERY_UNCLEAR`. Malformed results revert without recording an attempt.
5. Client approves the exact latest matching submission or records a revision request. A revision blocks approval of that submission; the Contractor must submit again within the five-attempt cap.
6. Approval allocates the entire milestone budget to Contractor due, decreases escrow and reservations, and creates an immutable receipt. The project stays ACTIVE. Contractor then calls Withdraw separately.

Accepted milestone criteria stay fixed even if the project later gains an approved scope extension. The record preserves both the agreed scope version and the version at payment. Unaccepted milestone proposals become stale after a scope change and must be cancelled/reproposed.

The delivery classifier compares **descriptions**, not deployed artifacts or real-world performance. Artifact URLs are metadata only; the contract/model does not fetch them. A matching verdict never releases money by itself. Model mistakes, prompt manipulation and party disagreement remain possible.

## Money and closure

All amounts are exact decimal wei strings on reads and integer wei on writes. UI inputs accept GEN with up to 18 decimal places. `escrow_wei` includes `reserved_wei`; reservations are not a second pot of money. `available_wei = escrow_wei - reserved_wei`.

Approval moves a milestone budget from escrow into Contractor due. Withdrawal moves due into cumulative paid. A receipt records **allocation**, not a native transfer. Native delivery needs separate parent/child receipt and recipient balance evidence.

Accepting a milestone or approving its payment increments the financial revision, clears both close votes and permanently invalidates earlier final settlement offers, even if a later top-up restores the previous escrow amount. Existing v4 timed offers, cancellation and exact-ID acceptance remain available.

Both parties may intentionally close or agree a final split despite unfinished milestones. This overrides remaining reservations, freezes unfinished work and allocates remaining escrow; prior due balances and receipts survive. Ordinary mutual close allocates all remaining escrow to the Contractor. There is no arbiter, unilateral cancellation of accepted work, forced timeout payout or guaranteed escape from disagreement.

## Compact deployment build

Studio rejected the initial 100,784-byte readable source with `Request too large`.
Deploy **`deploy/ScopeFlow.py`**, the 47,218-byte build, instead of the readable
`contracts/ScopeFlow.py`. Public methods, argument names, logic, annotations and
prompt text are preserved. Internal identifiers and whitespace are compacted;
there is no compressed loader or runtime dependency.

`python3 scripts/compact-contract.py --check` reverses the internal-name mapping
and requires exact Python AST parity with the readable source. CI also runs all
129 SDK cases on both representations. The two frozen hashes in `release.json`
identify them separately. The SDK-packaged deployment request is about 95 KB;
a conservative 100 KB regression guard prevents accidental payload growth. This
budget is not a claim about the live provider's configured maximum.

## Run and deploy

Requires Node 22.6+ and Python 3.12 for the SDK test suite.

```bash
npm ci
cp .env.example .env
# The example already contains the verified v5 address.
npm run dev
```

Deploy **`deploy/ScopeFlow.py`** in GenLayer Studio as **ScopeGuard**, with **no constructor arguments**. Read `get_registry`: version 0.8.0, `milestone_delivery`, `staged_payments` and `payment_receipts` must all be true. Put the fresh address in `VITE_CONTRACT_ADDRESS`; on Vercel set the variable for the appropriate environments and redeploy. The supplied fallback and example variable point to the verified v5 address above. An existing Vercel environment variable overrides that fallback, so update it before redeploying.

```bash
npm run verify:deployed -- ADDRESS
npm run check:runtime -- ADDRESS PROJECT_ID
npm run capture:runtime -- ADDRESS PROJECT_ID TX_HASH
```

These are read-only checks. The last command saves sanitized evidence with `SNAPSHOT_ONLY_REVIEW_REQUIRED`; it does not manufacture a runtime PASS. Never put private keys in frontend configuration.

## Verify

```bash
npm run verify
pip install -r requirements-test.txt
python -m pytest tests/direct -q -p no:cacheprovider
python -m genvm_linter.cli lint contracts/ScopeFlow.py
python scripts/compact-contract.py --check
SCOPEFLOW_CONTRACT=deploy/ScopeFlow.py python -m pytest tests/direct -q -p no:cacheprovider
python -m genvm_linter.cli lint deploy/ScopeFlow.py
python tests/mutation_check.py
```

See [TESTING.md](TESTING.md), [RUNTIME_TEST.md](RUNTIME_TEST.md), [SECURITY.md](SECURITY.md) and [release.json](release.json). Frozen v4 documentation is under [docs/history/v4](docs/history/v4); earlier milestone records are under [docs/history/milestones](docs/history/milestones). Historical evidence is retained for provenance and is not v5 runtime proof.
