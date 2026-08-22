# ScopeFlow V2

**Self-service AI-governed project scope control on GenLayer.**

ScopeFlow V2 is the full dApp for the multi-tenant ScopeGuard V2 Intelligent Contract.

## Live Contract

```text
0xBC87f884A58A472d2A28e831Bc2386056E6F7F4A
```

Explorer:

https://explorer-studio.genlayer.com/address/0xBC87f884A58A472d2A28e831Bc2386056E6F7F4A

## Judge / User Self-Service Flow

The deployer is not the owner of every project.

Any connected wallet can:

```text
Connect Wallet
→ Create Project
→ caller becomes that project’s Client
→ choose Contractor
→ lock Initial Scope
→ submit Change Requests
→ receive GenLayer classification
→ approve / reject extensions
→ inspect append-only History
```

A Contractor or reviewer can open any known `project_id` directly.

## Contract Model

One ScopeGuard V2 contract supports multiple independent projects.

```text
ScopeGuard V2
├── Project #1
├── Project #2
├── Project #3
└── ...
```

Each project stores its own Client, Contractor, scope, scope version, and request history.

## Semantic Output

```text
SCOPE_IN
SCOPE_EXTENSION
SCOPE_UNCLEAR
```

The frontend never decides these outcomes.

It also never decides authoritative scope version, approval state, permissions, or request status.

## UI

### GenLayer-inspired dashboard

The frontend uses a light, portal-style dashboard language while keeping a distinct ScopeFlow identity:

- persistent left navigation
- clean top context bar
- ScopeFlow project logo
- visible **Built on GenLayer** logo/branding
- large dark hero with scope/consensus visual motif
- compact registry / wallet / decision metric cards
- Create Project, My Projects, Open by ID, and Recently Opened kept on the dashboard
- responsive sidebar and mobile layout

### Project Workspace

Three compact sections remain available without changing contract behavior:

- **Project** — current scope, parties, version, remaining capacity
- **Change Requests** — submit requests and approve/reject live extensions
- **History** — append-only request decisions

Role-aware UI:

```text
CLIENT
CONTRACTOR
OBSERVER
```

Unauthorized writes remain visible but disabled with a reason.

## RPC Safety

After a write returns a transaction hash, ScopeFlow never resubmits the same transaction merely because receipt monitoring is delayed.

The UI:

- waits only for bounded `ACCEPTED` monitoring;
- retains the transaction hash;
- links to Explorer;
- tells the user to Refresh instead of resubmitting.

## Run

```bash
npm install
npm run build
npm run dev
```

## Contract File

The repository includes:

```text
contracts/ScopeGuardV2.py
```

This is the same multi-tenant architecture used by the project deployment.

## Verified Browser Flow

The current ScopeFlow V2 frontend was built and tested locally against the V2 project contract.

Verified:

```text
PASS  npm run build
PASS  wallet connection
PASS  self-service create project
PASS  caller becomes project CLIENT
PASS  SCOPE_IN → ACCEPTED_IN_SCOPE
PASS  SCOPE_EXTENSION → AWAITING_APPROVAL
PASS  Client approval
PASS  Contractor approval
PASS  role switch CLIENT → CONTRACTOR
PASS  active scope version 1 → 2
PASS  approved extension appended to active scope
PASS  request count = 2
```

Final verified project state:

```text
Project #1
Scope version = 2
Requests = 2
Scope length = 394 / 6000
Approved extension:
Add a full dark mode theme across every page of the website.
```

## Status

**ScopeFlow V2 frontend and its self-service end-to-end project flow are verified locally against the deployed GenLayer StudioNet contract.**
