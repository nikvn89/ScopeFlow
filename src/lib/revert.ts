// Finds the contract's own revert sentence inside a raw StudioNet transaction
// (plain text, hex or base64), so a failed write can say why it failed.

export const KNOWN_REVERTS = [
  'Project not found', 'Request not found', 'Invalid scope version', 'Only project parties',
  'Scope too short', 'Scope too long', 'Request too short', 'Request too long', 'Invalid chain datetime',
  'Semantic evaluation failed', 'Acceptance window must be between 300 and 2592000 seconds',
  'Invalid contractor', 'Client and contractor must differ', 'Only the contractor may accept',
  'Project cancelled', 'Project declined', 'Project expired', 'Project already accepted',
  'Acceptance window expired', 'Only the client may cancel', 'Accepted project cannot be cancelled',
  'Project already cancelled', 'Only the contractor may decline', 'Project already declined',
  'Accepted project cannot expire', 'Project already expired', 'Acceptance window still open',
  'Project already closed', 'Project is not active', 'Client already approved close',
  'Contractor already approved close', 'Project closed', 'Contractor has not accepted this project yet',
  'Request limit reached', 'Submission cooldown active', 'Not a scope extension', 'Extension rejected',
  'Extension already applied', 'Request superseded by scope change', 'Client already approved',
  'Contractor already approved', 'Scope capacity exceeded', 'Extension already rejected',
  'Invalid start version', 'Invalid count', 'Scope version not found', 'Invalid start id',
  'Invalid start index',
  // v0.6.0 escrow
  'Escrow is out of range', 'Settlement exceeds the escrow', 'Price is out of range',
  'Client approval must deposit exactly the extension price', 'Only the client deposits for an extension',
  'Only the client may fund', 'Funding amount must be greater than zero', 'Settlement share is out of range',
  'Settlement already proposed', 'Nothing to withdraw', 'Only the client may reclaim a deposit',
  'No deposit to reclaim', 'Deposit is committed to a live extension',
]

function decodeCandidates(value: string): string[] {
  const out = [value]
  try {
    const hex = value.replace(/^0x/, '')
    if (/^[0-9a-fA-F]+$/.test(hex) && hex.length % 2 === 0 && hex.length >= 8) {
      const bytes = new Uint8Array(hex.length / 2)
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
      out.push(new TextDecoder().decode(bytes))
    }
  } catch { /* not hex */ }
  try {
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(value) && value.length % 4 === 0 && value.length >= 8) {
      const bin = atob(value)
      out.push(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))))
    }
  } catch { /* not base64 */ }
  return out
}

function collect(value: unknown, out: string[], depth = 0): void {
  if (depth > 8 || value === null || value === undefined) return
  if (typeof value === 'string') out.push(...decodeCandidates(value))
  else if (Array.isArray(value)) value.forEach((v) => collect(v, out, depth + 1))
  else if (typeof value === 'object') Object.values(value as Record<string, unknown>).forEach((v) => collect(v, out, depth + 1))
}

/** Longest known sentence found wins, so "Project closed" never hides "Project already closed". */
export function revertReasonFrom(value: unknown): string | null {
  const strings: string[] = []
  collect(value, strings)
  let best: string | null = null
  for (const s of strings) {
    for (const known of KNOWN_REVERTS) {
      if (s.includes(known) && (!best || known.length > best.length)) best = known
    }
  }
  return best
}
