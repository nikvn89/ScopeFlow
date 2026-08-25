# ScopeFlow — Steward Fix Runtime Evidence

Canonical deployment:

```text
0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
```

The following results were actually observed on StudioNet.

Wallet shorthand used during testing:

```text
7F4 = client
A61 = contractor
701 = unrelated third wallet
```

## T1 — Pending until contractor accepts — PASS

Project #1 created by 7F4 naming A61 as contractor. `get_project(1)` returned:

```text
accepted = false
accepted_at = 0
cancelled = false
status = PENDING_CONTRACTOR_ACCEPTANCE
request_count = 0
```

## T2 — No classification before opt-in — PASS

7F4 called `submit_request(1, ...)` before acceptance. Observed rollback:

```text
Contractor has not accepted this project yet
```

## T3 — Wrong wallet cannot accept — PASS

701 called `accept_project(3)` for a project where 701 was neither client nor contractor. Observed rollback:

```text
Only project parties
```

This proves an unrelated wallet cannot activate the project.

## T4 — Contractor accepts exact committed scope — PASS

A61 accepted project #1. `get_project(1)` then returned:

```text
accepted = true
accepted_at > 0
cancelled = false
status = ACTIVE
active_scope_version = 1
```

The committed scope text remained unchanged.

## T5 — Client cannot cancel after acceptance — PASS

7F4 called `cancel_project(1)` after A61 accepted. Observed rollback:

```text
Accepted project cannot be cancelled
```

## T6 — Classification after acceptance — PASS

### Extension path

Project #1 request #1 was classified:

```text
SCOPE_EXTENSION
```

After both 7F4 and A61 approved, `get_request(1,1)` showed:

```text
client_approved = true
contractor_approved = true
applied = true
status = APPROVED_EXTENSION
```

`get_project(1)` showed:

```text
active_scope_version = 2
request_count = 1
status = ACTIVE
```

and the approved extension was appended to `active_scope`.

### In-scope path

A61 submitted:

```text
Implement the exportable activity history already specified in the committed scope.
```

Consensus returned:

```text
SCOPE_IN
```

`get_request(1,2)` showed:

```text
classification = SCOPE_IN
status = ACCEPTED_IN_SCOPE
client_approved = false
contractor_approved = false
applied = false
```

No additional approval gate was required.

## T7 — Capacity check only at append — PASS

Project #5 used a committed initial scope of exactly 5,900 characters:

```text
scope_length = 5900
scope_capacity_left = 100
```

A new request was still accepted and classified `SCOPE_EXTENSION`; submission itself was not blocked by remaining capacity.

The first party approval succeeded. The second-party approval attempted to append the extension and reverted with:

```text
Scope capacity exceeded: appending this extension would exceed the 6000-character limit. The extension cannot be applied.
```

Post-rollback state:

```text
client_approved = true
contractor_approved = false
applied = false
status = AWAITING_APPROVAL
active_scope_version = 1
scope_length = 5900
scope_capacity_left = 100
```

This is direct runtime evidence that the capacity check occurs only when an extension would actually be appended.

## T8 — Cancel before acceptance — PASS

Project #2 was cancelled before contractor acceptance. `get_project(2)` showed:

```text
accepted = false
cancelled = true
status = CANCELLED
```

A subsequent `submit_request(2, ...)` reverted with:

```text
Project cancelled
```

## Runtime conclusion

```text
T1 PASS
T2 PASS
T3 PASS
T4 PASS
T5 PASS
T6 PASS
T7 PASS
T8 PASS
```

The steward-requested contract behavior is runtime-verified on the canonical deployment above. Frontend/Vercel redeployment remains a separate final step.
