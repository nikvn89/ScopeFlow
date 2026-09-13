export type ExplicitExecutionResult =
  | 'FINISHED_WITH_RETURN'
  | 'FINISHED_WITH_ERROR'

export type TransactionExecutionSnapshot = {
  consensus_data?: unknown
  txExecutionResult?: unknown
  txExecutionResultName?: unknown
}

export type ExecutionPollingOptions = {
  timeoutMs?: number
  intervalMs?: number
  now?: () => number
  delay?: (milliseconds: number) => Promise<void>
}

const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_INTERVAL_MS = 1_500

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readLeaderExecutionResult(
  snapshot: TransactionExecutionSnapshot,
): ExplicitExecutionResult | null {
  if (!isRecord(snapshot.consensus_data)) return null

  const receipts = snapshot.consensus_data.leader_receipt
  if (!Array.isArray(receipts)) return null

  const leaders = receipts.filter(
    (receipt) => isRecord(receipt) && receipt.mode === 'leader',
  )
  const finalLeader = leaders.at(-1)
  if (!isRecord(finalLeader)) return null

  if (finalLeader.execution_result === 'SUCCESS') {
    return 'FINISHED_WITH_RETURN'
  }
  if (finalLeader.execution_result === 'ERROR') {
    return 'FINISHED_WITH_ERROR'
  }

  return null
}

function defaultDelay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds)
  })
}

export function readExplicitExecutionResult(
  snapshot: TransactionExecutionSnapshot,
): ExplicitExecutionResult | null {
  const named = snapshot.txExecutionResultName
  if (
    named === 'FINISHED_WITH_RETURN' ||
    named === 'FINISHED_WITH_ERROR'
  ) {
    return named
  }

  const numeric = snapshot.txExecutionResult
  if (numeric === 1 || numeric === '1') return 'FINISHED_WITH_RETURN'
  if (numeric === 2 || numeric === '2') return 'FINISHED_WITH_ERROR'

  return readLeaderExecutionResult(snapshot)
}

export async function waitForExplicitExecutionResult(
  initialSnapshot: TransactionExecutionSnapshot,
  fetchSnapshot: () => Promise<TransactionExecutionSnapshot>,
  options: ExecutionPollingOptions = {},
): Promise<ExplicitExecutionResult | null> {
  const timeoutMs = Math.max(0, options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const intervalMs = Math.max(1, options.intervalMs ?? DEFAULT_INTERVAL_MS)
  const now = options.now ?? Date.now
  const delay = options.delay ?? defaultDelay
  const deadline = now() + timeoutMs
  let snapshot = initialSnapshot

  while (true) {
    const result = readExplicitExecutionResult(snapshot)
    if (result) return result

    const remainingMs = deadline - now()
    if (remainingMs <= 0) return null

    await delay(Math.min(intervalMs, remainingMs))

    try {
      snapshot = await fetchSnapshot()
    } catch {
      // StudioNet may briefly miss the transaction while indexes converge.
      // Keep polling until the bounded deadline instead of claiming success.
      snapshot = {}
    }
  }
}
