# Security notes — v0.6.0 escrow

## Where money can go

GEN leaves the contract in exactly two methods, and only to a project party:

- `withdraw(project_id)` pays the caller's own allocation (`client_due` to the Client, `contractor_due` to the Contractor) and zeroes it first.
- `reclaim_extension_deposit(project_id, request_id)` returns a Client deposit whose extension can no longer apply, and zeroes it first.

## Allocation rules

| Event | Escrow goes to |
| --- | --- |
| Client cancels before acceptance | Client |
| Contractor declines | Client |
| Anyone records expiry after the acceptance deadline | Client |
| Both parties approve close on the same scope version | Contractor (all of it) |
| Both parties propose the same split (same share, scope version and escrow) | Contractor share / rest to the Client |

An allocation happens once; afterwards the escrow is zero and the project is terminal, so it cannot be funded again.

## Extension pricing

- A price is kept only when the request is classified `SCOPE_EXTENSION`. In-scope and unclear requests store price 0.
- Only the Client's approval may carry value, and it must equal the price. The Contractor's approval must carry none.
- The deposit is held per request, apart from the escrow, until both approvals apply the extension. If the extension is rejected, superseded by another version, or the project closes first, the Client can take the deposit back. A deposit attached to a live extension cannot be withdrawn.

## Invariant

For every project: everything deposited = escrow + both due balances + held extension deposits + everything already paid out. `test_every_wei_is_accounted_for` drives funding, a priced extension, a superseded deposit, a top-up, a settlement, a decline and all withdrawals, and checks this to the wei.

## Closed in v0.6.0

- Reserved prompt markers were removed only in exact case, so `</change_request>` or `</Active_Scope>` in a request reached the model as a structural tag. Markers are now removed case-insensitively, repeatedly, leaving a space so split pieces cannot rejoin (`test_reserved_markers_are_removed_in_any_case`, `test_split_tokens_do_not_rejoin`; all six fail on v0.5.0).
- The app no longer needs the GenLayer Snap to write.

## Limits

- There is no arbiter. After acceptance the escrow moves only on a mutual close or an agreed split; if the parties never agree, it stays in the contract. Neither party can take it alone.
- A settlement proposal is bound to the scope version and escrow it was made against. A top-up or an applied extension makes older proposals stale, and both parties must propose again.
- The classification is a model judgment under GenLayer consensus. It decides whether a price applies; it does not decide amounts. Every amount is set by a party and accepted by the other.
- Amounts are capped at 10^27 wei per escrow, price or deposit.
- Direct Mode tests mock the model answer; StudioNet runs are recorded in `TESTING.md`.
