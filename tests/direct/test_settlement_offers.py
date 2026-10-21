"""v4 offer consent tests against production code in SDK Direct Mode."""
import json
import pytest
from conftest import GEN


def offer(w, pid, who=None, share=6*GEN, seconds=3600):
    who = who or w.contractor
    w.as_(who).propose_settlement_with_window(pid, share, seconds)
    role = 'client' if who == w.client else 'contractor'
    return w.project(pid)[role+'_settlement']


@pytest.mark.parametrize('seconds',[0,59,604801,-1])
def test_window_bounds(w,seconds):
    pid=w.active()
    with w.vm.expect_revert('Settlement validity is out of range'):
        offer(w,pid,seconds=seconds)
    assert w.project(pid)['contractor_settlement'] is None


@pytest.mark.parametrize('seconds',[60,604800])
def test_window_endpoints(w,seconds):
    pid=w.active(); o=offer(w,pid,seconds=seconds)
    assert o['offer_id']=='1' and o['status']=='OPEN'
    assert o['created_at']==w.now and o['expires_at']==w.now+seconds
    assert json.loads(w.c.get_registry())['settlement_offers'] is True


def test_publication_never_accepts_matching_offer(w):
    pid=w.active(); before=w.money(pid)
    offer(w,pid); offer(w,pid,w.client)
    assert w.project(pid)['status']=='ACTIVE'
    assert w.money(pid)==before and w.prompts==[]


@pytest.mark.parametrize('who',['client','contractor'])
def test_cancel_leaves_money_and_replay_rejected(w,who):
    pid=w.active(); actor=getattr(w,who);o=offer(w,pid,actor);before=w.money(pid)
    w.as_(actor).cancel_settlement_offer(pid,int(o['offer_id']))
    assert w.project(pid)[who+'_settlement']['status']=='CANCELLED'
    assert w.money(pid)==before and w.project(pid)['status']=='ACTIVE'
    with w.vm.expect_revert('Settlement offer is not open'):
        w.as_(actor).cancel_settlement_offer(pid,1)


@pytest.mark.parametrize('method',['propose_settlement_with_window','cancel_settlement_offer','accept_settlement_offer'])
def test_outsider_blocked(w,method):
    pid=w.active();offer(w,pid)
    args=(pid,6*GEN,3600) if method=='propose_settlement_with_window' else (pid,1)
    with w.vm.expect_revert('Only project parties'):
        getattr(w.as_(w.outsider),method)(*args)


def test_own_offer_not_acceptible(w):
    pid=w.active();offer(w,pid)
    with w.vm.expect_revert('Settlement offer changed'):
        w.as_(w.contractor).accept_settlement_offer(pid,1)


@pytest.mark.parametrize('who',['client','contractor'])
@pytest.mark.parametrize('share',[0,6*GEN,10*GEN])
def test_exact_offer_acceptance_allocates_once(w,who,share):
    pid=w.active();proposer=getattr(w,who);other=w.contractor if who=='client' else w.client
    offer(w,pid,proposer,share)
    w.as_(other).accept_settlement_offer(pid,1)
    p=w.project(pid);m=w.money(pid)
    assert p['status']=='CLOSED' and p['settled']
    assert p['settled_offer_id']=='1' and p['settled_offer_role']==who.upper()
    assert m['escrow_wei']==0 and m['contractor_due_wei']==share and m['client_due_wei']==10*GEN-share
    with w.vm.expect_revert('Project already closed'):
        w.as_(other).accept_settlement_offer(pid,1)
    with w.vm.expect_revert('Settlement offer is not open'):
        w.as_(proposer).cancel_settlement_offer(pid,1)


def test_same_price_replacement_changes_nonce(w):
    pid=w.active();offer(w,pid);o=offer(w,pid)
    assert o['offer_id']=='2'
    with w.vm.expect_revert('Settlement offer changed'):
        w.as_(w.client).accept_settlement_offer(pid,1)
    with w.vm.expect_revert('Settlement offer changed'):
        w.as_(w.contractor).cancel_settlement_offer(pid,1)
    w.as_(w.client).accept_settlement_offer(pid,2)


@pytest.mark.parametrize('offset,allowed',[(-1,True),(0,False),(1,False)])
def test_expiry_exact_boundary(w,offset,allowed):
    pid=w.active();o=offer(w,pid,seconds=60);before=w.money(pid)
    w.warp(o['expires_at']+offset)
    assert w.money(pid)==before
    if allowed:
        w.as_(w.client).accept_settlement_offer(pid,1)
    else:
        assert w.project(pid)['contractor_settlement']['status']=='EXPIRED'
        with w.vm.expect_revert('Settlement offer is not open'):
            w.as_(w.client).accept_settlement_offer(pid,1)
        assert w.money(pid)==before


@pytest.mark.parametrize('mode',['cancel','expire'])
def test_legacy_matching_cannot_revive_dead_offer(w,mode):
    pid=w.active();o=offer(w,pid,seconds=60)
    if mode=='cancel':w.as_(w.contractor).cancel_settlement_offer(pid,1)
    else:w.warp(o['expires_at'])
    w.as_(w.client).propose_settlement(pid,6*GEN)
    assert w.project(pid)['status']=='ACTIVE'


def test_cancel_then_same_price_republish_needs_new_id(w):
    pid=w.active();offer(w,pid)
    w.as_(w.contractor).cancel_settlement_offer(pid,1)
    with w.vm.expect_revert('Settlement offer is not open'):
        w.as_(w.client).accept_settlement_offer(pid,1)
    assert offer(w,pid)['offer_id']=='2'
    with w.vm.expect_revert('Settlement offer changed'):
        w.as_(w.client).accept_settlement_offer(pid,1)


@pytest.mark.parametrize('change',['escrow','scope'])
def test_changed_state_invalidates_offer(w,change):
    pid=w.active();offer(w,pid)
    if change=='escrow':
        w.as_(w.client,GEN).fund_project(pid);w.vm.value=0
    else:
        rid=w.submit(pid,'Add a new analytics dashboard.')
        w.approve(pid,rid,w.client);w.approve(pid,rid,w.contractor)
    before=w.money(pid)
    assert w.project(pid)['contractor_settlement']['status']=='STALE'
    with w.vm.expect_revert('Settlement offer is not open'):
        w.as_(w.client).accept_settlement_offer(pid,1)
    assert w.money(pid)==before


@pytest.mark.parametrize('share',[-1,10*GEN+1])
def test_share_outside_escrow_rejected(w,share):
    pid=w.active()
    with w.vm.expect_revert('Settlement share is out of range' if share<0 else 'Settlement exceeds the escrow'):
        offer(w,pid,share=share)


def test_before_project_acceptance(w):
    pid=w.create(GEN)
    with w.vm.expect_revert('Project is not active'):
        offer(w,pid,share=0)
    with w.vm.expect_revert('Project is not active'):
        w.as_(w.client).accept_settlement_offer(pid,1)


def test_cross_project_id_not_transferable(w):
    p=w.active();q=w.active();offer(w,p)
    with w.vm.expect_revert('Settlement offer changed'):
        w.as_(w.client).accept_settlement_offer(q,1)


def test_withdraw_conserves_funding(w):
    pid=w.active();offer(w,pid)
    w.as_(w.client).accept_settlement_offer(pid,1)
    w.as_(w.client).withdraw(pid);w.as_(w.contractor).withdraw(pid)
    m=w.money(pid)
    assert sum(m.values())==10*GEN and m['client_refunded_wei']==4*GEN and m['contractor_paid_wei']==6*GEN
    assert len(w.sent)==2 and sum(amount for _,amount in w.sent)==10*GEN
    assert w.prompts==[]
