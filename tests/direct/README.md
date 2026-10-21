# GenVM Direct Mode suites

- `test_escrow_direct.py`: 38 earlier escrow, pricing and lifecycle cases.
- `test_settlement_offers.py`: 33 v4 timed, revocable settlement cases.
- `test_delivery.py`: 58 v5 delivery, reservations, staged payments and interactions.

All 129 cases run the production `contracts/ScopeFlow.py` through the real
py-genlayer v0.2.16 SDK. Model answers are controlled fixtures. Native transfers
use a recipient/amount recorder. These tests do not prove live model accuracy,
distributed consensus or asynchronous native delivery.

```bash
pip install -r requirements-test.txt
python -m pytest tests/direct -q -p no:cacheprovider
python scripts/compact-contract.py --check
SCOPEFLOW_CONTRACT=deploy/ScopeFlow.py python -m pytest tests/direct -q -p no:cacheprovider
python tests/mutation_check.py
```

`SCOPEFLOW_CONTRACT=<path>` selects a contract copy. The mutation runner first
requires a passing baseline and checks source anchors. Collection/import errors,
missing reports and zero collected tests are invalid, never killed mutants.
See root TESTING.md for results and RUNTIME_TEST.md for pending live work.

The compact Studio artifact has the same 129 passing cases; canonical private-test probe names used by this suite are preserved.
