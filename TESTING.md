# ScopeFlow Testing

## Milestone v1 current runtime target

```text
Deployment: 0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
Contract version: 0.4.0
Source: contracts/ScopeFlow.py
SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

Milestone v1 adds the Immutable Scope Version Ledger. Fresh StudioNet runtime validation is complete. Full step-by-step evidence is in `MILESTONE_1_RUNTIME_TEST.md` and `MILESTONE_1_EVIDENCE.md`.

### Runtime gates passed

```text
R1 fresh get_registry profile                         PASS
R2 no V1 before Contractor acceptance                 PASS
R3 acceptance creates exact immutable V1              PASS
R4 two V1 requests classify as SCOPE_EXTENSION        PASS
R5 first approved extension creates V2                PASS
R6 V1 remains unchanged after V2                      PASS
R7 stale V1 request derives SUPERSEDED                 PASS
R8 stale approval returns ERROR/rollback, no-write    PASS
R9 V2 extension creates V3                            PASS
R10 ordered ledger returns exactly V1 -> V2 -> V3     PASS
R11 unrelated wallet approval ERROR/rollback          PASS
R12 applied-extension replay ERROR/rollback           PASS
R13 final project remains active at V3 / count 3      PASS
R14 local source/model suite 52/52                    PASS
R15 property sweep 5000 traces / 80313 transitions    PASS
```

Important execution distinction observed during negative tests:

```text
Consensus status: ACCEPTED
Execution result: ERROR
```

`ACCEPTED` therefore was not treated as execution success. Rollback reason plus unchanged post-state were checked explicitly.

## Local reproduction

```bash
npm run test:ledger
```

Expected current output:

```text
52/52 directed/source checks passed
Property sweep: 5000 traces / 80313 transitions / 0 invariant failures
Contract SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

Captured output:

```text
docs/evidence/milestone-v1-ledger-local-output.txt
```

## Runtime screenshots

```text
docs/evidence/m1-01-fresh-deploy-registry.png
docs/evidence/m1-02-v1-snapshot.png
docs/evidence/m1-03-v2-snapshot.png
docs/evidence/m1-04-superseded-rollback.png
docs/evidence/m1-05-v3-snapshot.png
docs/evidence/m1-06-ordered-ledger.png
docs/evidence/m1-07-unauthorized-rollback.png
docs/evidence/m1-08-replay-rollback.png
docs/evidence/m1-09-final-project-state.png
docs/evidence/m1-10-final-ledger-state.png
```

## Accepted v0.3.0 baseline

The accepted deployment remains the before-state and must not be represented as runtime proof for the new v0.4.0 ledger functionality:

```text
0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
SHA256 dee6484d093e5487a59e83f29718fed593334d848bc52cdfc012cd5c922d3ee7
```

Historical baseline runtime checks included Contractor opt-in, pre-acceptance cancellation, classification, two-party extension approval, supersession, and append-time capacity rollback. Milestone v1 preserves those governance invariants while adding immutable version provenance.
