from __future__ import annotations

import copy
import datetime as dt
import hashlib
import importlib.util
import json
import re
import sys
import types
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "contracts" / "ScopeFlow.py"


class U256(int):
    pass


class TreeMap(dict):
    @classmethod
    def __class_getitem__(cls, _item):
        return cls


class Address(str):
    def __new__(cls, value: str):
        if not re.fullmatch(r"0x[a-fA-F0-9]{40}", value):
            raise ValueError("invalid address")
        return str.__new__(cls, value.lower())


class Contract:
    pass


class Return:
    def __init__(self, calldata):
        self.calldata = calldata


class UserError(Exception):
    pass


class Public:
    def write(self, fn):
        return fn

    def view(self, fn):
        return fn


class Nondet:
    decision = "SCOPE_EXTENSION"
    calls = 0

    @classmethod
    def exec_prompt(cls, _prompt, response_format=None):
        assert response_format == "json"
        cls.calls += 1
        return {"decision": cls.decision}


class VM:
    UserError = UserError
    Return = Return

    @staticmethod
    def run_nondet_unsafe(leader_fn, validator_fn):
        leader = leader_fn()
        if not validator_fn(Return(leader)):
            raise UserError("validator disagreement")
        return leader


message = types.SimpleNamespace(sender_address=Address("0x" + "11" * 20))
gl = types.SimpleNamespace(
    Contract=Contract,
    public=Public(),
    vm=VM,
    nondet=Nondet,
    message=message,
    message_raw={"datetime": "2026-09-13T00:00:00Z"},
)

genlayer = types.ModuleType("genlayer")
genlayer.gl = gl
genlayer.u256 = U256
genlayer.TreeMap = TreeMap
genlayer.Address = Address
genlayer.Keccak256 = hashlib.sha3_256
sys.modules["genlayer"] = genlayer

spec = importlib.util.spec_from_file_location("scopeflow_candidate", CONTRACT_PATH)
assert spec and spec.loader
candidate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(candidate)
ScopeGuard = candidate.ScopeGuard


CLIENT = Address("0x" + "11" * 20)
CONTRACTOR = Address("0x" + "22" * 20)
OUTSIDER = Address("0x" + "33" * 20)
BASE_TIME = 1_789_257_600
BASE_SCOPE = "Build a responsive website with home, pricing, and contact pages only."

checks = 0


def check(condition: bool, label: str) -> None:
    global checks
    if not condition:
        raise AssertionError(label)
    checks += 1
    print(f"PASS DIRECT {checks:02d}  {label}")


def iso(timestamp: int) -> str:
    return dt.datetime.fromtimestamp(timestamp, dt.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def fresh_contract():
    contract = ScopeGuard()
    for name in ScopeGuard.__annotations__:
        if name != "project_counter":
            setattr(contract, name, {})
    Nondet.decision = "SCOPE_EXTENSION"
    Nondet.calls = 0
    return contract


def snapshot(contract):
    state = {}
    for name in ScopeGuard.__annotations__:
        state[name] = copy.deepcopy(getattr(contract, name))
    return state


def restore(contract, state) -> None:
    for name, value in state.items():
        setattr(contract, name, value)


def transact(contract, sender, timestamp, method, *args):
    before = snapshot(contract)
    gl.message.sender_address = Address(str(sender))
    gl.message_raw = {"datetime": iso(timestamp)}
    try:
        return getattr(contract, method)(*args)
    except Exception:
        restore(contract, before)
        raise


def expect_error(contract, sender, timestamp, method, args, message_text):
    before = snapshot(contract)
    try:
        transact(contract, sender, timestamp, method, *args)
    except UserError as exc:
        check(message_text in str(exc), f"{method} rejects with {message_text}")
        check(snapshot(contract) == before, f"{method} failure rolls back all state")
        return
    raise AssertionError(f"{method} unexpectedly succeeded")


def read_project(contract, project_id, timestamp):
    gl.message_raw = {"datetime": iso(timestamp)}
    return json.loads(contract.get_project(project_id))


def read_request(contract, project_id, request_id):
    return json.loads(contract.get_request(project_id, request_id))


contract = fresh_contract()

# Config and preserved default create path.
registry = json.loads(contract.get_registry())
check(registry["contract_version"] == "0.5.0", "registry exposes candidate version")
check(registry["lifecycle_finality"] is True, "registry advertises lifecycle finality")
check(registry["default_acceptance_window_seconds"] == 604800, "default window is seven days")
check(registry["min_acceptance_window_seconds"] == 300, "minimum window is five minutes")
check(registry["max_acceptance_window_seconds"] == 2592000, "maximum window is thirty days")

# Preserve the non-zero seconds component exactly when deriving timestamps and
# acceptance deadlines from the deterministic chain datetime.
clock_contract = fresh_contract()
transact(
    clock_contract,
    CLIENT,
    BASE_TIME + 17,
    "create_project_with_window",
    CONTRACTOR,
    BASE_SCOPE,
    300,
)
clock_project = read_project(clock_contract, 1, BASE_TIME + 17)
check(clock_project["created_at"] == BASE_TIME + 17, "chain time preserves non-zero seconds")
check(clock_project["acceptance_deadline"] == BASE_TIME + 317, "deadline counts seconds exactly once")

transact(contract, CLIENT, BASE_TIME, "create_project", CONTRACTOR, BASE_SCOPE)
p1 = read_project(contract, 1, BASE_TIME)
check(p1["status"] == "PENDING_CONTRACTOR_ACCEPTANCE", "default project starts pending")
check(p1["acceptance_deadline"] == BASE_TIME + 604800, "default deadline is deterministic")
check(p1["scope_version_count"] == 0, "pending project has no effective ledger snapshot")

before_semantic = Nondet.calls
expect_error(contract, OUTSIDER, BASE_TIME + 1, "accept_project", (1,), "Only project parties")
transact(contract, CONTRACTOR, BASE_TIME + 2, "accept_project", 1)
check(Nondet.calls == before_semantic, "acceptance uses no semantic evaluation")
p1 = read_project(contract, 1, BASE_TIME + 2)
check(p1["status"] == "ACTIVE", "contractor acceptance activates project")
check(p1["scope_version_count"] == 1, "acceptance creates V1")

# A close vote is pinned to the exact active scope version.
before_semantic = Nondet.calls
transact(contract, CLIENT, BASE_TIME + 3, "approve_close", 1)
p1 = read_project(contract, 1, BASE_TIME + 3)
check(p1["client_close_approved"] is True, "client close vote recorded at V1")
check(p1["closed"] is False, "one close vote cannot close project")
check(Nondet.calls == before_semantic, "close voting uses no semantic evaluation")
expect_error(contract, CLIENT, BASE_TIME + 4, "approve_close", (1,), "Client already approved close")
expect_error(contract, OUTSIDER, BASE_TIME + 4, "approve_close", (1,), "Only project parties")

Nondet.decision = "SCOPE_EXTENSION"
transact(
    contract,
    CLIENT,
    BASE_TIME + 20,
    "submit_request",
    1,
    "Add customer authentication with email sign-in and protected account pages.",
)
transact(contract, CONTRACTOR, BASE_TIME + 21, "approve_extension", 1, 1)
transact(contract, CLIENT, BASE_TIME + 22, "approve_extension", 1, 1)
p1 = read_project(contract, 1, BASE_TIME + 22)
check(p1["active_scope_version"] == 2, "approved extension advances to V2")
check(p1["client_close_approved"] is False, "V1 client close vote is stale at V2")

transact(
    contract,
    CONTRACTOR,
    BASE_TIME + 40,
    "submit_request",
    1,
    "Add exportable operational reports for administrators.",
)
semantic_after_requests = Nondet.calls
transact(contract, CONTRACTOR, BASE_TIME + 41, "approve_close", 1)
p1 = read_project(contract, 1, BASE_TIME + 41)
check(p1["closed"] is False, "current contractor vote cannot combine with stale client vote")
check(p1["contractor_close_approved"] is True, "contractor close vote is pinned to V2")
check(Nondet.calls == semantic_after_requests, "current-version close vote remains deterministic")

transact(contract, CLIENT, BASE_TIME + 42, "approve_close", 1)
p1 = read_project(contract, 1, BASE_TIME + 42)
check(p1["status"] == "CLOSED", "matching V2 close votes close project")
check(p1["terminal"] is True, "closed project is terminal")
check(p1["closed_scope_version"] == 2, "close freezes exact final scope version")
check(p1["closed_at"] == BASE_TIME + 42, "close timestamp comes from chain time")
check(read_request(contract, 1, 2)["status"] == "PROJECT_CLOSED", "pending request terminalizes on close")

frozen_ledger = json.loads(contract.get_scope_versions(1, 1, 20))
expect_error(contract, CLIENT, BASE_TIME + 43, "approve_close", (1,), "Project already closed")
expect_error(
    contract,
    CLIENT,
    BASE_TIME + 44,
    "submit_request",
    (1, "Add another deliverable after closure."),
    "Project closed",
)
expect_error(contract, CLIENT, BASE_TIME + 44, "approve_extension", (1, 2), "Project closed")
expect_error(contract, CONTRACTOR, BASE_TIME + 44, "reject_extension", (1, 2), "Project closed")
check(json.loads(contract.get_scope_versions(1, 1, 20)) == frozen_ledger, "closed ledger remains immutable")

# Client cancellation is terminal and timestamped.
transact(contract, CLIENT, BASE_TIME + 100, "create_project_with_window", CONTRACTOR, BASE_SCOPE, 600)
semantic_before_cancel = Nondet.calls
transact(contract, CLIENT, BASE_TIME + 110, "cancel_project", 2)
p2 = read_project(contract, 2, BASE_TIME + 110)
check(p2["status"] == "CANCELLED", "client cancellation creates terminal state")
check(p2["cancelled_at"] == BASE_TIME + 110, "cancellation records chain time")
check(Nondet.calls == semantic_before_cancel, "cancellation uses no semantic evaluation")
expect_error(contract, CLIENT, BASE_TIME + 111, "cancel_project", (2,), "already cancelled")
expect_error(contract, CONTRACTOR, BASE_TIME + 111, "accept_project", (2,), "Project cancelled")
expect_error(contract, CONTRACTOR, BASE_TIME + 111, "decline_project", (2,), "Project cancelled")
expect_error(contract, OUTSIDER, BASE_TIME + 700, "expire_project", (2,), "Project cancelled")

# Contractor decline is terminal.
transact(contract, CLIENT, BASE_TIME + 200, "create_project_with_window", CONTRACTOR, BASE_SCOPE, 600)
semantic_before_decline = Nondet.calls
transact(contract, CONTRACTOR, BASE_TIME + 210, "decline_project", 3)
p3 = read_project(contract, 3, BASE_TIME + 210)
check(p3["status"] == "DECLINED", "contractor decline creates terminal state")
check(p3["declined_at"] == BASE_TIME + 210, "decline records chain time")
check(Nondet.calls == semantic_before_decline, "decline uses no semantic evaluation")
expect_error(contract, CONTRACTOR, BASE_TIME + 211, "decline_project", (3,), "already declined")
expect_error(contract, CONTRACTOR, BASE_TIME + 211, "accept_project", (3,), "Project declined")
expect_error(contract, CLIENT, BASE_TIME + 211, "cancel_project", (3,), "Project declined")
expect_error(contract, OUTSIDER, BASE_TIME + 900, "expire_project", (3,), "Project declined")

# Deadline boundary and permissionless expiry.
transact(contract, CLIENT, BASE_TIME + 300, "create_project_with_window", CONTRACTOR, BASE_SCOPE, 300)
deadline = BASE_TIME + 600
expect_error(contract, OUTSIDER, deadline - 1, "expire_project", (4,), "still open")
p4 = read_project(contract, 4, deadline)
check(p4["status"] == "EXPIRED", "deadline derives expired status before materialization")
check(p4["expiry_recorded"] is False, "derived expiry is distinguishable from recorded expiry")
check(p4["expired_at"] == deadline, "derived expiry uses exact deadline")
expect_error(contract, CONTRACTOR, deadline, "accept_project", (4,), "Acceptance window expired")
expect_error(contract, CLIENT, deadline, "cancel_project", (4,), "Acceptance window expired")
expect_error(contract, CONTRACTOR, deadline, "decline_project", (4,), "Acceptance window expired")
semantic_before_expiry = Nondet.calls
transact(contract, OUTSIDER, deadline, "expire_project", 4)
p4 = read_project(contract, 4, deadline)
check(p4["status"] == "EXPIRED", "permissionless expiry materializes terminal state")
check(p4["expiry_recorded"] is True, "expiry materialization is recorded")
check(p4["expired_at"] == deadline, "materialized expiry records chain time")
check(Nondet.calls == semantic_before_expiry, "expiry uses no semantic evaluation")
expect_error(contract, OUTSIDER, deadline + 1, "expire_project", (4,), "already expired")

# Acceptance remains valid through the final second before the deadline.
transact(contract, CLIENT, BASE_TIME + 1100, "create_project_with_window", CONTRACTOR, BASE_SCOPE, 300)
p5_deadline = BASE_TIME + 1400
transact(contract, CONTRACTOR, p5_deadline - 1, "accept_project", 5)
p5 = read_project(contract, 5, p5_deadline)
check(p5["status"] == "ACTIVE", "acceptance succeeds one second before deadline")
expect_error(contract, OUTSIDER, p5_deadline, "expire_project", (5,), "Accepted project cannot expire")

# Production approval code preserves atomic rollback on capacity overflow.
near_capacity_scope = "S" * 5900
transact(
    contract,
    CLIENT,
    BASE_TIME + 1500,
    "create_project_with_window",
    CONTRACTOR,
    near_capacity_scope,
    600,
)
transact(contract, CONTRACTOR, BASE_TIME + 1501, "accept_project", 6)
Nondet.decision = "SCOPE_EXTENSION"
transact(
    contract,
    CLIENT,
    BASE_TIME + 1520,
    "submit_request",
    6,
    "Add a material deliverable that consumes more than the remaining scope capacity.",
)
transact(contract, CONTRACTOR, BASE_TIME + 1521, "approve_extension", 6, 1)
expect_error(contract, CLIENT, BASE_TIME + 1522, "approve_extension", (6, 1), "Scope capacity exceeded")
p6 = read_project(contract, 6, BASE_TIME + 1522)
r6 = read_request(contract, 6, 1)
check(p6["active_scope_version"] == 1, "capacity failure creates no phantom scope version")
check(p6["scope_version_count"] == 1, "capacity failure creates no phantom ledger snapshot")
check(r6["contractor_approved"] is True, "first approval remains recorded")
check(r6["client_approved"] is False, "overflow-triggering approval rolls back")
check(r6["applied"] is False, "capacity failure cannot mark extension applied")

# Invalid semantic output fails closed before request/counter/cache writes.
transact(contract, CLIENT, BASE_TIME + 1700, "create_project_with_window", CONTRACTOR, BASE_SCOPE, 600)
transact(contract, CONTRACTOR, BASE_TIME + 1701, "accept_project", 7)
cache_size_before = len(contract.evaluation_cache)
Nondet.decision = "NOT_A_VALID_DECISION"
expect_error(
    contract,
    CLIENT,
    BASE_TIME + 1720,
    "submit_request",
    (7, "Add an entirely new integration that requires semantic classification."),
    "Semantic evaluation failed",
)
p7 = read_project(contract, 7, BASE_TIME + 1720)
check(p7["request_count"] == 0, "semantic failure creates no request")
check(len(contract.evaluation_cache) == cache_size_before, "semantic failure creates no cache entry")

# Invalid custom windows fail before project-counter writes.
project_count_before = int(contract.project_counter)
expect_error(
    contract,
    CLIENT,
    BASE_TIME + 1000,
    "create_project_with_window",
    (CONTRACTOR, BASE_SCOPE, 299),
    "between 300 and 2592000",
)
expect_error(
    contract,
    CLIENT,
    BASE_TIME + 1000,
    "create_project_with_window",
    (CONTRACTOR, BASE_SCOPE, 2592001),
    "between 300 and 2592000",
)
check(int(contract.project_counter) == project_count_before, "invalid windows create no phantom projects")

sha = hashlib.sha256(CONTRACT_PATH.read_bytes()).hexdigest()
print(f"\nProduction contract SHA256: {sha}")
print(f"{checks}/{checks} direct production-contract checks passed")
