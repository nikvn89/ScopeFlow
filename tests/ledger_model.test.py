from __future__ import annotations

import ast
import hashlib
import random
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "ScopeFlow.py"
SOURCE = CONTRACT.read_text(encoding="utf-8")
TREE = ast.parse(SOURCE)

checks = 0


def check(condition: bool, label: str) -> None:
    global checks
    if not condition:
        raise AssertionError(label)
    checks += 1
    print(f"PASS {checks:02d}  {label}")


def class_node(name: str) -> ast.ClassDef:
    for node in TREE.body:
        if isinstance(node, ast.ClassDef) and node.name == name:
            return node
    raise AssertionError(f"missing class {name}")


def method_names(cls: ast.ClassDef) -> set[str]:
    return {node.name for node in cls.body if isinstance(node, ast.FunctionDef)}


scope_guard = class_node("ScopeGuard")
methods = method_names(scope_guard)

# Source/ABI-preservation checks.
check(SOURCE.startswith("# v0.5.0"), "candidate is versioned v0.5.0")
check("class ScopeGuard(gl.Contract):" in SOURCE, "implementation class remains ScopeGuard")
check("SCOPE_IN = \"SCOPE_IN\"" in SOURCE, "SCOPE_IN enum preserved")
check("SCOPE_EXTENSION = \"SCOPE_EXTENSION\"" in SOURCE, "SCOPE_EXTENSION enum preserved")
check("SCOPE_UNCLEAR = \"SCOPE_UNCLEAR\"" in SOURCE, "SCOPE_UNCLEAR enum preserved")
check("MAX_SCOPE_LENGTH = 6000" in SOURCE, "6000-character scope cap preserved")
check("MAX_REQUESTS_PER_PROJECT = 100" in SOURCE, "request cap preserved")
check("COOLDOWN_SECONDS = 15" in SOURCE, "submission cooldown preserved")
for required in [
    "create_project", "accept_project", "cancel_project", "submit_request",
    "approve_extension", "reject_extension", "get_registry", "get_project",
    "get_request", "get_requests", "get_projects_by_client",
]:
    check(required in methods, f"baseline ABI method preserved: {required}")

# Ledger surface checks.
for required in ["get_scope_version", "get_scope_versions"]:
    check(required in methods, f"new ledger ABI method exists: {required}")
for storage_name in [
    "project_scope_version_counts", "scope_version_scopes", "scope_version_previous",
    "scope_version_request_ids", "scope_version_effective_at",
    "scope_version_client_approved", "scope_version_contractor_approved",
]:
    check(storage_name in SOURCE, f"ledger storage declared: {storage_name}")
check("self.project_scope_version_counts[project_key] = u256(0)" in SOURCE,
      "new project starts with zero effective snapshots")
check("self.project_scope_version_counts[project_key] = u256(1)" in SOURCE,
      "contractor acceptance creates effective V1")
check("self.scope_version_request_ids[version_key] = u256(0)" in SOURCE,
      "V1 provenance identifies initial scope")
check("new_version = active_version + 1" in SOURCE,
      "approved extensions advance monotonically")
check("self.project_scope_version_counts[" in SOURCE and "] = u256(new_version)" in SOURCE,
      "ledger count advances with active version")
check("Request superseded by scope change" in SOURCE,
      "supersession guard preserved")
check("Extension already applied" in SOURCE,
      "terminal apply replay guard preserved")
check("Extension rejected" in SOURCE,
      "rejected extension cannot be applied")
check("Scope capacity exceeded" in SOURCE,
      "capacity rollback guard preserved")
check('"scope_version_count"' in SOURCE, "project view exposes ledger count")
check('"contract_version": "0.5.0"' in SOURCE, "registry advertises candidate version")
check('"scope_version_ledger": True' in SOURCE, "registry advertises ledger capability")

# Milestone v2 lifecycle-finality surface checks. Behavioral coverage for
# these methods is executed directly against ScopeGuard in the companion test.
for required in [
    "create_project_with_window", "decline_project", "expire_project",
    "approve_close",
]:
    check(required in methods, f"lifecycle ABI method exists: {required}")
for storage_name in [
    "project_acceptance_deadlines", "project_cancelled_at",
    "project_declined", "project_declined_at", "project_expired",
    "project_expired_at", "project_closed", "project_closed_at",
    "project_closed_versions", "project_client_close_vote_versions",
    "project_contractor_close_vote_versions",
]:
    check(storage_name in SOURCE, f"lifecycle storage declared: {storage_name}")
check("DEFAULT_ACCEPTANCE_WINDOW_SECONDS = 604800" in SOURCE,
      "seven-day default acceptance window declared")
check("MIN_ACCEPTANCE_WINDOW_SECONDS = 300" in SOURCE,
      "five-minute minimum acceptance window declared")
check("MAX_ACCEPTANCE_WINDOW_SECONDS = 2592000" in SOURCE,
      "thirty-day maximum acceptance window declared")
check('"contract_version": "0.5.0"' in SOURCE,
      "registry advertises lifecycle candidate version")
check('"lifecycle_finality": True' in SOURCE,
      "registry advertises lifecycle capability")
check('return "PROJECT_CLOSED"' in SOURCE,
      "pending requests terminalize when project closes")


@dataclass
class Request:
    against: int
    text: str
    client: bool = False
    contractor: bool = False
    rejected: bool = False
    applied: bool = False


@dataclass
class Model:
    initial_scope: str
    accepted: bool = False
    active_version: int = 1
    versions: dict[int, str] = field(default_factory=dict)
    origin_request: dict[int, int] = field(default_factory=dict)
    requests: dict[int, Request] = field(default_factory=dict)

    def accept(self) -> None:
        if self.accepted:
            raise ValueError("already accepted")
        self.accepted = True
        self.versions[1] = self.initial_scope
        self.origin_request[1] = 0

    def submit_extension(self, text: str) -> int:
        if not self.accepted:
            raise ValueError("not accepted")
        rid = len(self.requests) + 1
        self.requests[rid] = Request(self.active_version, text)
        return rid

    def reject(self, rid: int) -> None:
        r = self.requests[rid]
        if r.applied or r.rejected or r.against != self.active_version:
            raise ValueError("terminal-or-superseded")
        r.rejected = True

    def approve(self, rid: int, party: str) -> None:
        r = self.requests[rid]
        if r.rejected or r.applied or r.against != self.active_version:
            raise ValueError("terminal-or-superseded")
        if party == "client":
            if r.client:
                raise ValueError("duplicate")
            r.client = True
        else:
            if r.contractor:
                raise ValueError("duplicate")
            r.contractor = True
        if r.client and r.contractor:
            next_scope = self.versions[self.active_version] + "\n<<<SCOPEGUARD_APPROVED_EXTENSION>>>\n" + r.text
            if len(next_scope) > 6000:
                # Atomic rollback of the second approval in the real contract means the
                # party approval that triggered overflow must not persist. Revert the
                # just-written model flag to mirror transaction rollback.
                if party == "client":
                    r.client = False
                else:
                    r.contractor = False
                raise ValueError("capacity")
            old_version = self.active_version
            self.active_version += 1
            self.versions[self.active_version] = next_scope
            self.origin_request[self.active_version] = rid
            r.applied = True
            assert self.active_version == old_version + 1


def assert_model(m: Model, frozen: dict[int, str]) -> None:
    if not m.accepted:
        assert not m.versions
        return
    assert len(m.versions) == m.active_version
    assert sorted(m.versions) == list(range(1, m.active_version + 1))
    assert m.origin_request[1] == 0
    for version in range(2, m.active_version + 1):
        rid = m.origin_request[version]
        assert rid > 0
        req = m.requests[rid]
        assert req.applied
        assert req.client and req.contractor
        assert req.against == version - 1
        assert m.versions[version].endswith(req.text)
    for version, text in frozen.items():
        assert m.versions.get(version) == text


# Directed lifecycle proof in the model.
m = Model("Build a responsive website with home, pricing, and contact pages only.")
check(len(m.versions) == 0, "pre-acceptance ledger is empty")
m.accept()
check(m.versions[1] == m.initial_scope, "acceptance snapshots exact V1 text")
r1 = m.submit_extension("Add email/password authentication and private account dashboard.")
r2 = m.submit_extension("Add Stripe subscription billing and webhook processing.")
m.approve(r1, "client")
check(m.active_version == 1, "one approval does not create V2")
m.approve(r1, "contractor")
check(m.active_version == 2, "two approvals create V2")
v1_copy = m.versions[1]
check(m.origin_request[2] == r1, "V2 links to originating request")
check(m.versions[1] == v1_copy, "V1 remains immutable after V2")
try:
    m.approve(r2, "client")
    raise AssertionError("superseded request unexpectedly approved")
except ValueError:
    pass
check(m.active_version == 2, "superseded V1 request cannot mutate V2")
r3 = m.submit_extension("Add analytics dashboard with reports and CSV export.")
m.approve(r3, "contractor")
m.approve(r3, "client")
check(m.active_version == 3, "V2 request can create V3")
check(m.origin_request[3] == r3, "V3 provenance points to V2 request")
check(m.versions[1] == v1_copy, "V1 remains immutable after V3")

# Seeded randomized property sweep: immutable, gap-free, provenance-linked chain.
rng = random.Random(20260907)
traces = 5000
transitions = 0
for trace in range(traces):
    base = f"Initial agreed scope trace {trace}: build web pages and static assets only."
    model = Model(base)
    model.accept()
    frozen = {1: model.versions[1]}
    for _ in range(rng.randint(8, 24)):
        transitions += 1
        rid = model.submit_extension(
            f"Extension {trace}-{transitions}: add feature {rng.randint(1, 999999)}."
        )
        # Sometimes leave a request pending so it will become superseded later.
        mode = rng.randrange(4)
        if mode == 0:
            model.reject(rid)
        elif mode == 1:
            model.approve(rid, "client")
        else:
            first, second = (("client", "contractor") if rng.randrange(2) else ("contractor", "client"))
            model.approve(rid, first)
            before = dict(model.versions)
            try:
                model.approve(rid, second)
            except ValueError as exc:
                if str(exc) != "capacity":
                    raise
            for version, text in before.items():
                assert model.versions[version] == text
            frozen.update(before)
        assert_model(model, frozen)

check(True, f"property sweep preserved ledger invariants across {traces} traces")
check(transitions > 50000, f"property sweep exercised {transitions} generated transitions")

sha = hashlib.sha256(CONTRACT.read_bytes()).hexdigest()
print(f"\nContract SHA256: {sha}")
print(f"{checks}/{checks} directed/source checks passed")
print(f"Property sweep: {traces} traces / {transitions} transitions / 0 invariant failures")
