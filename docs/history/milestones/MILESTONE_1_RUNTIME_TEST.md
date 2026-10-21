# ScopeFlow Milestone v1 — Executed Runtime Validation

Milestone feature: **Immutable Scope Version Ledger**

```text
Deployment: 0x6DcCC0d679515146b1e4c631A9f1215C7C31E8fe
Contract version: 0.4.0
Source: contracts/ScopeFlow.py
Frozen SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

Wallets used:

```text
Client:      0x6276095FAEA15108740445ff277fdA8c304657F4
Contractor:  0xAD05365aFe0C2450d4FFBcdbE555b6E5fB7Dfa35
Third party: 0xA2D2E7baD15e7b8A9031d88353530a794e56Db28
```

## 1. Fresh deployment profile — PASS

`get_registry()`:

```text
project_count = 0
contract_version = 0.4.0
scope_version_ledger = true
```

## 2. Project created; no effective snapshot before acceptance — PASS

Project #1 was created with a committed initial scope. Before Contractor acceptance:

```text
status = PENDING_CONTRACTOR_ACCEPTANCE
active_scope_version = 1
scope_version_count = 0
```

`get_scope_version(1,1)` was unavailable, proving no effective V1 was written prematurely.

## 3. Contractor acceptance creates V1 — PASS

After the named Contractor accepted:

```text
status = ACTIVE
active_scope_version = 1
scope_version_count = 1
```

`get_scope_version(1,1)`:

```text
version = 1
previous_version = 0
origin = INITIAL_SCOPE
originating_request_id = 0
client_approved = true
contractor_approved = true
active = true
```

The snapshot text matched the committed initial scope.

## 4. Two requests classified against V1 — PASS

Request #1:

```text
Add a secure customer authentication flow with email sign-in, password reset, and protected account pages.
```

Request #2:

```text
Add a Stripe-powered subscription billing integration with checkout, recurring plans, invoices, and billing management.
```

Both returned:

```text
classification = SCOPE_EXTENSION
classified_against_version = 1
status = AWAITING_APPROVAL
```

## 5. Request #1 creates V2 — PASS

One-party approval did not advance the ledger. After the second party approved:

```text
active_scope_version = 2
scope_version_count = 2
```

`get_scope_version(1,2)`:

```text
version = 2
previous_version = 1
origin = APPROVED_EXTENSION
originating_request_id = 1
client_approved = true
contractor_approved = true
active = true
```

Historical V1 remained unchanged and became inactive.

## 6. Request #2 superseded + rollback/no-write — PASS

After V2 became active, Request #2 derived:

```text
status = SUPERSEDED
classified_against_version = 1
```

Attempting `approve_extension(1,2)` reached consensus but execution returned ERROR with validator rollback:

```text
Request superseded by scope change
```

Post-state remained:

```text
active_scope_version = 2
scope_version_count = 2
```

## 7. V2 request creates V3 — PASS

Request #3:

```text
Add an admin analytics dashboard with event tracking, reporting filters, and CSV exports.
```

It was submitted by the Contractor, classified `SCOPE_EXTENSION` against V2, and approved by both parties.

Final V3 snapshot:

```text
version = 3
previous_version = 2
origin = APPROVED_EXTENSION
originating_request_id = 3
client_approved = true
contractor_approved = true
active = true
```

Project state:

```text
active_scope_version = 3
scope_version_count = 3
```

## 8. Ordered ledger — PASS

`get_scope_versions(1,1,10)` returned exactly:

```text
V1 -> previous 0 -> INITIAL_SCOPE -> inactive
V2 -> previous 1 -> request #1 -> inactive
V3 -> previous 2 -> request #3 -> active
count = 3
total = 3
```

Exactly one version was active.

## 9. Unrelated-wallet approval — PASS

Request #4 was a fresh `SCOPE_EXTENSION` against V3. Third-party wallet `0xA2D2...Db28` called `approve_extension(1,4)`.

Consensus reached ACCEPTED, but execution result was ERROR with:

```text
[rollback] Only project parties
```

Post-state showed Request #4 still unapproved/unapplied and the ledger still at V3.

## 10. Applied-extension replay — PASS

A legitimate project party replayed:

```text
approve_extension(1,3)
```

Consensus reached ACCEPTED, but execution result was ERROR with:

```text
[rollback] Extension already applied
```

Final post-state:

```text
status = ACTIVE
active_scope_version = 3
scope_version_count = 3
request_count = 4
```

Final ledger:

```text
count = 3
total = 3
```

No V4 or phantom version was created.

## 11. Local deterministic/source-derived suite — PASS

Command:

```bash
npm run test:ledger
```

Observed:

```text
52/52 directed/source checks passed
Property sweep: 5000 traces / 80313 transitions / 0 invariant failures
Contract SHA256: 4b80a8cec6309dbb6e6a082ce913899cb6d36059bc07a8380277644cb75f5e1a
```

## Final result

```text
Fresh deployment profile                         PASS
No premature V1 write                           PASS
Acceptance creates exact immutable V1           PASS
Two V1 extension classifications                PASS
Two-party approval creates V2                   PASS
Historical V1 immutability                      PASS
Superseded request rollback/no-write             PASS
V2 extension creates V3                         PASS
Ordered V1 -> V2 -> V3 provenance               PASS
Unrelated-wallet approval rollback/no-write     PASS
Applied-extension replay rollback/no-write      PASS
Local 52-check + property suite                  PASS
```

The exact deployed contract source is frozen. Any contract-source edit after this point requires a new deployment and a fresh runtime proof.
