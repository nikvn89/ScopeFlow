# ScopeFlow Testing

## Current candidate

```text
Milestone: v3 — Funded Scope Escrow
Contract version: 0.6.0
Source: contracts/ScopeFlow.py
Source SHA256: 161a7900286927010281b976ff617f222e3a17ae5440462b294982bd10202777
StudioNet deployment: ⟨v0.6.0 address⟩
Deploy transaction: ⟨v0.6.0 deploy tx⟩
```

The v0.5.0 deployment remains unchanged at `0xBe44d208A83b15973b91932f75eaA354795E907e`.

## Milestone v3 runtime matrix

Two wallets: **A** = Client, **B** = Contractor. Amounts are small on purpose.

Scope for project 1:

```text
Build a responsive marketing website with home, pricing and contact pages, deployed to the client's domain.
```

| # | Wallet | Action | Expected | Result / tx |
| --- | --- | --- | --- | --- |
| 1 | A | Deploy `contracts/ScopeFlow.py` | Finalized, success | ⟨tx⟩ |
| 2 | A | Create project: Contractor B, the scope above, window 600 s, escrow **2 GEN** | Pending; escrow 2 GEN | ⟨tx⟩ |
| 3 | B | Accept project | Active; scope V1 | ⟨tx⟩ |
| 4 | B | Submit request with price **1 GEN**: `Add a newsletter signup form connected to the client's mailing tool, with double opt-in.` | `SCOPE_EXTENSION`; price 1 GEN | ⟨tx⟩ |
| 5 | A | Submit request with price **1 GEN**: `Make the pricing page responsive on mobile phones.` | `SCOPE_IN`; price shown as none (dropped by the contract) | ⟨tx⟩ |
| 6 | B | Approve request from row 4 | Contractor approved | ⟨tx⟩ |
| 7 | A | **Approve & deposit 1 GEN** on the same request | Applied; scope V2; escrow 3 GEN | ⟨tx⟩ |
| 8 | B | Propose split: Contractor share **2 GEN** | B's proposal shown | ⟨tx⟩ |
| 9 | A | **Accept** B's split | Closed; Contractor due 2 GEN, Client refund due 1 GEN | ⟨tx⟩ |
| 10 | B | **Withdraw 2 GEN** | Paid to Contractor 2 GEN | ⟨tx⟩ |
| 11 | A | **Withdraw 1 GEN** | Refunded to Client 1 GEN | ⟨tx⟩ |
| 12 | A | Create project 2: Contractor B, same scope, window 600 s, escrow **0.5 GEN** | Pending; escrow 0.5 GEN | ⟨tx⟩ |
| 13 | B | Decline project 2 | Declined; Client refund due 0.5 GEN | ⟨tx⟩ |
| 14 | A | **Withdraw 0.5 GEN** on project 2 | Refunded to Client 0.5 GEN | ⟨tx⟩ |

Rows 4–5 show that the classification decides who pays; rows 6–7 show a paid extension joining the escrow; rows 8–11 the agreed split; rows 12–14 the refund path.

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
