# V5 runtime checklist — business flow NOT RUN

Deploy file: **`deploy/ScopeFlow.py`** (compact, 47,218 bytes).
Readable reference: `contracts/ScopeFlow.py` (100,784 bytes; do not paste this larger file into Studio).

Contract: `ScopeGuard` 0.8.0. Deployment is verified at
[`0xF18DbCe66c93C85d80bf7ABF19a3d79Db72D358C`](https://explorer-studio.genlayer.com/address/0xF18DbCe66c93C85d80bf7ABF19a3d79Db72D358C).
Deployment transaction: `0xae058e2dc80b9a45ecda912d7902a899d25b612139d3a891a186c1c53512d307`.
Checked 21 October 2026: FINALIZED, normal return, exact source parity, registry
0.8.0 with milestone_delivery/staged_payments/payment_receipts true and count 0.
See [deployment evidence](tests/evidence/deployment-0.8.0.json).

Production dApp readiness, signed delivery/payment flow and native payouts are
pending. Historical v4 proof remains in
[tests/evidence/verified-runtime-0.7.0.json](tests/evidence/verified-runtime-0.7.0.json)
and must not be represented as evidence for v5.

## Minimal two-wallet path

Use a Client wallet A and a different Contractor wallet B on StudioNet. Use test
amounts; the example below totals 0.003 GEN. Confirm each finalized state before
the next operation. An acceptance window is a deadline, not a waiting period.

| Step | Signer and operation | Required observed result |
| --- | --- | --- |
| 1 | Fresh deploy, no arguments — VERIFIED | FINALIZED normal return; registry 0.8.0; delivery/payment capabilities true; initial count 0; exact source parity |
| 2 | A creates project naming B, scope and 0.003 GEN escrow | Pending; escrow 0.003; reserved/due 0 |
| 3 | B accepts project | ACTIVE, scope V1 |
| 4 | A proposes a 0.001 GEN milestone | PROPOSED; no reservation/payment |
| 5 | B accepts milestone | ACTIVE item; escrow 0.003; reserved 0.001; available 0.002 |
| 6 | B submits a report explicitly omitting a criterion | Expected DELIVERY_GAPS; no due/receipt/payment; record actual verdict |
| 7 | B submits a report explicitly addressing every criterion | Expected DELIVERY_MATCHES; exact new attempt ID; no automatic allocation |
| 8 | A approves that exact attempt | PAID item; project ACTIVE; escrow 0.002; reserved 0; Contractor due 0.001; immutable receipt #1 |
| 9 | B withdraws | Due 0; cumulative Contractor paid 0.001; verify linked credited native transfer and wallet delta |
| 10 | B proposes final share 0.001 GEN of remaining 0.002; A accepts exact offer | CLOSED; remaining escrow 0; Contractor due 0.001; Client due 0.001 |
| 11 | Each party withdraws its due | Dues 0; cumulative Contractor paid 0.002 and Client refunded 0.001; three total native payouts verified; receipt #1 unchanged |

Example scope: `Build responsive home and pricing pages with working navigation between both pages.`

Milestone title: `Responsive pages`.

Criteria: `Deliver responsive home and pricing pages with working navigation between both pages.`

Negative report: `Delivered only a home page. The pricing page and navigation have not been delivered.`

Matching report: `Delivered responsive home and pricing pages. Working navigation links connect both pages.`

These verdicts are expected outcomes, not pre-recorded live results. A GAPS or
UNCLEAR outcome cannot be manually converted into a PASS. Record differences
and investigate before moving funds. No external artifact is required for this
text-only review demonstration.

## Additional checks

If time permits, request a revision of a matching report; verify that the old
attempt cannot be approved, then submit and approve a fresh attempt. Before
milestone acceptance or allocation, create a final settlement offer and verify
it becomes STALE afterward. Observe this through reads; extra deliberately
failing signed transactions are optional because authorization, stale attempts,
replays, caps, malformed outputs, overcommit and financial races have local SDK
coverage. None of those local cases are claimed as live negative results.

## Evidence policy

Capture full transaction hashes for deploy, approvals, delivery submission,
allocation and withdrawals. Parent writes require FINALIZED plus normal GenVM
return. Native transfers need linked child provenance, correct recipient/value,
finalized credited status and before/after wallet balances. Keep allocation
receipts separate from native payout proof.

`npm run verify:deployed -- ADDRESS` compares deployed source with the frozen
contract. `npm run capture:runtime -- ADDRESS PROJECT_ID TX_HASH ...` captures
public selected fields and delivery histories without signing or exporting full
RPC provider configuration. It labels output SNAPSHOT_ONLY_REVIEW_REQUIRED.
Reads are not an atomic historical block; snapshots and actual outcomes must be
reviewed before updating release status to runtime verified.
