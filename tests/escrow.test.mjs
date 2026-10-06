import assert from 'node:assert/strict'
import test from 'node:test'
import {
  approvalValue,
  canReclaimDeposit,
  escrowActions,
  formatGen,
  parseGen,
  settlementView,
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
  const current = project({ contractor_settlement: { contractor_share_wei: share, scope_version: 2, escrow_wei: (10n * GEN).toString() } })
  const view = settlementView(current, 'CLIENT')
  assert.equal(view.canMatch, true)
  assert.equal(view.theirShare, 6n * GEN)
  const staleVersion = project({ contractor_settlement: { contractor_share_wei: share, scope_version: 1, escrow_wei: (10n * GEN).toString() } })
  assert.equal(settlementView(staleVersion, 'CLIENT').canMatch, false)
  const staleEscrow = project({ contractor_settlement: { contractor_share_wei: share, scope_version: 2, escrow_wei: (9n * GEN).toString() } })
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
