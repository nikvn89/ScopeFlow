# ScopeFlow V2 — Verified Testing

## Contract

```text
0xBC87f884A58A472d2A28e831Bc2386056E6F7F4A
```

Explorer:

https://explorer-studio.genlayer.com/address/0xBC87f884A58A472d2A28e831Bc2386056E6F7F4A

---

## Build

Command:

```bash
npm run build
```

Result:

```text
PASS
```

The V2 frontend compiled successfully after the final TypeScript fixes.

---

## Test 1 — Wallet Connection

A MetaMask wallet connected successfully.

Observed:

```text
wallet address shown in header
Switch wallet available
```

Result:

```text
PASS
```

---

## Test 2 — Self-Service Create Project

Connected wallet created a new project from the browser.

Initial scope:

```text
Contractor will maintain the existing pricing page by correcting spelling and grammar, updating existing page copy, and making minor visual adjustments within the current design system. New site-wide themes, new application features, and new page templates are excluded unless separately approved.
```

Observed:

```text
Project #1
Scope V1
connected wallet role = CLIENT
Contractor stored correctly
Scope length = 297 / 6000
Requests = 0
```

Result:

```text
PASS
```

This verifies the judge/user self-service requirement: the project creator becomes Client without relying on deployer ownership.

---

## Test 3 — SCOPE_IN

Submitted from the frontend:

```text
Fix the spelling errors on the pricing page.
```

Observed in History:

```text
Request #1
IN SCOPE
ACCEPTED IN SCOPE
Judged against Scope V1
```

Scope version remained:

```text
1
```

Result:

```text
PASS
```

---

## Test 4 — SCOPE_EXTENSION

Submitted from the frontend:

```text
Add a full dark mode theme across every page of the website.
```

Observed:

```text
Request #2
SCOPE EXTENSION
AWAITING APPROVAL
Client = Pending
Contractor = Pending
Judged against Scope V1
```

Result:

```text
PASS
```

---

## Test 5 — Client Approval

Client clicked:

```text
Approve
```

Observed:

```text
Client = Approved
Contractor = Pending
status = AWAITING APPROVAL
Scope remains V1
Client Approve button disabled after approval
```

Result:

```text
PASS
```

---

## Test 6 — Contractor Approval

Wallet switched to the assigned Contractor.

Observed role:

```text
CONTRACTOR
```

Contractor approved Request #2.

Observed:

```text
0 awaiting decision
transaction accepted
Scope V1 → Scope V2
```

Result:

```text
PASS
```

---

## Test 7 — Final Project State

Observed on the Project tab:

```text
Project #1
Scope V2
Scope version = 2
Requests = 2
Scope length = 394 / 6000
Scope capacity remaining = 5606
```

The active agreement visibly includes:

```text
APPROVED EXTENSION

Add a full dark mode theme across every page of the website.
```

Result:

```text
PASS
```

---

## Verified Summary

```text
PASS  Build
PASS  Connect wallet
PASS  Self-service create project
PASS  Project creator becomes CLIENT
PASS  Contractor stored correctly
PASS  SCOPE_IN classification
PASS  ACCEPTED_IN_SCOPE rendering
PASS  SCOPE_EXTENSION classification
PASS  AWAITING_APPROVAL rendering
PASS  Client approval
PASS  Contractor wallet role
PASS  Contractor approval
PASS  Scope V1 → V2
PASS  Approved extension displayed in active agreement
PASS  Request count = 2
PASS  Scope capacity updated
```

## Final Verdict

```text
PASS
```

ScopeFlow V2 has completed the intended self-service browser flow end-to-end against its deployed GenLayer StudioNet contract.
