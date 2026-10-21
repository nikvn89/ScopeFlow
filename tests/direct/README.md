# GenVM Direct Mode suites

`test_escrow_direct.py` preserves the earlier escrow, pricing and lifecycle regression cases. `test_settlement_offers.py` adds v4 timed, cancellable, ID-bound settlement consent cases. Together: **71 passing cases** for contract 0.7.0.

The production contract runs through the real py-genlayer v0.2.16 SDK with real storage and transaction-datetime clock. Model responses are controlled; native transfers are recorded by recipient and amount. This verifies execution/accounting and does not prove real-model verdict accuracy, distributed network consensus, or asynchronous native delivery.

```bash
pip install -r requirements-test.txt
python -m pytest tests/direct -q -p no:cacheprovider
python tests/mutation_check.py
```

`SCOPEFLOW_CONTRACT=<path>` selects another contract copy. The mutation runner requires a passing baseline and valid collected tests; import/collection failures are invalid, not kills. See root TESTING.md for the executed gate summary and RUNTIME_TEST.md for pending network evidence.
