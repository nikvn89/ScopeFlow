# ScopeFlow v4 runtime verification — PASS

Verified on **21 October 2026** using the new **0.7.0** deployment `0x08F49e8929c7c49E2eBA30785661c0eA84b6b104` and Project **#1**. Scope version remained **1**; this is the deterministic settlement milestone path. Source parity passed against the frozen hash in `release.json`.

- Client A: `0x6276095FAEA15108740445ff277fdA8c304657F4`.
- Contractor B: `0x037f58E33c1Ec8fdA272361E0aAC1e31054a1CDE`.
- Initial escrow: **0.003 GEN**; agreed Contractor share: **0.002 GEN**.

| Action | Observed result | Transaction |
| --- | --- | --- |
| New deployment | FINALIZED, leader SUCCESS / normal return; source parity | [`0xb528a3ce…f0d365`](https://explorer-studio.genlayer.com/tx/0xb528a3ce88844276a25e48fbcd049d040f921f89456d13049700b62031f0d365) |
| Client creates project with escrow | 0.003 GEN funded; pending Contractor | [`0xb4fddd97…bee832`](https://explorer-studio.genlayer.com/tx/0xb4fddd970451622c3b8ad07e50a8a220e069c62d0a8295b5d76d93c198bee832) |
| Contractor accepts project | ACTIVE, scope V1 | [`0xc799aeac…7b0b22`](https://explorer-studio.genlayer.com/tx/0xc799aeac0b34afa939cf71193b4148d64e32d97dc8a05c3a8c71f6c3de7b0b22) |
| Contractor publishes offer #1 / 60 seconds | Expiry observed at chain time 1792562160; expiry 1792561921; escrow unchanged, dues zero | [`0xf90c02e6…ee536d`](https://explorer-studio.genlayer.com/tx/0xf90c02e6f255f4aee993f9a7a81842fa8c70fb111db4f6c502da82428aee536d) |
| Contractor publishes offer #2 / 3600 seconds | New ID at same price; ACTIVE, no allocation | [`0xe7dc2e91…b82e94`](https://explorer-studio.genlayer.com/tx/0xe7dc2e916f8d091c04d541e5d41077c29641cea7489cc57d0e65a741ceb82e94) |
| Contractor cancels offer #2 | CANCELLED; escrow 0.003 GEN, dues zero | [`0x22d97acd…6c1ef7`](https://explorer-studio.genlayer.com/tx/0x22d97acd0a12ab43e3e7cbbcf36bb8532458b692383760b2a0fc454c476c1ef7) |
| Contractor republishes at same price as offer #3 | New ID, OPEN | [`0xe65160f8…e211c8`](https://explorer-studio.genlayer.com/tx/0xe65160f8502e48f683fec1a5e6681ef8b3ee94bc03af40a24bf648fe48e211c8) |
| Client accepts exact offer #3 | CLOSED; accepted ID 3, proposer CONTRACTOR; escrow zero; dues 0.002 / 0.001 GEN | [`0x763e1ff5…b40b17`](https://explorer-studio.genlayer.com/tx/0x763e1ff5820474cd6b84fc6b69d2a482914edf7305b10bc0caef4f6f4cb40b17) |
| Client withdraws | FINALIZED parent normal return; linked native transfer credited 0.001 GEN | [`0x889160ef…7ef1db`](https://explorer-studio.genlayer.com/tx/0x889160efef4a062b3c61a59ccb99af04d3794944188f0499b621af49fc7ef1db); transfer [`0x20f1fab2…448f4b`](https://explorer-studio.genlayer.com/tx/0x20f1fab2f11890fe2dd37f8b018e8154a24cf92fff1c38523fae5d876c448f4b) |
| Contractor withdraws | FINALIZED parent normal return; linked native transfer credited 0.002 GEN | [`0x4aa1e951…46bb1b`](https://explorer-studio.genlayer.com/tx/0x4aa1e951c57627c9cb8058fb00205defcd7b550462ffba8d9d148ee0ef46bb1b); transfer [`0x270854b0…125d55`](https://explorer-studio.genlayer.com/tx/0x270854b075bd50aac129abec7e28a189322787241a679deaf988c10d8d125d55) |

## Delivery and balance reconciliation

Both native children refer back to the correct withdrawal parent, originate from this contract and credit the declared recipient. Both have `status: FINALIZED` and `value_credited: true`. The observed wallet increases were exactly **1,000,000,000,000,000 wei** for A and **2,000,000,000,000,000 wei** for B. These are observations for this test window, not a general fee assumption.

Final project state: `CLOSED`, `settled_offer_id: "3"`, escrow and both due balances **zero**, recorded Contractor paid **0.002 GEN**, Client refunded **0.001 GEN**. The contract's native balance is **zero**. This reconciles the **0.003 GEN** deposit with both verified payments.

Machine-readable transactions, historical expiry/cancellation/allocation snapshots, final project state, before/after balances and verified parent-child relationships: [verified-runtime-0.7.0.json](tests/evidence/verified-runtime-0.7.0.json). Only selected public fields are retained; no full provider configuration is included.

## Coverage limits

No fresh semantic-model classification was requested in this settlement path; that feature already existed in v3. Negative authorization, stale IDs, exact expiry boundaries and zero/full split cases ran locally. They are not claimed as new on-chain negative tests. Browser/wallet actions were performed by the user, with screenshots supplied; the assistant independently checked finalized state, receipts and native delivery.

For a fresh review reproduction, use a new project with two distinct wallets: fund 0.003 GEN, accept the project, expire one 60-second offer, cancel a 1-hour replacement, republish, accept its exact ID and withdraw each allocation. A one-hour validity is a deadline and does not delay cancellation or acceptance.

Read-only collection remains available with `npm run check:runtime -- ADDRESS PROJECT_ID [TX_HASH]`; source parity with `npm run verify:deployed -- ADDRESS`.
