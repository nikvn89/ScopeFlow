# ScopeFlow — Steward-Fixed Runtime-Passed Build

**Mutual opt-in scope governance on GenLayer.**

This build responds to the Aug 25, 2026 steward request and has been redeployed and runtime-tested on StudioNet.

## Canonical steward-fix deployment

```text
Contract: 0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb
Contract version: v0.3.0
Frontend/package revision: v0.3.3
Network: StudioNet
```

Explorer:
https://explorer-studio.genlayer.com/address/0x20A5d7fcC4119aB91A6fC343cCEDCCB37E8C8dDb

## Steward fixes implemented

### 1. Contractor opt-in is a real gate

A client may create a project and commit an initial scope, but the project remains:

```text
PENDING_CONTRACTOR_ACCEPTANCE
```

until the named contractor accepts it on-chain.

Deterministic lifecycle states:

```text
PENDING_CONTRACTOR_ACCEPTANCE
ACTIVE
CANCELLED
```

Rules enforced on-chain:

- only project parties can enter party-only flows;
- only the named contractor can activate an unaccepted project;
- the client can cancel only before acceptance;
- `submit_request`, `approve_extension`, and `reject_extension` are blocked before acceptance;
- a cancelled project is read-only;
- the contractor accepts the exact committed scope; `accept_project` takes no replacement scope.

### 2. Scope capacity is checked only when an extension is actually appended

The old capacity pre-check was removed from `submit_request`. A request can be classified even when remaining capacity is very small. The 6,000-character limit is enforced only in the path where the second approval would actually append a `SCOPE_EXTENSION`.

Runtime evidence used a 5,900-character scope with only 100 characters remaining. The extension request was created normally, the first approval succeeded, and the second approval reverted with:

```text
Scope capacity exceeded: appending this extension would exceed the 6000-character limit. The extension cannot be applied.
```

The rollback preserved:

```text
active_scope_version = 1
scope_length = 5900
scope_capacity_left = 100
applied = false
```

## Semantic classification

The semantic enum remains unchanged:

```text
SCOPE_IN
SCOPE_EXTENSION
SCOPE_UNCLEAR
```

Observed runtime examples on the steward-fix deployment:

- request #1 on project #1 -> `SCOPE_EXTENSION`; after both parties approved it, `active_scope_version` advanced from 1 to 2 and the extension was appended;
- request #2 on project #1 -> `SCOPE_IN` / `ACCEPTED_IN_SCOPE` with no new approval gate.

## Honest limitation

ScopeFlow does not verify that described work was actually performed. It proves the governance state around the committed scope: who accepted it, how requests were classified, whether extensions received the required approvals, and what scope text is currently in force.

## Frontend

Default contract address in `src/lib/config.ts` is already updated to the steward-fix deployment.

```bash
npm install
npm run build
npm run dev
```

Redeploy Vercel from this source, run the live smoke test in `TESTING.md`, then resubmit the portal entry with the canonical contract and updated evidence links.
