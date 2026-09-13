import assert from 'node:assert/strict'

import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

import { readExplicitExecutionResult } from '../src/lib/transactionExecution.ts'

const cases = [
  {
    label: 'successful V2 mutual-close write',
    hash: '0xc699524036af38aecb1745ab4b1842b41345031f472a41b579229b6763714970',
    expected: 'FINISHED_WITH_RETURN',
  },
  {
    label: 'late acceptance rollback',
    hash: '0x3b86458a92b2aaab743d592454d425b653cf63472f583cbdf5d772441e61187f',
    expected: 'FINISHED_WITH_ERROR',
  },
]

const client = createClient({ chain: studionet })

for (const testCase of cases) {
  const rawTransaction = await client.request({
    method: 'eth_getTransactionByHash',
    params: [testCase.hash],
  })
  const actual = readExplicitExecutionResult(rawTransaction)

  console.log(`${testCase.label}: ${testCase.hash}`)
  console.log(`Resolved execution result: ${actual}`)
  assert.equal(actual, testCase.expected)
}

console.log('PASS: frontend receipt policy resolves real StudioNet success and rollback transactions.')
