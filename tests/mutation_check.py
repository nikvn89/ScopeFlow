"""
Mutation matrix for the v0.8.0 escrow and settlement offers in contracts/ScopeFlow.py.

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
import xml.etree.ElementTree as ET
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


# The two old pin mutants are now equivalent: _settlement_open independently
# enforces both pins. Exclude them rather than report them as killed.
MUTANTS = [m for m in MUTANTS if m[0] not in {"settlement_ignores_escrow_pin", "settlement_ignores_version_pin"}]
MUTANTS = [(name, old.replace('\n\n        self._wei_in_range(contractor_share_wei', '\n\n        if validity_seconds < self.MIN_SETTLEMENT_WINDOW_SECONDS or validity_seconds > self.MAX_SETTLEMENT_WINDOW_SECONDS:\n            raise gl.vm.UserError("Settlement validity is out of range")\n\n        self._wei_in_range(contractor_share_wei') if name == "settlement_before_acceptance" else old, new, all_) for name,old,new,all_ in MUTANTS]

OFFER_MUTANTS = [
 ("offer_no_min_window", 'validity_seconds < self.MIN_SETTLEMENT_WINDOW_SECONDS or validity_seconds > self.MAX_SETTLEMENT_WINDOW_SECONDS', 'validity_seconds > self.MAX_SETTLEMENT_WINDOW_SECONDS', False),
 ("offer_no_max_window", 'validity_seconds < self.MIN_SETTLEMENT_WINDOW_SECONDS or validity_seconds > self.MAX_SETTLEMENT_WINDOW_SECONDS', 'validity_seconds < self.MIN_SETTLEMENT_WINDOW_SECONDS', False),
 ("offer_expiry_inclusive", 'elif self._chain_unix() >= expires_at:', 'elif self._chain_unix() > expires_at:', False),
 ("offer_ignores_expiry", 'elif self._chain_unix() >= expires_at:', 'elif False:', False),
 ("offer_ignores_cancellation", 'elif bool(self.settlement_offer_cancelled.get(key, False)):', 'elif False:', False),
 ("offer_cancel_no_effect", 'self.settlement_offer_cancelled[key] = True', 'self.settlement_offer_cancelled[key] = False', False),
 ("offer_nonce_not_incremented", 'self.settlement_offer_ids.get(key, u256(0)) + u256(1)', 'u256(1)', False),
 ("offer_no_exact_id", 'if offer_id <= 0 or int(self.settlement_offer_ids.get(key, u256(0))) != offer_id:', 'if False:', True),
 ("offer_accepts_own_offer", 'other = "CONTRACTOR" if role == "CLIENT" else "CLIENT"', 'other = role', True),
 ("offer_no_open_gate", 'if not self._settlement_open(project_key, other):', 'if False:', False),
 ("offer_publication_matches", 'contractor_share_wei, validity_seconds, False)', 'contractor_share_wei, validity_seconds, True)', False),
 ("offer_wrong_accepted_id", 'self.project_settled_offer_ids[project_key] = u256(offer_id)', 'self.project_settled_offer_ids[project_key] = u256(0)', False),
 ("offer_wrong_proposer", 'self.project_settled_offer_roles[project_key] = other', 'self.project_settled_offer_roles[project_key] = role', True),
 ("offer_wrong_accept_split", 'share = u256(int(offer["contractor_share_wei"]))', 'share = u256(0)', False),
]



DELIVERY_MUTANTS = [
 ("delivery_no_client_proposal_gate", 'if self._party_role(pk) != "CLIENT":\n            raise gl.vm.UserError("Only client may propose milestones")', 'if False:\n            raise gl.vm.UserError("Only client may propose milestones")', False),
 ("delivery_no_contractor_accept_gate", 'if self._party_role(pk) != "CONTRACTOR":\n            raise gl.vm.UserError("Only contractor may accept milestones")', 'if False:\n            raise gl.vm.UserError("Only contractor may accept milestones")', False),
 ("delivery_overcommit", 'if budget > escrow - reserved:', 'if budget > escrow:', False),
 ("delivery_no_reservation", 'self.project_reserved_wei[pk] = u256(reserved + budget)', 'self.project_reserved_wei[pk] = u256(reserved)', False),
 ("delivery_no_scope_pin", 'if data["proposed_scope_version"] != int(self.project_versions.get(pk, u256(0))):', 'if False:', False),
 ("delivery_no_attempt_cap", 'if data["attempt_count"] >= self.MAX_DELIVERY_ATTEMPTS:', 'if False:', False),
 ("delivery_accepts_extra_model_fields", 'or len(data) != 1 or "decision" not in data:', 'or "decision" not in data:', False),
 ("delivery_no_exact_attempt", 'data["latest_attempt_id"] != attempt_id', 'False', True),
 ("delivery_pays_gaps", 'if attempt["decision"] != "DELIVERY_MATCHES":', 'if False:', False),
 ("delivery_keeps_escrow", 'self.project_escrow_wei[pk] = u256(escrow - budget)', 'self.project_escrow_wei[pk] = u256(escrow)', False),
 ("delivery_keeps_reservation", 'self.project_reserved_wei[pk] = u256(reserved - budget)', 'self.project_reserved_wei[pk] = u256(reserved)', False),
 ("delivery_underpays", 'self.project_contractor_due_wei.get(pk, u256(0)) + u256(budget)', 'self.project_contractor_due_wei.get(pk, u256(0))', False),
 ("delivery_payment_epoch_missing", 'self.project_payment_revisions.get(pk, u256(0)) + u256(1)', 'self.project_payment_revisions.get(pk, u256(0))', False),
 ("delivery_old_offers_revive", 'or self.settlement_payment_revisions.get(key, u256(0)) != self.project_payment_revisions.get(project_key, u256(0))', 'or False', False),
 ("delivery_close_votes_survive", 'self.project_contractor_close_vote_versions[pk] = u256(0)', 'pass', False),
 ("delivery_wrong_receipt_attempt", '"title": data["title"], "attempt_id": attempt_id, "amount_wei": str(budget)', '"title": data["title"], "attempt_id": 0, "amount_wei": str(budget)', False),
]

def run_suite(contract_path, suite):
    env = dict(os.environ, SCOPEFLOW_CONTRACT=str(contract_path))
    with tempfile.TemporaryDirectory() as td:
        report = Path(td) / 'result.xml'
        result = subprocess.run([sys.executable, '-m', 'pytest', str(suite), '-q', '-x', '-p', 'no:cacheprovider', '--junitxml='+str(report)], cwd=ROOT, env=env, capture_output=True, text=True)
        if not report.exists(): raise RuntimeError('No test report; cannot classify mutant')
        tree=ET.parse(report)
        suites=list(tree.getroot().iter('testsuite'))
        if result.returncode not in (0,1) or sum(int(t.get('errors','0')) for t in suites) or not sum(int(t.get('tests','0')) for t in suites):
            raise RuntimeError('Test infrastructure/collection error, not a killed mutant: '+result.stdout[-1500:]+result.stderr[-500:])
        return result.returncode == 0


def main():
    source=CONTRACT.read_text()
    for name,old,new,all_ in MUTANTS+OFFER_MUTANTS+DELIVERY_MUTANTS:
        count=source.count(old)
        if not count or (count>1 and not all_): raise RuntimeError(f'Invalid anchor {name}: {count}')
    if not run_suite(CONTRACT,ROOT/'tests/direct'): raise RuntimeError('Baseline fails')
    survivors=[]
    with tempfile.TemporaryDirectory() as tmp:
        for name,old,new,all_ in MUTANTS+OFFER_MUTANTS+DELIVERY_MUTANTS:
            path=Path(tmp)/'ScopeFlow.py'
            path.write_text(source.replace(old,new) if all_ else source.replace(old,new,1))
            suite=ROOT/'tests/direct/test_delivery.py' if name in {m[0] for m in DELIVERY_MUTANTS} else ROOT/'tests/direct/test_settlement_offers.py' if name in {m[0] for m in OFFER_MUTANTS} else SUITE
            passed=run_suite(path,suite)
            print(('SURVIVED' if passed else 'killed')+' '+name,flush=True)
            if passed:survivors.append(name)
    print(f'{len(MUTANTS)+len(OFFER_MUTANTS)+len(DELIVERY_MUTANTS)-len(survivors)}/{len(MUTANTS)+len(OFFER_MUTANTS)+len(DELIVERY_MUTANTS)} mutants killed',flush=True)
    return 1 if survivors else 0

if __name__ == '__main__':sys.exit(main())
