import assert from 'node:assert/strict'
import test from 'node:test'
import {
  approvalValue,
  canReclaimDeposit,
  escrowActions,
  formatGen,
  parseGen,
  settlementView,
  settlementPostcondition,
  wei,
} from '../src/lib/escrow.ts'

const GEN = 10n ** 18n

const project = (over = {}) => ({
  status: 'ACTIVE', active_scope_version: 2, escrow_wei: (10n * GEN).toString(),
  contractor_due_wei: '0', client_due_wei: '0', contractor_paid_wei: '0', client_refunded_wei: '0',
  settled: false, refund_pending_expiry: false, client_settlement: null, contractor_settlement: null, ...over,
})

test('GEN amounts convert to wei exactly; empty means zero', () => {
  assert.equal(parseGen(''), 0n)
  assert.equal(parseGen('2.5'), 25n * GEN / 10n)
  assert.equal(parseGen('0.000000000000000001'), 1n)
  assert.throws(() => parseGen('1e3'), /GEN amount/)
  assert.throws(() => parseGen('-1'), /GEN amount/)
  assert.throws(() => parseGen('1000000001'), /above the contract limit/)
  assert.equal(formatGen(1234n * GEN + 7n), '1,234.000000000000000007 GEN')
  assert.equal(formatGen(0n), '0 GEN')
})

test('wei strings are parsed strictly', () => {
  assert.equal(wei('5000000000000000000000'), 5000n * GEN)
  assert.equal(wei(undefined), 0n)
  assert.throws(() => wei('1e+21'), /invalid amount/)
})

test('only the client funds, and only while the project is open', () => {
  assert.equal(escrowActions(project(), 'CLIENT').canFund, true)
  assert.equal(escrowActions(project(), 'CONTRACTOR').canFund, false)
  assert.equal(escrowActions(project({ status: 'PENDING_CONTRACTOR_ACCEPTANCE' }), 'CLIENT').canFund, true)
  assert.equal(escrowActions(project({ status: 'CLOSED' }), 'CLIENT').canFund, false)
  const lapsed = escrowActions(project({ status: 'EXPIRED', refund_pending_expiry: true }), 'CLIENT')
  assert.equal(lapsed.canFund, false)
  assert.match(lapsed.note, /Record the expiry/)
})

test('each party withdraws only its own due balance', () => {
  const p = project({ status: 'CLOSED', settled: true, escrow_wei: '0', contractor_due_wei: (6n * GEN).toString(), client_due_wei: (4n * GEN).toString() })
  assert.equal(escrowActions(p, 'CONTRACTOR').myDue, 6n * GEN)
  assert.equal(escrowActions(p, 'CLIENT').myDue, 4n * GEN)
  assert.equal(escrowActions(p, 'OBSERVER').canWithdraw, false)
  assert.equal(escrowActions(project(), 'CONTRACTOR').canWithdraw, false)
})

test('a settlement can be matched only while it is current', () => {
  const share = (6n * GEN).toString()
  const current = project({ contractor_settlement: { offer_id: '1', created_at: 1, expires_at: 9999999999, status: 'OPEN', contractor_share_wei: share, scope_version: 2, escrow_wei: (10n * GEN).toString() } })
  const view = settlementView(current, 'CLIENT')
  assert.equal(view.canMatch, true)
  assert.equal(view.theirShare, 6n * GEN)
  const staleVersion = project({ contractor_settlement: { offer_id: '1', created_at: 1, expires_at: 9999999999, status: 'OPEN', contractor_share_wei: share, scope_version: 1, escrow_wei: (10n * GEN).toString() } })
  assert.equal(settlementView(staleVersion, 'CLIENT').canMatch, false)
  const staleEscrow = project({ contractor_settlement: { offer_id: '1', created_at: 1, expires_at: 9999999999, status: 'OPEN', contractor_share_wei: share, scope_version: 2, escrow_wei: (9n * GEN).toString() } })
  assert.equal(settlementView(staleEscrow, 'CLIENT').canMatch, false)
  assert.equal(settlementView(current, 'OBSERVER'), null)
  assert.equal(settlementView(current, 'CONTRACTOR').mine.contractor_share_wei, share)
})

test('only the client attaches the extension price when approving', () => {
  assert.equal(approvalValue('CLIENT', (3n * GEN).toString()), 3n * GEN)
  assert.equal(approvalValue('CONTRACTOR', (3n * GEN).toString()), 0n)
  assert.equal(approvalValue('CLIENT', undefined), 0n)
})

test('a deposit is reclaimable only by the client once the extension is no longer live', () => {
  const r = (status, deposit = GEN.toString()) => ({ status, deposit_wei: deposit })
  assert.equal(canReclaimDeposit('CLIENT', r('REJECTED_EXTENSION')), true)
  assert.equal(canReclaimDeposit('CLIENT', r('SUPERSEDED')), true)
  assert.equal(canReclaimDeposit('CLIENT', r('PROJECT_CLOSED')), true)
  assert.equal(canReclaimDeposit('CLIENT', r('AWAITING_APPROVAL')), false)
  assert.equal(canReclaimDeposit('CONTRACTOR', r('REJECTED_EXTENSION')), false)
  assert.equal(canReclaimDeposit('CLIENT', r('REJECTED_EXTENSION', '0')), false)
})

const offer = (over={}) => ({offer_id:'1',created_at:100,expires_at:160,status:'OPEN',scope_version:2,escrow_wei:(10n*GEN).toString(),contractor_share_wei:(6n*GEN).toString(),...over})
test('offer expiry uses the later of contract and browser time',()=>{
  const p=project({contractor_settlement:offer()})
  assert.equal(settlementView(p,'CLIENT',159).canMatch,true)
  assert.equal(settlementView(p,'CLIENT',160).canMatch,false)
  assert.equal(settlementView({...p,chain_timestamp:161},'CLIENT',150).canMatch,false)
})
test('cancelled, stale and malformed IDs are never actionable',()=>{
  for(const o of [offer({status:'CANCELLED'}),offer({status:'STALE'}),offer({offer_id:'0'}),offer({offer_id:'bad'}),offer({status:'EXPIRED'})]) {
    assert.equal(settlementView(project({contractor_settlement:o}),'CLIENT',101).canMatch,false)
  }
})
test('publication verifies nonce, value, scope and untouched funds',()=>{
  const b=project(), a=project({client_settlement:offer()})
  assert.equal(settlementPostcondition('propose',b,a,'CLIENT',{share:6n*GEN,seconds:60}),true)
  assert.equal(settlementPostcondition('propose',b,{...a,escrow_wei:'0'},'CLIENT',{share:6n*GEN,seconds:60}),false)
  assert.equal(settlementPostcondition('propose',b,{...a,client_settlement:offer({offer_id:'2'})},'CLIENT',{share:6n*GEN,seconds:60}),false)
})
test('cancel verifies exact cancelled ID and unchanged funds',()=>{
  const b=project({client_settlement:offer()}),a=project({client_settlement:offer({status:'CANCELLED'})})
  assert.equal(settlementPostcondition('cancel',b,a,'CLIENT',{id:'1'}),true)
  assert.equal(settlementPostcondition('cancel',b,a,'CLIENT',{id:'2'}),false)
  assert.equal(settlementPostcondition('cancel',b,{...a,client_due_wei:'1'},'CLIENT',{id:'1'}),false)
})
test('accept verifies exact ID, proposer and both allocations',()=>{
  const b=project({contractor_settlement:offer()})
  const a=project({status:'CLOSED',settled:true,settled_offer_id:'1',settled_offer_role:'CONTRACTOR',escrow_wei:'0',contractor_due_wei:(6n*GEN).toString(),client_due_wei:(4n*GEN).toString()})
  assert.equal(settlementPostcondition('accept',b,a,'CLIENT',{id:'1'}),true)
  for(const patch of [{settled_offer_id:'2'},{settled_offer_role:'CLIENT'},{client_due_wei:'0'},{contractor_due_wei:'0'},{status:'ACTIVE'}])assert.equal(settlementPostcondition('accept',b,{...a,...patch},'CLIENT',{id:'1'}),false)
})
