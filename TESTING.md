# ScopeFlow Testing

## Current candidate

```text
Milestone: v3 — Funded Scope Escrow
Contract version: 0.6.0
Source: contracts/ScopeFlow.py
Source SHA256: 161a7900286927010281b976ff617f222e3a17ae5440462b294982bd10202777
StudioNet deployment: 0x64F2a2C73203448bBF258CF842D308ffEdDDC5D0
Deploy transaction: 0x57fda4a4f6300a8065ebbc6e205903c948a150a00cc9f95191c36f6f91b2fbf2
```

The v0.5.0 deployment remains unchanged at `0xBe44d208A83b15973b91932f75eaA354795E907e`.

## Milestone v3 runtime matrix

Two wallets: **A** = Client, **B** = Contractor. Amounts are small on purpose.

Scope for project 1:

```text
Build a responsive marketing website with home, pricing and contact pages, deployed to the client's domain.
```

| # | Wallet | Action | Expected | Result on StudioNet (2026-10-06) |
| --- | --- | --- | --- | --- |
| 1 | A | Deploy `contracts/ScopeFlow.py` | Finalized, success | Success · [`0x57fda4a4…b2fbf2`](https://explorer-studio.genlayer.com/tx/0x57fda4a4f6300a8065ebbc6e205903c948a150a00cc9f95191c36f6f91b2fbf2) |
| 2 | A | Create project: Contractor B, the scope above, window 600 s, escrow **2 GEN** | Pending; escrow 2 GEN | Pending; escrow 2 GEN · [`0xec246c51…2505ef`](https://explorer-studio.genlayer.com/tx/0xec246c519760bfd117639dd80bb5682dd136ca468904958d8fbc3c7ca22505ef) |
| 3 | B | Accept project | Active; scope V1 | Active · [`0x24b522c8…e8789f`](https://explorer-studio.genlayer.com/tx/0x24b522c8f99b9b86e93295b99df8d23ed77ffbc4300bfd3978c715f439e8789f). A repeated click reverted with `Project already accepted` and changed nothing · [`0xe7c82ca8…dec241`](https://explorer-studio.genlayer.com/tx/0xe7c82ca896e7b6a9ab12402c3929c00c5c46356aadc2c4d9e380580682dec241) |
| 4 | B | Submit request with price **1 GEN**: `Add a newsletter signup form connected to the client's mailing tool, with double opt-in.` | `SCOPE_EXTENSION`; price 1 GEN | `SCOPE_EXTENSION`, price 1 GEN · [`0xb1c3a0f9…8ed811`](https://explorer-studio.genlayer.com/tx/0xb1c3a0f9dc42d7d004d595b3c207cf5ac17a9373e852abd3c3f630f0b98ed811) |
| 5 | A | Submit request with price **1 GEN**: `Make the pricing page responsive on mobile phones.` | `SCOPE_IN`; price shown as none (dropped by the contract) | **`SCOPE_IN`, price dropped** · [`0x1e0a9677…2b38d4`](https://explorer-studio.genlayer.com/tx/0x1e0a967718b3bf7da178a3bee3ac90711d2088c4d13b28c2378ce92a152b38d4) · [screenshot](./docs/evidence/m3-01-classification-decides-price.png) |
| 6 | B | Approve request from row 4 | Contractor approved | Contractor approved · [`0x44fe15c9…154b0e`](https://explorer-studio.genlayer.com/tx/0x44fe15c9e965fe28db1eb041defec997827344307daf75179eff84dfd2154b0e) |
| 7 | A | **Approve & deposit 1 GEN** on the same request | Applied; scope V2; escrow 3 GEN | Applied; scope V2; escrow 3 GEN · [`0xdb0fa146…377c41`](https://explorer-studio.genlayer.com/tx/0xdb0fa146e611e0d13f544f9ea29588ee263e9439b7d469b35ba7f30c6f377c41) · [screenshot](./docs/evidence/m3-02-escrow-after-paid-extension.png) |
| 8 | B | Propose split: Contractor share **2 GEN** | B's proposal shown | Proposal recorded · [`0x866738a0…484e0a`](https://explorer-studio.genlayer.com/tx/0x866738a005377fdc66131416998add140072289e4ef5be1535c19852e1484e0a) |
| 9 | A | **Accept** B's split | Closed; Contractor due 2 GEN, Client refund due 1 GEN | Closed; Contractor due 2 GEN, Client due 1 GEN · [`0xddb8fba7…893d1a`](https://explorer-studio.genlayer.com/tx/0xddb8fba7ebcebdb7e4f2ef3c78a236dfef7be946260c6be52d14516826893d1a) · [screenshot](./docs/evidence/m3-03-agreed-split-closed.png) |
| 10 | B | **Withdraw 2 GEN** | Paid to Contractor 2 GEN | Paid to Contractor 2 GEN · [`0x7e9d85bd…d326c7`](https://explorer-studio.genlayer.com/tx/0x7e9d85bd2e12c14a26bd6f6f6f0f2ec74cc35334cdf2242e89b7d1bf4ed326c7) · [screenshot](./docs/evidence/m3-04-both-parties-paid.png) |
| 11 | A | **Withdraw 1 GEN** | Refunded to Client 1 GEN | Refunded to Client 1 GEN · [`0x7e13fe9f…cd49bc`](https://explorer-studio.genlayer.com/tx/0x7e13fe9fab99a2dce0e3f4f1d63abc6f6e278f1601055b3e7440a9a3e4cd49bc) |
| 12 | A | Create project 2: Contractor B, same scope, window 600 s, escrow **0.5 GEN** | Pending; escrow 0.5 GEN | Pending; escrow 0.5 GEN · [`0x217bcbe4…1c317f`](https://explorer-studio.genlayer.com/tx/0x217bcbe44a08425b9bbb3f646a6eb7dac7f59dc529afdd2a7806917e061c317f) |
| 13 | B | Decline project 2 | Declined; Client refund due 0.5 GEN | Declined; Client due 0.5 GEN · [`0x54810dc1…7b191a`](https://explorer-studio.genlayer.com/tx/0x54810dc1fb7f7976d9bc2062b3367a6796d6cd774dda6f05474df1ddb47b191a) |
| 14 | A | **Withdraw 0.5 GEN** on project 2 | Refunded to Client 0.5 GEN | Refunded to Client 0.5 GEN · [`0xb8e0bc05…4c7572`](https://explorer-studio.genlayer.com/tx/0xb8e0bc05e3ed261e43b000263aee99c2c9999f439bd13966658f5b78e04c7572) · [screenshot](./docs/evidence/m3-05-decline-refund.png) |

All transactions are on `0x64F2a2C73203448bBF258CF842D308ffEdDDC5D0`; the two native GEN transfers of rows 10–11 are [`0xe794e2f1…0c69c0`](https://explorer-studio.genlayer.com/tx/0xe794e2f146a50d8ba5f7ba9891334d2b406db0a7d476c1e3deac91600b0c69c0) and [`0xa5b24369…e03238`](https://explorer-studio.genlayer.com/tx/0xa5b2436927c109a123632bbfcbb97a553fd8f8870e107865113ab3fbefe03238). Rows 4–5 show that the classification decides who pays; rows 6–7 show a paid extension joining the escrow; rows 8–11 the agreed split; rows 12–14 the refund path.

## Local verification

```bash
npm ci
npm run verify
```

`npm run verify` runs:

1. source and ABI preservation checks;
2. the seeded 5,000-trace ledger model;
3. a direct harness that imports and calls production `ScopeGuard`;
4. frontend tests: execution-result polling, escrow amounts and actions, revert sentences synced with the contract;
5. strict TypeScript compilation;
6. the production Vite build.

The escrow is tested on the real GenVM SDK:

```bash
pip install -r requirements-test.txt
python -m pytest tests/direct -q -p no:cacheprovider   # 38 tests
python tests/mutation_check.py                        # 40 mutants
```

Observed (2026-10-06):

```text
73/73 directed/source checks passed
99/99 direct production-contract checks passed
Property sweep: 5000 traces / 80313 transitions / 0 invariant failures
GenVM Direct Mode escrow suite: 38 passed
Escrow mutation matrix: 40/40 killed
Frontend tests: 14/14 passed
Frontend production build: PASS
```

Direct Mode mocks the model answer and replaces the native-transfer interface with a recorder, so each payout is checked by recipient and amount. It is not StudioNet consensus evidence; the runtime matrix above is.

## Direct production-contract coverage

The tracked `tests/scopeflow_contract.test.py` suite exercises:

- default and custom acceptance windows;
- invalid-window no-write behavior;
- acceptance at the final valid second;
- exact-deadline acceptance/cancel/decline rejection;
- permissionless expiry before/at/after the boundary;
- Client-only cancellation;
- Contractor-only decline;
- unauthorized acceptance and close voting;
- duplicate terminal calls and atomic rollback;
- one-party close non-finality;
- close votes pinned to the active scope version;
- stale close vote invalidation after a V1-to-V2 extension;
- exact-version mutual close;
- pending request terminalization on close;
- post-close submit/approve/reject/close replay blocks;
- final ledger immutability;
- capacity overflow rollback with no phantom version;
- malformed semantic output fail-closed with no request/cache write;
- zero semantic evaluations for lifecycle transitions.

The separate `tests/ledger_model.test.py` property sweep remains a regression oracle; it is no longer presented as the only behavioral proof.

## Deployed-source parity

Run the networked parity verifier separately:

```bash
npm run verify:deployed
npm run verify:runtime-receipts
```

The first command fetches the contract code from the v0.6.0 deployment, normalizes CRLF/LF only,
and requires both deployed and repository sources to equal SHA256
`161a7900…202777`. The second fetches one known successful transaction and one
known rollback and proves the frontend policy resolves them respectively as
`FINISHED_WITH_RETURN` and `FINISHED_WITH_ERROR`.

## Runtime evidence

The fresh deployment passed cancel, decline, early/late deadline guards,
permissionless expiry, acceptance, V1→V2 provenance, stale close-vote
isolation, matching V2 mutual close, final ledger freeze, and pending-request
terminalization. Full transaction links and screenshots are recorded in
`MILESTONE_2_EVIDENCE.md`. Unauthorized and post-close mutation paths are
covered by tracked direct production-contract rollback tests; the UI also
withholds those actions.

## Preserved historical evidence

Accepted baseline:

```text
Version: 0.3.0
Deployment: 0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
SHA256: dee6484d093e5487a59e83f29718fed593334d848bc52cdfc012cd5c922d3ee7
```

Milestone v1:

```text
Version: 0.4.0
Deployment: 0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

Historical v1 evidence remains in `MILESTONE_1_EVIDENCE.md`, `MILESTONE_1_RUNTIME_TEST.md`, and the `docs/evidence/` directory.
