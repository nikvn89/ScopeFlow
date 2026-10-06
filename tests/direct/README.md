# GenVM Direct Mode — escrow suite

`test_escrow_direct.py` runs `contracts/ScopeFlow.py` inside the real py-genlayer v0.2.16 SDK (genlayer-test Direct Mode): real storage, the transaction-datetime clock, and the real leader and validator functions of the classification. The model answer is mocked, and the native-transfer interface is replaced by a recorder so each payout is checked by recipient and amount.

```bash
pip install -r requirements-test.txt
python -m pytest tests/direct -q -p no:cacheprovider
python tests/mutation_check.py
```

`SCOPEFLOW_CONTRACT=<path>` runs the suite against another copy of the contract (the mutation matrix uses this).
