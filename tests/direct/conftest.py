"""Shared helpers for the GenVM Direct Mode suite (contracts/ScopeFlow.py, v0.6.0)."""

import datetime as dt
import json
import os
import sys
from pathlib import Path

import pytest
from gltest.direct.loader import create_address

ROOT = Path(__file__).resolve().parents[2]
CONTRACT = os.environ.get("SCOPEFLOW_CONTRACT") or str(ROOT / "contracts" / "ScopeFlow.py")
GENVM_VERSION = os.environ.get("GENVM_VERSION", "v0.2.16")

GEN = 10**18
T0 = 1_791_288_000  # 2026-10-06T12:00:00Z
SCOPE = "Build a responsive marketing website with home, pricing and contact pages, deployed to the client's domain."


def hx(addr):
    return (addr.as_hex if hasattr(addr, "as_hex") else str(addr)).lower()


def iso(unix):
    return dt.datetime.fromtimestamp(unix, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def contract_module(contract):
    instance = object.__getattribute__(contract, "_instance")
    return sys.modules[type(instance).__module__]


class World:
    def __init__(self, vm, contract):
        self.vm = vm
        self.c = contract
        self.client = create_address("client")
        self.contractor = create_address("contractor")
        self.outsider = create_address("outsider")
        self.now = T0
        self.sent = []
        self.funded = 0
        self.prompts = []
        self.warp(T0)

    # clock -------------------------------------------------------------
    def warp(self, unix):
        self.now = unix
        self.vm.warp(iso(unix))
        import genlayer.gl as gl
        gl.message_raw["datetime"] = iso(unix)

    def tick(self, seconds=20):
        self.warp(self.now + seconds)

    # calls -------------------------------------------------------------
    def as_(self, who, value=0):
        self.vm.sender = who
        self.vm.value = value
        if value:
            self.funded += value
            balance = self.vm._balances.get(self.vm._to_bytes(self.vm._contract_address), 0)
            self.vm.deal(self.vm._contract_address, balance + value)
        return self.c

    def create(self, value=0, window=None, scope=SCOPE):
        if window is None:
            self.as_(self.client, value).create_project(hx(self.contractor), scope)
        else:
            self.as_(self.client, value).create_project_with_window(hx(self.contractor), scope, window)
        self.vm.value = 0
        return int(json.loads(self.c.get_registry())["project_count"])

    def accept(self, pid):
        self.as_(self.contractor).accept_project(pid)

    def active(self, value=10 * GEN):
        pid = self.create(value)
        self.accept(pid)
        return pid

    def submit(self, pid, text, price=0, decision="SCOPE_EXTENSION", who=None):
        self.tick()
        self.vm.clear_mocks()
        self.vm.mock_llm(r"You classify whether a proposed project change request",
                         json.dumps({"decision": decision}))
        if price:
            self.as_(who or self.contractor).submit_priced_request(pid, text, price)
        else:
            self.as_(who or self.contractor).submit_request(pid, text)
        self.vm.clear_mocks()
        return self.project(pid)["request_count"]

    def approve(self, pid, rid, who, value=0):
        self.as_(who, value).approve_extension(pid, rid)
        self.vm.value = 0

    # views -------------------------------------------------------------
    def project(self, pid):
        return json.loads(self.c.get_project(pid))

    def request(self, pid, rid):
        return json.loads(self.c.get_request(pid, rid))

    def money(self, pid):
        p = self.project(pid)
        return {k: int(p[k]) for k in ("escrow_wei", "contractor_due_wei", "client_due_wei",
                                       "contractor_paid_wei", "client_refunded_wei")}


@pytest.fixture
def w(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, sdk_version=GENVM_VERSION)
    world = World(direct_vm, contract)
    module = contract_module(contract)

    class _Recipient:
        def __init__(self, address):
            self.address = address

        def emit_transfer(self, value):
            world.sent.append((hx(self.address), int(value)))

    original_recipient = getattr(module, "_NativeRecipient", None)
    module._NativeRecipient = _Recipient
    original_prompt = module.gl.nondet.exec_prompt

    def capture(prompt, *args, **kwargs):
        world.prompts.append(prompt)
        return original_prompt(prompt, *args, **kwargs)

    module.gl.nondet.exec_prompt = capture
    yield world
    module._NativeRecipient = original_recipient
    module.gl.nondet.exec_prompt = original_prompt
