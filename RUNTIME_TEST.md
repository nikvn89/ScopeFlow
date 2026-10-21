# ScopeFlow V5 — verified core runtime

Verified 21 October 2026 on StudioNet, chain 61999. Contract `ScopeGuard` 0.8.0:
[0xF18DbCe66c93C85d80bf7ABF19a3d79Db72D358C](https://explorer-studio.genlayer.com/address/0xF18DbCe66c93C85d80bf7ABF19a3d79Db72D358C).

Deployed artifact: `deploy/ScopeFlow.py` (47,218 bytes). The exact normalized SHA256 is `0037942acff3e68b64fc4d9dc9ae04ce19a5574814d713474bb2965a3d702d76`. Readable reference: `contracts/ScopeFlow.py`. Source parity was rechecked after the signed flow.

Client: `0x6276095FAEA15108740445ff277fdA8c304657F4`.
Contractor: `0x037f58E33c1Ec8fdA272361E0aAC1e31054a1CDE`.
Project #1; milestone #1, Responsive pages; fixed budget 0.001 GEN.

## Executed results

| Operation | Verified observation |
| --- | --- |
| Create/fund then accept | Escrow 0.003 GEN; ACTIVE scope V1 |
| Propose then accept milestone | Reserved 0.001; available 0.002; no payment |
| Submit report #1 omitting pricing/navigation | DELIVERY_GAPS; no due or receipt |
| Submit report #2 addressing all criteria | DELIVERY_MATCHES; no automatic allocation |
| Client approves exact report #2 | Receipt #1; milestone PAID; project ACTIVE; due 0.001; escrow 0.002; reserved 0 |
| Contractor progress withdrawal | Native 0.001 received; project still ACTIVE |
| Contractor final offer #1; Client accepts exact ID | Share 0.001 of remaining 0.002, validity 3,600 seconds; CLOSED; each party due 0.001 |
| Client and Contractor final withdrawals | Native 0.001 each; both dues zero; Contractor cumulative 0.002, Client refund 0.001 |
| Final conservation | Contract native balance, escrow and reservations zero; receipt #1 unchanged |

The project scope was `Build responsive home and pricing pages with working navigation between both pages.`
Fixed milestone criteria: `Deliver responsive home and pricing pages with working navigation between both pages.`
Report #1: `Delivered only a home page. The pricing page and navigation have not been delivered.`
Report #2: `Delivered responsive home and pricing pages. Working navigation links connect both pages.`
Both artifact URLs were empty and `artifact_fetched` was false.

## Transaction references

All parent writes listed in the machine-readable evidence were FINALIZED with explicit normal GenVM returns. Allocation and final-offer acceptance emitted no native payout; withdrawals did.

- Create/fund: [0xfd9d916abd16e9aefc88920225b73c208e1fd46b696979e43c799018fa2fae63](https://explorer-studio.genlayer.com/tx/0xfd9d916abd16e9aefc88920225b73c208e1fd46b696979e43c799018fa2fae63).
- Accept project: [0x6273e1030a472c93c2052716426ca0bee3789dd97a430c33fb452ebad847349b](https://explorer-studio.genlayer.com/tx/0x6273e1030a472c93c2052716426ca0bee3789dd97a430c33fb452ebad847349b).
- Propose milestone: [0xbfbfa23fab3366d669ceaea297ad6513a1ac68590f55c1ee7f96766146dc4c84](https://explorer-studio.genlayer.com/tx/0xbfbfa23fab3366d669ceaea297ad6513a1ac68590f55c1ee7f96766146dc4c84).
- Accept milestone: [0x65bdeed5efe40604bb3704e3cf55398f23df013442938735db7475e861247895](https://explorer-studio.genlayer.com/tx/0x65bdeed5efe40604bb3704e3cf55398f23df013442938735db7475e861247895).
- Delivery report #1 (GAPS): [0x654f2520eb68a8487843f50a097bd96b48cf2ddbf0f212b991abefef7da266fc](https://explorer-studio.genlayer.com/tx/0x654f2520eb68a8487843f50a097bd96b48cf2ddbf0f212b991abefef7da266fc).
- Delivery report #2 (MATCHES): [0xb716a508c217031baed0f17c84ac017307fc4b9e8cffed29c9fe61ba7a7b7ef1](https://explorer-studio.genlayer.com/tx/0xb716a508c217031baed0f17c84ac017307fc4b9e8cffed29c9fe61ba7a7b7ef1).
- Approve exact report: [0x169dfc6b49edc2d14bee7a833d334cb77f6bf4f9b65534fd16f1763f4e97b27f](https://explorer-studio.genlayer.com/tx/0x169dfc6b49edc2d14bee7a833d334cb77f6bf4f9b65534fd16f1763f4e97b27f).
- Withdraw — Contractor: [0xe721a6d2e92dea91e3ccd933106a0738716e3a27babc8caa36449176397ece46](https://explorer-studio.genlayer.com/tx/0xe721a6d2e92dea91e3ccd933106a0738716e3a27babc8caa36449176397ece46).
- Publish final offer: [0x01fe6e97c7b6e989f3cc316fd9bc04426bf4f177554ecd8b8b499c6356f1c63b](https://explorer-studio.genlayer.com/tx/0x01fe6e97c7b6e989f3cc316fd9bc04426bf4f177554ecd8b8b499c6356f1c63b).
- Accept exact final offer: [0xa33ce61a8cbbea29b52064f35c67553248ffaf2fa9217c709c2418c9e464c4ab](https://explorer-studio.genlayer.com/tx/0xa33ce61a8cbbea29b52064f35c67553248ffaf2fa9217c709c2418c9e464c4ab).
- Withdraw — Client: [0x81dd28a07c8ae919b39079dfd056dc9ff2ceec0d5ae586211129f86aa398727b](https://explorer-studio.genlayer.com/tx/0x81dd28a07c8ae919b39079dfd056dc9ff2ceec0d5ae586211129f86aa398727b).
- Withdraw — Contractor: [0x00f481fba8979ae517e99e2777d849a7ad522c1f3f3e4433fbc8aa5c11c032c5](https://explorer-studio.genlayer.com/tx/0x00f481fba8979ae517e99e2777d849a7ad522c1f3f3e4433fbc8aa5c11c032c5).

## Native delivery proof

| Payment | Parent transaction | Credited native child | Amount |
| --- | --- | --- | --- |
| Contractor progress | [0xe721a6d2…](https://explorer-studio.genlayer.com/tx/0xe721a6d2e92dea91e3ccd933106a0738716e3a27babc8caa36449176397ece46) | [0x1db35802…](https://explorer-studio.genlayer.com/tx/0x1db35802e49234a11e6e7c338357b8b294a5d8ed4a63d7da00a00ca660fbd997) | 0.001 GEN |
| Client final refund | [0x81dd28a0…](https://explorer-studio.genlayer.com/tx/0x81dd28a07c8ae919b39079dfd056dc9ff2ceec0d5ae586211129f86aa398727b) | [0x212d771c…](https://explorer-studio.genlayer.com/tx/0x212d771c858776181b48f0ab0aadaa8f491b6e54e47fc3790a2d3627ac1c047d) | 0.001 GEN |
| Contractor final share | [0x00f481fb…](https://explorer-studio.genlayer.com/tx/0x00f481fba8979ae517e99e2777d849a7ad522c1f3f3e4433fbc8aa5c11c032c5) | [0x3412bc97…](https://explorer-studio.genlayer.com/tx/0x3412bc9765e576b7edc4078f384541fb45c9289c87ee9b9df399804e4c8ce04d) | 0.001 GEN |

Each child is FINALIZED, `value_credited: true`, has the correct recipient/value and points back to the parent that lists it. Contractor balance increased by 0.001 GEN across the progress withdrawal; across the two final withdrawals, each wallet increased by 0.001 GEN and contract balance fell from 0.002 GEN to zero. Full decimal wei balances, timestamps, immutable receipt and all selected transaction fields are in [verified-runtime-0.8.0.json](tests/evidence/verified-runtime-0.8.0.json).

Reads are separate snapshots, not an atomic historical block. The two final payout balance snapshots bracket both withdrawals; individual attribution is supported by the parent/child records. These StudioNet observations do not promise a fee policy on other networks.

## Scope and remaining release checks

This verifies one live two-wallet business path and two textual classifier outcomes. It does not verify external artifacts, broad model accuracy, every adversarial input or every negative runtime branch. Revision requests, stale-consent races, role/replay/cap errors and additional money permutations have local SDK coverage only. Historical v4 evidence is retained separately and is not used as v5 proof.

The public production URL, actual uploaded v5 commit and original reviewed Project baseline SHA have not been supplied. Pin actual full SHA values for repository and comparison Evidence; never substitute `main` or label an unverified baseline as reviewed.

To reproduce reads: `npm run verify:deployed -- ADDRESS` and `npm run check:runtime -- ADDRESS 1`. `npm run capture:runtime -- ADDRESS 1 TX_HASH ...` saves selected fields as `SNAPSHOT_ONLY_REVIEW_REQUIRED`; captured snapshots need assessment before any PASS claim.
