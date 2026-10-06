import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { KNOWN_REVERTS, revertReasonFrom } from '../src/lib/revert.ts'

test('the app knows every revert sentence the contract can raise, and no others', () => {
  const source = readFileSync(new URL('../contracts/ScopeFlow.py', import.meta.url), 'utf8')
  const raised = new Set()
  for (const m of source.matchAll(/UserError\(\s*"([^"]+)"/g)) raised.add(m[1])
  for (const m of source.matchAll(/_wei_in_range\([^,]+,\s*"([^"]+)"\)/g)) raised.add(m[1])
  for (const message of raised) {
    assert.ok(KNOWN_REVERTS.some((known) => message.startsWith(known)), `app does not know: ${message}`)
  }
  for (const known of KNOWN_REVERTS) {
    assert.ok([...raised].some((message) => message.startsWith(known)), `contract never raises: ${known}`)
  }
})

test('revert sentences are found in plain, hex and base64 receipts', () => {
  const hex = Buffer.from('UserError: Nothing to withdraw').toString('hex')
  assert.equal(revertReasonFrom({ consensus_data: { leader_receipt: [{ mode: 'leader', result: hex }] } }), 'Nothing to withdraw')
  const b64 = Buffer.from('[rollback] Deposit is committed to a live extension').toString('base64')
  assert.equal(revertReasonFrom([b64]), 'Deposit is committed to a live extension')
  assert.equal(revertReasonFrom({ msg: 'Project already closed' }), 'Project already closed')
  assert.equal(revertReasonFrom({ msg: 'nothing relevant' }), null)
})
