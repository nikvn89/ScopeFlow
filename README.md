# ScopeFlow — Milestone v4

ScopeFlow manages a two-party project scope and its native GEN escrow. A Client funds a project, the Contractor opts in, and GenLayer consensus classifies proposed changes as `SCOPE_IN`, `SCOPE_EXTENSION` or `SCOPE_UNCLEAR`. Material extensions need both parties' approval; a priced extension requires the Client's exact deposit.

## New in v4: revocable settlement offers

A party can publish an offer for the Contractor's share of the escrow, choose a validity window, and cancel its own open offer. The counterparty accepts the **exact offer ID**, rather than submitting the same amount from a potentially stale page. Publishing an offer never closes the project through the new API, even when both parties publish the same amount.

| Behavior | Accepted v3 / contract 0.6.0 | v4 / contract 0.7.0 |
| --- | --- | --- |
| Early settlement | Matching standing proposals | Expiring, cancellable offers; explicit ID acceptance |
| Replacement at same price | Duplicate rejected | Fresh offer ID; old ID rejected |
| Cancellation or expiry | No offer cancellation/expiry | No movement of money; escrow remains held |
| Scope/escrow changes | Proposal pins | Same pins plus current offer ID and live status |
| dApp confirmation | Accepted execution policy | Finalized raw leader normal return plus offer postcondition |

The semantic classification task, escrow, priced extensions, version ledger and lifecycle were already present in v3. They are preserved and are not claimed as new v4 features.

## Release and deployment

- Accepted v3 commit: [`24e3c6d3bc318c791045eb53fe31d7fdd3a9cc67`](https://github.com/nikvn89/ScopeFlow/tree/24e3c6d3bc318c791045eb53fe31d7fdd3a9cc67).
- Historical v3 address: `0x64F2a2C73203448bBF258CF842D308ffEdDDC5D0` (contract 0.6.0).
- Current source: `contracts/ScopeFlow.py`, class `ScopeGuard`, **no constructor arguments**, contract **0.7.0**.
- Current source fingerprint and deployment status: [release.json](release.json).
- **Fresh v4 deployment and on-chain runtime: pending.** Do not use or upgrade the reviewed v3 deployment for these tests.

This source requires a fresh instance. It does not migrate existing projects or balances.

## Run and deploy the dApp

```bash
npm ci
npm run verify
npm run dev
```

Deploy `contracts/ScopeFlow.py` as a new instance in GenLayer Studio. Read `get_registry` and confirm `contract_version: "0.7.0"` and `settlement_offers: true`. Verify exact deployed source:

```bash
npm run verify:deployed -- 0xYOUR_NEW_DEPLOYMENT
```

Set `VITE_CONTRACT_ADDRESS` to that address in a local `.env` or in Vercel environment variables, then rebuild/redeploy. `.env.example` deliberately has no old-address fallback. The write client checks the deployed profile and the selected wallet before asking for a signature. Use Vite's build command `npm run build` and output directory `dist` on Vercel.

## Offer API

```text
propose_settlement_with_window(project_id, contractor_share_wei, validity_seconds)
cancel_settlement_offer(project_id, offer_id)
accept_settlement_offer(project_id, offer_id)
```

Windows are 60–604800 seconds. Offer IDs increase independently for each party within each project, including replacements at the same price. Only the latest offer per party is stored; this is not a full offer-history ledger. At the exact expiry timestamp, acceptance is rejected. The transaction clock is authoritative; the browser countdown is a convenience.

`get_project` includes both offers, their ID/status/creation/expiry, `chain_timestamp`, `settled_offer_id` and `settled_offer_role`. IDs and wei amounts are decimal strings. Offer statuses are `OPEN`, `CANCELLED`, `EXPIRED`, `STALE`, `PROJECT_CLOSED`.

The legacy `propose_settlement` API remains compatible: a new proposal has a 24-hour window and may match the other party's live proposal. It cannot revive a cancelled, expired or stale offer. The v4 dApp uses explicit ID acceptance instead.

Cancellation and expiry do not refund or release funds, and do not cancel the project. Without mutual agreement, active escrow can remain locked. Mutual close remains a separate two-party operation. No administrator or model can choose a settlement split.

## Confirmation and tests

Reads use `LATEST_FINAL`. Success requires a finalized raw leader receipt with a normal-return result, followed by verification of the relevant project state. Unknown receipt fields remain unconfirmed; errors are shown as rejected execution. Offer publication/cancellation also verify that escrow and allocation balances did not change. Native withdrawals still require separate transfer evidence to establish delivery to a recipient.

See [TESTING.md](TESTING.md), [RUNTIME_TEST.md](RUNTIME_TEST.md) and [SECURITY.md](SECURITY.md). Prior v3 runtime material is preserved in [docs/history/TESTING-v0.6.0.md](docs/history/TESTING-v0.6.0.md).

## Immutable milestone evidence

After uploading the final source, pin the actual GitHub HEAD SHA in the submission:

- Previous accepted milestone comparison: `compare/24e3c6d3bc318c791045eb53fe31d7fdd3a9cc67...<ACTUAL_SUBMITTED_HEAD_SHA>`.
- Original Project comparison: `compare/<FINAL_REVIEWED_PROJECT_SHA>...<ACTUAL_SUBMITTED_HEAD_SHA>`.

The original reviewed Project SHA has not been established from the supplied v3 comparison. Its supplied base `25d506061c8817872b652fefec51555629730bf9` must not be relabelled as the Project baseline without review evidence. Do not substitute `main` or a guessed commit. Deployment and runtime proof must refer to the new 0.7.0 instance.
