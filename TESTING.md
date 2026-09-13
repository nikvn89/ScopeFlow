# ScopeFlow Testing

## Current candidate

```text
Milestone: Deterministic Lifecycle Finality
Contract version: 0.5.0
Source: contracts/ScopeFlow.py
Candidate SHA256: ac4ff25ac0bd4ead34db528e97f3d822e96a39fbc88e8fbd37b66a7eb1e704bc
StudioNet deployment: 0xBe44d208A83b15973b91932f75eaA354795E907e
Deploy transaction: 0x19e66a9d81001a2f3e452e61a22c23332c96b1c54b05fc3fc61a69f2796ceb82
Runtime status: source parity and core lifecycle/ledger flow verified on StudioNet
```

The historical v0.4.0 deployment remains unchanged at `0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe`.

## Local verification

```bash
npm ci
npm run verify
```

`npm run verify` runs:

1. source and ABI preservation checks;
2. the seeded 5,000-trace ledger model;
3. a direct harness that imports and calls production `ScopeGuard`;
4. five frontend execution-result polling tests;
5. strict TypeScript compilation;
6. the production Vite build.

Observed:

```text
73/73 directed/source checks passed
99/99 direct production-contract checks passed
Property sweep: 5000 traces / 80313 transitions / 0 invariant failures
Frontend transaction polling: 5/5 tests passed
Frontend production build: PASS
Largest JavaScript chunk: 286.93 kB
```

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

The first command fetches the contract code from `0xBe44…907e`, normalizes CRLF/LF only,
and requires both deployed and repository sources to equal SHA256
`ac4ff25a…704bc`. The second fetches one known successful transaction and one
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
