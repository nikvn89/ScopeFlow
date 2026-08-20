type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function readMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (!isRecord(value)) return null

  if (typeof value.message === 'string' && value.message.trim()) {
    return value.message.trim()
  }

  if (isRecord(value.data)) {
    const nested = readMessage(value.data)
    if (nested) return nested
  }

  if (isRecord(value.error)) {
    const nested = readMessage(value.error)
    if (nested) return nested
  }

  return null
}

function readCode(value: unknown): number | string | null {
  if (!isRecord(value)) return null
  const code = value.code
  if (typeof code === 'number' || typeof code === 'string') return code
  if (isRecord(value.data)) return readCode(value.data)
  return null
}

export function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    const message = error.message.trim()
    if (/user rejected|user denied|rejected the request/i.test(message)) {
      return 'You rejected the request in your wallet.'
    }
    return message
  }

  const code = readCode(error)
  const message = readMessage(error)

  if (
    code === 4001 ||
    code === '4001' ||
    (message && /user rejected|user denied|rejected the request/i.test(message))
  ) {
    return 'You rejected the request in your wallet.'
  }

  if (code === -32601 || code === '-32601') {
    return 'Your wallet does not support the requested GenLayer network action.'
  }

  if (message) return message

  try {
    const serialized = JSON.stringify(error)
    if (serialized && serialized !== '{}') return serialized
  } catch {
    // Ignore serialization failure.
  }

  return 'Unknown wallet or RPC error.'
}
