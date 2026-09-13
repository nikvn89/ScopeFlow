import assert from 'node:assert/strict'
import test from 'node:test'

import {
  readExplicitExecutionResult,
  waitForExplicitExecutionResult,
} from '../src/lib/transactionExecution.ts'

test('recognizes named and numeric explicit execution results', () => {
  assert.equal(
    readExplicitExecutionResult({
      txExecutionResultName: 'FINISHED_WITH_RETURN',
    }),
    'FINISHED_WITH_RETURN',
  )
  assert.equal(
    readExplicitExecutionResult({ txExecutionResult: '2' }),
    'FINISHED_WITH_ERROR',
  )
  assert.equal(
    readExplicitExecutionResult({ txExecutionResultName: 'NOT_VOTED' }),
    null,
  )
})

test('recognizes the authoritative raw leader receipt used by Studio Explorer', () => {
  assert.equal(
    readExplicitExecutionResult({
      consensus_data: {
        leader_receipt: [
          { mode: 'leader', execution_result: 'SUCCESS' },
          { mode: 'validator', execution_result: 'ERROR' },
        ],
      },
    }),
    'FINISHED_WITH_RETURN',
  )
  assert.equal(
    readExplicitExecutionResult({
      consensus_data: {
        leader_receipt: [
          { mode: 'leader', execution_result: 'ERROR' },
          { mode: 'validator', execution_result: 'SUCCESS' },
        ],
      },
    }),
    'FINISHED_WITH_ERROR',
  )
})

test('polls past a finalized snapshot until success is explicit', async () => {
  const snapshots = [
    { txExecutionResultName: 'NOT_VOTED' },
    {
      consensus_data: {
        leader_receipt: [
          { mode: 'leader', execution_result: 'SUCCESS' },
        ],
      },
    },
  ]
  let fetchCount = 0
  let clock = 0

  const result = await waitForExplicitExecutionResult(
    { statusName: 'FINALIZED' },
    async () => snapshots[fetchCount++],
    {
      timeoutMs: 10,
      intervalMs: 1,
      now: () => clock,
      delay: async (milliseconds) => {
        clock += milliseconds
      },
    },
  )

  assert.equal(result, 'FINISHED_WITH_RETURN')
  assert.equal(fetchCount, 2)
})

test('keeps polling after a transient read error', async () => {
  let fetchCount = 0
  let clock = 0

  const result = await waitForExplicitExecutionResult(
    {},
    async () => {
      fetchCount += 1
      if (fetchCount === 1) throw new Error('index not ready')
      return { txExecutionResultName: 'FINISHED_WITH_ERROR' }
    },
    {
      timeoutMs: 10,
      intervalMs: 1,
      now: () => clock,
      delay: async (milliseconds) => {
        clock += milliseconds
      },
    },
  )

  assert.equal(result, 'FINISHED_WITH_ERROR')
  assert.equal(fetchCount, 2)
})

test('returns null at the bounded deadline instead of claiming success', async () => {
  let clock = 0

  const result = await waitForExplicitExecutionResult(
    {},
    async () => ({}),
    {
      timeoutMs: 3,
      intervalMs: 1,
      now: () => clock,
      delay: async (milliseconds) => {
        clock += milliseconds
      },
    },
  )

  assert.equal(result, null)
  assert.equal(clock, 3)
})
