import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const testFiles = [
  join(here, 'ledger_model.test.py'),
  join(here, 'scopeflow_contract.test.py'),
]

const candidates = process.platform === 'win32'
  ? ['py', 'python', 'python3']
  : ['python3', 'python', 'py']

for (const command of candidates) {
  const probe = spawnSync(command, ['--version'], { encoding: 'utf8' })
  if (probe.error || probe.status !== 0) continue

  for (const testFile of testFiles) {
    const run = spawnSync(command, [testFile], { stdio: 'inherit' })
    if (run.status !== 0) process.exit(run.status ?? 1)
  }

  process.exit(0)
}

console.error('Python 3 was not found. Install Python 3, then rerun npm run test:ledger.')
process.exit(1)
