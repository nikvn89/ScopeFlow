# v4 important runtime path — NOT RUN

Use a fresh **0.7.0** deployment and two distinct wallets: **A = Client**, **B = Contractor**. The previous 0.6.0 runtime evidence is historical. Obtain some StudioNet GEN for gas in both wallets. Confirm the source with `npm run verify:deployed -- ADDRESS` before signing.

1. **A creates and funds a project.** Contractor is B. Scope: `Build a responsive marketing website with home, pricing and contact pages, deployed to the client's domain.` Acceptance window 3600 seconds; initial escrow **0.003 GEN**. Record the project ID, creation hash and finalized state.
2. **B accepts the project.** Expected `ACTIVE`, scope version 1 and escrow 0.003 GEN.
3. **B publishes an expiring offer.** Contractor share **0.002 GEN**, validity **1 minute**. Record ID and `expires_at`. After expiry, Refresh. Expected `EXPIRED`; acceptance unavailable; escrow unchanged and both due balances zero. Do not repeatedly submit a write to check expiry.
4. **B publishes and cancels a replacement.** Same share, validity **1 hour**. Record new ID; cancel that exact offer. Expected `CANCELLED`, project still active and escrow unchanged.
5. **B publishes again at the same share.** Validity **1 hour**. Expected a new ID, not revival of either earlier offer. **A explicitly accepts this exact latest offer.** Expected `CLOSED`, accepted proposer `CONTRACTOR`, accepted ID equal to the recorded offer, escrow zero, Contractor due **0.002 GEN**, Client due **0.001 GEN**.
6. **Each wallet withdraws its own due balance once.** B receives 0.002 GEN, A receives 0.001 GEN. Due balances become zero. For each payment retain the finalized parent, linked native transfer, recipient/value and credited balance evidence. Gas affects wallet balance deltas; do not treat a cleared due balance alone as delivery proof.

For Studio method inputs: 0.003 GEN = `3000000000000000` wei; 0.002 GEN = `2000000000000000` wei. Offer methods are nonpayable; attach no value. Only project creation/funding and a Client priced-extension approval attach funds.

## Read-only collection

```bash
npm run check:runtime -- ADDRESS PROJECT_ID
npm run check:runtime -- ADDRESS PROJECT_ID TX_HASH
```

The helper outputs only selected fields. It does not sign, send funds, expose raw provider configuration, prove native delivery or mark the matrix PASS. Supply actual results before changing any pending status.

| Evidence | Current result |
| --- | --- |
| New deployment and byte/source parity | PENDING |
| Funded creation and contractor opt-in | NOT RUN |
| Expiry with escrow unchanged | NOT RUN |
| Cancellation with escrow unchanged | NOT RUN |
| Same-price replacement and exact acceptance | NOT RUN |
| Both withdrawal parents and native delivery | NOT RUN |

Authorization, stale IDs, scope/escrow pins, exact expiry boundaries, zero/full splits and replays are exercised locally. No further manual negative tests are necessary for the minimal runtime path unless a mismatch appears.
