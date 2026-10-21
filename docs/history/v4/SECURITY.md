> Historical v4 record. Its results and deployment do not describe v5.

# ScopeFlow consent and escrow boundaries

An offer is bounded by its project, proposer role, increasing offer ID, scope version, escrow amount and expiry. Only the other project party can accept it. A replacement always changes the ID, including at the same price. Transaction ordering resolves cancellation/acceptance races: after one closes/cancels, an incompatible later operation reverts.

Publishing through the timed API cannot settle implicitly. Cancellation/expiry cannot allocate or transfer funds. Acceptance allocates escrow once into Contractor and Client due balances. Existing withdrawal guards clear the due balance before emitting a transfer. The total of held escrow, outstanding dues and recorded withdrawals is conserved; committed extension deposits are tracked separately until applied or reclaimed.

Expiry is checked against the contract transaction clock; equality is expired. A changed scope or escrow invalidates an old offer. Browser time and display state cannot override these checks. Only the latest offer per role is retained, not a full historical offer log.

The legacy proposal API intentionally retains matching behavior for live offers with a default 24-hour validity. A caller signing that API may settle by matching the counterparty. The v4 UI uses explicit acceptance instead. Cancelling an offer does not veto a separate mutual project close, cancel the project, or unlock escrow unilaterally.

There is no arbiter, unilateral escape, identity verification, real-world delivery verification or automatic refund on offer expiry. GEN can remain locked in an active project without agreement. The semantic classifier's bounded enum and fail-closed behavior were existing functionality; these tests do not prove model accuracy or universal prompt-injection resistance.

The write client checks version/capability/account before signing and requires finalized leader normal-return evidence. It verifies relevant postconditions against finalized state. Unknown evidence remains unconfirmed. A successful withdrawal parent or contract "paid" counter is not sufficient proof of asynchronous native transfer delivery. Inspect the linked transfer and recipient balance before claiming payment.

The 0.7.0 candidate requires a fresh deployment; no migration is provided. The core on-chain offer and native delivery path passed on 21 October 2026; see RUNTIME_TEST.md. Runtime negative writes and fresh semantic-model accuracy tests are not claimed. Local SDK tests use controlled model answers and a native-transfer recorder and are not network consensus tests.
