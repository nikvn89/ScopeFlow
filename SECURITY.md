# ScopeFlow 0.8.0 — consent and accounting boundaries

## Milestones and approval

Only the project's Client can propose milestones, cancel unaccepted proposals, request revisions and approve deliveries. Only its Contractor can accept milestone terms and submit reports. All writes require an active project. Maximums are 20 milestones and five valid semantic submissions per milestone; page sizes are 1–50. Input lengths and amount limits are enforced before semantic evaluation.

A proposal fixes title, criteria and budget. Contractor acceptance checks the proposal's scope version and reserves only available escrow. Accepted criteria are not silently rebased when later scope extensions apply. Both version provenance and fixed criteria remain readable. There is no unilateral release of an accepted reservation: unfinished work requires eventual party agreement or mutual final settlement.

Client approval pins the latest attempt ID and requires `SUBMITTED` plus `DELIVERY_MATCHES`. A newer report makes an older approval fail. A revision request blocks approval until a new report arrives. Approval allocates exactly the fixed budget once, never closes the project automatically and never emits a transfer. Submission records and allocation receipts are appended once; per-attempt reviews have a single transition from no review to revision request or approval.

## Semantic boundaries

The delivery prompt JSON-encodes the criteria and report as untrusted documents. The contract accepts one exact enum in a one-key object; invalid JSON, extra fields, unknown values or evaluation errors fail closed. Validators compare the bounded decision, not arbitrary prose. There is no delivery verdict cache.

These controls do not prove model correctness or universal resistance to prompt injection. A false claim can be written into a report; the classifier cannot prove it happened. Artifact URLs are HTTPS metadata, not fetched or validated evidence. A matching result is only textual consistency; the Client must decide whether to authorize payment. Scope-change classification retains the established separate rubric/cache. Payment, reservation, approval, closure and withdrawal operations make no model calls.

## Money and old consent

Reservations are a subset of escrow. Accepted reservations cannot exceed escrow; approval decreases reservation and escrow by the same amount while increasing Contractor due. Existing priced-extension deposits stay separate until applied or reclaimed. Reclaim emits the deposit back to Client directly; it does not consume milestone escrow or create a milestone receipt.

Each reservation acceptance/payment increments a financial revision and clears both version-pinned close votes. Settlement proposals pin that revision in addition to project, proposer, nonce, scope, escrow and expiry. A partial allocation followed by an equal top-up cannot resurrect an old offer. Offer expiry uses contract transaction time; equality is expired. Cancellation/acceptance races resolve through transaction order.

A newly agreed final closure can intentionally override all unfinished reservations. It clears total reservations and allocates only remaining escrow, adding to existing due balances. Paid receipts and earlier withdrawals stay unchanged. The legacy settlement API can still close by matching live proposals; the dApp uses explicit timed offers and exact acceptance instead.

Withdrawal clears the party's due before emitting the native transfer. Native payout is asynchronous: normal return, a paid counter or an allocation receipt alone does not prove arrival. Verify linked transfer recipient, amount, credited status and wallet balances. No recovery mechanism for an unsuccessful native transfer is added by this milestone.

## Frontend and evidence

The write client checks the 0.8.0 capability profile, selected wallet and chain before signing. It requires finalized raw leader normal-return evidence, then checks finalized postconditions. Delivery approval also checks exact receipt/attempt/criteria/report identifiers and money/revision deltas. Concurrent unrelated writes can make these strict checks inconclusive; refresh and inspect before retrying. Unconfirmed or failed writes never receive a success message.

Public chain contents include scopes, criteria, reports, review notes and artifact URLs. Do not include confidential information. V5 needs a fresh deployment; no migration or in-place storage upgrade is supported. Local SDK tests use controlled model responses and a transfer recorder. The fresh signed deployment, finalized registry and exact source parity have been verified. Live delivery-model accuracy, business-flow consensus, native delivery and browser layout for v5 still require separate runtime work.

## Deployment representation

The canonical readable source is `contracts/ScopeFlow.py`; the Studio deployment
artifact is `deploy/ScopeFlow.py`. The reproducible Python 3.12 build shortens
internal storage/helper/local identifiers and removes lexical whitespace. It
leaves public methods/argument names, dependency headers, annotations and prompt
strings intact. Reversing the name mapping must produce the exact canonical AST.
Both representations run the full SDK suite. CI checks reproducibility and both
source fingerprints are frozen; deployed source parity uses the compact hash.
No in-place migration is supported between these storage representations.
The payload size guard is conservative, not a verified provider limit or proof
that a transaction was broadcast. The fresh signed deployment and source parity are verified in deployment-0.8.0.json; delivery and payment runtime remain pending.
