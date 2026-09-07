import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const testFile = join(here, 'ledger_model.test.py')

const candidates = process.platform === 'win32'
  ? ['py', 'python', 'python3']
  : ['python3', 'python', 'py']

for (const command of candidates) {
  const probe = spawnSync(command, ['--version'], { encoding: 'utf8' })
  if (probe.error || probe.status !== 0) continue

  const run = spawnSync(command, [testFile], { stdio: 'inherit' })
  process.exit(run.status ?? 1)
}

console.error('Python 3 was not found. Install Python 3, then rerun npm run test:ledger.')
process.exit(1)
