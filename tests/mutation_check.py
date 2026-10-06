"""
Mutation matrix for the v0.6.0 escrow in contracts/ScopeFlow.py.

Each mutant is one deliberate fault. The GenVM Direct Mode suite
(tests/direct/test_escrow_direct.py) runs against every mutant and must fail on
each one; a surviving mutant is a behaviour the suite does not pin down.

Run:  python tests/mutation_check.py
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "ScopeFlow.py"
SUITE = ROOT / "tests" / "direct" / "test_escrow_direct.py"

# (name, old, new, replace_all)
MUTANTS = [
    # --- funding
    ("create_ignores_deposit",
     "        self._add_escrow(project_key, gl.message.value)\n\n        client_key",
     "        client_key", False),
    ("escrow_cap_dropped",
     '        if int(updated) > MAX_ESCROW_WEI:\n            raise gl.vm.UserError("Escrow is out of range")',
     "        pass", False),
    ("fund_without_client_gate",
     'if self._party_role(project_key) != "CLIENT":\n            raise gl.vm.UserError("Only the client may fund")',
     'if False:\n            raise gl.vm.UserError("Only the client may fund")', False),
    ("fund_accepts_zero",
     "if gl.message.value == u256(0):", "if False:", False),
    ("fund_after_close",
     '        if bool(self.project_closed.get(project_key, False)):\n            raise gl.vm.UserError("Project closed")\n\n        if not bool(self.project_accepted.get(project_key, False)):\n            deadline',
     '        if not bool(self.project_accepted.get(project_key, False)):\n            deadline', False),
    ("fund_after_window",
     "            if self._chain_unix() >= deadline:\n                raise gl.vm.UserError(\"Acceptance window expired\")\n\n        self._add_escrow(project_key, gl.message.value)",
     "            pass\n\n        self._add_escrow(project_key, gl.message.value)", False),
    ("fund_not_credited",
     '                raise gl.vm.UserError("Acceptance window expired")\n\n        self._add_escrow(project_key, gl.message.value)',
     '                raise gl.vm.UserError("Acceptance window expired")\n', False),
    # --- refunds
    ("cancel_keeps_escrow",
     "        self.project_cancelled_at[project_key] = u256(now)\n        self._refund_escrow_to_client(project_key)",
     "        self.project_cancelled_at[project_key] = u256(now)", False),
    ("decline_keeps_escrow",
     "        self.project_declined_at[project_key] = u256(now)\n        self._refund_escrow_to_client(project_key)",
     "        self.project_declined_at[project_key] = u256(now)", False),
    ("expire_keeps_escrow",
     "        self.project_expired_at[project_key] = u256(now)\n        self._refund_escrow_to_client(project_key)",
     "        self.project_expired_at[project_key] = u256(now)", False),
    ("refund_does_not_zero_escrow",
     "        self.project_client_due_wei[project_key] = due + escrow\n        self.project_escrow_wei[project_key] = u256(0)",
     "        self.project_client_due_wei[project_key] = due + escrow", False),
    # --- release
    ("close_does_not_release",
     "            self._release_escrow(\n                project_key,\n                self.project_escrow_wei.get(project_key, u256(0)),\n            )",
     "            pass", False),
    ("release_pays_client_instead",
     "        self.project_contractor_due_wei[project_key] = contractor_due + contractor_share\n        self.project_client_due_wei[project_key] = client_due + (escrow - contractor_share)",
     "        self.project_contractor_due_wei[project_key] = contractor_due + (escrow - contractor_share)\n        self.project_client_due_wei[project_key] = client_due + contractor_share", False),
    ("release_keeps_escrow",
     "        self.project_client_due_wei[project_key] = client_due + (escrow - contractor_share)\n        self.project_escrow_wei[project_key] = u256(0)",
     "        self.project_client_due_wei[project_key] = client_due + (escrow - contractor_share)", False),
    ("release_not_marked_settled",
     "        self.project_settled[project_key] = True", "        pass", False),
    # --- withdraw
    ("withdraw_zero_gate_dropped",
     '            amount = self.project_client_due_wei.get(project_key, u256(0))\n            if amount == u256(0):\n                raise gl.vm.UserError("Nothing to withdraw")',
     '            amount = self.project_client_due_wei.get(project_key, u256(0))\n            if False:\n                raise gl.vm.UserError("Nothing to withdraw")', False),
    ("withdraw_keeps_client_due",
     "            self.project_client_due_wei[project_key] = u256(0)\n            refunded",
     "            refunded", False),
    ("withdraw_keeps_contractor_due",
     "            self.project_contractor_due_wei[project_key] = u256(0)\n            paid",
     "            paid", False),
    ("withdraw_not_recorded_as_paid",
     "            self.project_contractor_paid_wei[project_key] = paid + amount", "            pass", False),
    ("contractor_withdraw_pays_client",
     '            recipient = self.project_contractors.get(project_key, "")',
     '            recipient = self.project_clients.get(project_key, "")', False),
    # --- priced extensions
    ("price_kept_for_in_scope_work",
     "            price_wei if classification == SCOPE_EXTENSION else 0",
     "            price_wei", False),
    ("price_range_dropped",
     "        if amount < 0 or amount > MAX_ESCROW_WEI:\n            raise gl.vm.UserError(message)",
     "        if amount < 0:\n            raise gl.vm.UserError(message)", False),
    ("client_approval_any_value",
     "            if gl.message.value != price:", "            if False:", False),
    ("deposit_not_recorded",
     "            self.request_deposit_wei[request_key] = price\n", "", False),
    ("contractor_may_send_value",
     "            if gl.message.value != u256(0):", "            if False:", False),
    ("applied_price_not_added_to_escrow",
     "            self._add_escrow(project_key, deposit)", "            pass", False),
    ("applied_deposit_not_cleared",
     "            deposit = self.request_deposit_wei.get(request_key, u256(0))\n            self.request_deposit_wei[request_key] = u256(0)",
     "            deposit = self.request_deposit_wei.get(request_key, u256(0))", False),
    # --- deposit reclaim
    ("reclaim_without_client_gate",
     'if self._party_role(project_key) != "CLIENT":\n            raise gl.vm.UserError("Only the client may reclaim a deposit")',
     'if False:\n            raise gl.vm.UserError("Only the client may reclaim a deposit")', False),
    ("reclaim_live_deposit",
     'if status == "AWAITING_APPROVAL":', "if False:", False),
    ("reclaim_twice",
     "        if deposit == u256(0):\n            raise gl.vm.UserError(\"No deposit to reclaim\")",
     "        if False:\n            raise gl.vm.UserError(\"No deposit to reclaim\")", False),
    ("reclaim_not_cleared",
     "        self.request_deposit_wei[request_key] = u256(0)\n        self.request_deposit_returned[request_key] = True",
     "        self.request_deposit_returned[request_key] = True", False),
    # --- settlement
    ("settlement_over_escrow",
     "        if share > escrow:\n            raise gl.vm.UserError(\"Settlement exceeds the escrow\")",
     "        if False:\n            raise gl.vm.UserError(\"Settlement exceeds the escrow\")", False),
    ("settlement_ignores_share_match",
     "            and self.project_client_settlement_share.get(project_key, u256(0))\n            == self.project_contractor_settlement_share.get(project_key, u256(0))\n",
     "", False),
    ("settlement_ignores_escrow_pin",
     "            and self.project_client_settlement_escrow.get(project_key, u256(0)) == escrow\n            and self.project_contractor_settlement_escrow.get(project_key, u256(0)) == escrow\n",
     "", False),
    ("settlement_ignores_version_pin",
     "            and self.project_client_settlement_version.get(project_key, u256(0)) == version\n            and self.project_contractor_settlement_version.get(project_key, u256(0)) == version\n",
     "", False),
    ("settlement_before_acceptance",
     "        if not bool(self.project_accepted.get(project_key, False)):\n            raise gl.vm.UserError(\"Project is not active\")\n\n        self._wei_in_range(contractor_share_wei",
     "        self._wei_in_range(contractor_share_wei", False),
    ("settlement_does_not_close",
     "            self.project_closed[project_key] = True\n            self.project_closed_at[project_key] = u256(now)\n            self.project_closed_versions[project_key] = version",
     "            self.project_closed_at[project_key] = u256(now)\n            self.project_closed_versions[project_key] = version", False),
    ("duplicate_proposal_allowed",
     '                raise gl.vm.UserError("Settlement already proposed")\n            self.project_client_settlement_set',
     '                pass\n            self.project_client_settlement_set', False),
    # --- fence
    ("fence_case_sensitive", "cleaned.upper().find(token)", "cleaned.find(token)", True),
    ("fence_without_gap",
     '                        cleaned[:index]\n                        + " "\n                        + cleaned[index + len(token):]',
     '                        cleaned[:index]\n                        + cleaned[index + len(token):]', False),
]


def run_suite(contract_path: Path) -> bool:
    env = dict(os.environ, SCOPEFLOW_CONTRACT=str(contract_path))
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(SUITE), "-q", "-x", "-p", "no:cacheprovider"],
        cwd=ROOT, env=env, capture_output=True, text=True,
    )
    return result.returncode == 0


def main() -> int:
    source = CONTRACT.read_text()
    if not run_suite(CONTRACT):
        print("baseline suite fails; fix it before running mutants")
        return 1
    survivors = []
    with tempfile.TemporaryDirectory() as tmp:
        for name, old, new, replace_all in MUTANTS:
            count = source.count(old)
            if count == 0 or (count > 1 and not replace_all):
                print(f"anchor problem in {name}: found {count} times")
                return 1
            mutated = source.replace(old, new) if replace_all else source.replace(old, new, 1)
            path = Path(tmp) / "ScopeFlow.py"
            path.write_text(mutated)
            passed = run_suite(path)
            print(f"{'SURVIVED' if passed else 'killed  '}  {name}")
            if passed:
                survivors.append(name)
    killed = len(MUTANTS) - len(survivors)
    print(f"\n{killed}/{len(MUTANTS)} mutants killed")
    return 1 if survivors else 0


if __name__ == "__main__":
    sys.exit(main())
