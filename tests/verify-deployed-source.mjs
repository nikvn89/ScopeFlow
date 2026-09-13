import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const address = '0xBe44d208A83b15973b91932f75eaA354795E907e'
const expectedSha =
  'ac4ff25ac0bd4ead34db528e97f3d822e96a39fbc88e8fbd37b66a7eb1e704bc'

function normalizeSource(source) {
  return source.replaceAll('\r\n', '\n')
}

function sha256(source) {
  return createHash('sha256').update(source).digest('hex')
}

const client = createClient({ chain: studionet })
const [deployedSource, localSource] = await Promise.all([
  client.getContractCode(address),
  readFile(new URL('../contracts/ScopeFlow.py', import.meta.url), 'utf8'),
])

const normalizedDeployed = normalizeSource(deployedSource)
const normalizedLocal = normalizeSource(localSource)
const deployedSha = sha256(normalizedDeployed)
const localSha = sha256(normalizedLocal)

console.log(`Address: ${address}`)
console.log(`Deployed normalized SHA256: ${deployedSha}`)
console.log(`Repository normalized SHA256: ${localSha}`)

if (deployedSha !== expectedSha || localSha !== expectedSha) {
  throw new Error('Source hash does not match the frozen v0.5.0 candidate.')
}

if (normalizedDeployed !== normalizedLocal) {
  throw new Error('Deployed source and repository source differ.')
}

console.log('PASS: deployed and repository contract sources are identical.')
