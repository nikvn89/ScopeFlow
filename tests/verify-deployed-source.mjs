import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

// v0.6.0 deployment. Pass another address as the first argument to check it instead.
const DEPLOYED_V060 = ''
const address = process.argv[2] ?? DEPLOYED_V060
const expectedSha =
  '161a7900286927010281b976ff617f222e3a17ae5440462b294982bd10202777'

if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
  throw new Error('Set the v0.6.0 deployment address (DEPLOYED_V060) or pass it as an argument.')
}

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
  throw new Error('Source hash does not match the v0.6.0 source.')
}

if (normalizedDeployed !== normalizedLocal) {
  throw new Error('Deployed source and repository source differ.')
}

console.log('PASS: deployed and repository contract sources are identical.')
