// Escrow amounts and actions for ScopeFlow v0.7.0.
// The contract returns every wei amount as a decimal string; nothing here
// passes a token amount through a JavaScript number.

export const WEI_PER_GEN = 10n ** 18n
export const MAX_ESCROW_WEI = 10n ** 27n

export type Role = 'CLIENT' | 'CONTRACTOR' | 'OBSERVER'

export type Settlement = {
  offer_id: string
  created_at: number
  expires_at: number
  status: string
  contractor_share_wei: string
  scope_version: number
  escrow_wei: string
} | null

export type EscrowFields = {
  chain_timestamp?: number
  settled_offer_id?: string
  settled_offer_role?: string
  status: string
  active_scope_version: number
  escrow_wei?: string
  contractor_due_wei?: string
  client_due_wei?: string
  contractor_paid_wei?: string
  client_refunded_wei?: string
  settled?: boolean
  refund_pending_expiry?: boolean
  client_settlement?: Settlement
  contractor_settlement?: Settlement
}

export function wei(value: string | undefined): bigint {
  if (value === undefined) return 0n
  if (!/^\d+$/.test(value)) throw new Error('The contract returned an invalid amount.')
  return BigInt(value)
}

/** "1.5" -> 1500000000000000000n. Exact: at most 18 decimals, no floats. Empty means 0. */
export function parseGen(input: string): bigint {
  const value = input.trim()
  if (value === '') return 0n
  const match = /^(\d+)(?:\.(\d{1,18}))?$/.exec(value)
  if (!match) throw new Error('Enter a GEN amount such as 10 or 0.5 (up to 18 decimals).')
  const amount = BigInt(match[1]) * WEI_PER_GEN + (match[2] ? BigInt(match[2].padEnd(18, '0')) : 0n)
  if (amount > MAX_ESCROW_WEI) throw new Error('Amount is above the contract limit.')
  return amount
}

/** 1500000000000000000n -> "1.5 GEN". Exact, trailing zeros trimmed. */
export function formatGen(amount: bigint): string {
  const whole = (amount / WEI_PER_GEN).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const fraction = (amount % WEI_PER_GEN).toString().padStart(18, '0').replace(/0+$/, '')
  return `${whole}${fraction ? `.${fraction}` : ''} GEN`
}

export type SettlementView = {
  mine: Settlement
  theirs: Settlement
  /** The other party's proposal is current (same scope version and escrow) and can be matched. */
  canMatch: boolean
  theirShare: bigint
}

function isCurrent(s: Settlement, project: EscrowFields, now: number): boolean {
  return !!s && s.status === 'OPEN' && /^\d+$/.test(s.offer_id) && BigInt(s.offer_id) > 0n && s.expires_at > Math.max(now, project.chain_timestamp ?? 0) && s.scope_version === project.active_scope_version && s.escrow_wei === (project.escrow_wei ?? '0')
}

export function settlementView(project: EscrowFields, role: Role, nowSeconds = Math.floor(Date.now() / 1000)): SettlementView | null {
  if (role === 'OBSERVER') return null
  const mine = role === 'CLIENT' ? project.client_settlement ?? null : project.contractor_settlement ?? null
  const theirs = role === 'CLIENT' ? project.contractor_settlement ?? null : project.client_settlement ?? null
  return {
    mine: isCurrent(mine, project, nowSeconds) ? mine : null,
    theirs: isCurrent(theirs, project, nowSeconds) ? theirs : null,
    canMatch: project.status === 'ACTIVE' && isCurrent(theirs, project, nowSeconds),
    theirShare: theirs ? wei(theirs.contractor_share_wei) : 0n,
  }
}

export type EscrowActions = {
  escrow: bigint
  myDue: bigint
  canFund: boolean
  canWithdraw: boolean
  canSettle: boolean
  note: string
}

export function escrowActions(project: EscrowFields, role: Role): EscrowActions {
  const escrow = wei(project.escrow_wei)
  const myDue = role === 'CLIENT' ? wei(project.client_due_wei) : role === 'CONTRACTOR' ? wei(project.contractor_due_wei) : 0n
  const open = project.status === 'ACTIVE' || project.status === 'PENDING_CONTRACTOR_ACCEPTANCE'
  let note = ''
  if (project.refund_pending_expiry) note = 'The acceptance window has passed. Record the expiry to release the refund to the client.'
  else if (project.status === 'ACTIVE') note = 'Held in the contract until both parties close the project or agree a split.'
  else if (project.status === 'PENDING_CONTRACTOR_ACCEPTANCE') note = 'Refunded to the client if the contractor declines, the window expires, or the client cancels.'
  else if (project.settled) note = 'The escrow has been allocated. Each party withdraws its own share.'
  else note = 'The escrow went back to the client.'
  return {
    escrow,
    myDue,
    canFund: role === 'CLIENT' && open && !project.refund_pending_expiry,
    canWithdraw: myDue > 0n,
    canSettle: project.status === 'ACTIVE' && role !== 'OBSERVER',
    note,
  }
}

/** Value the connected party must attach when approving an extension. */
export function approvalValue(role: Role, priceWei: string | undefined): bigint {
  return role === 'CLIENT' ? wei(priceWei) : 0n
}

/** A deposit the client can take back: present, not yet returned, and no longer live. */
export function canReclaimDeposit(role: Role, request: { deposit_wei?: string; status: string }): boolean {
  return role === 'CLIENT' && wei(request.deposit_wei) > 0n && request.status !== 'AWAITING_APPROVAL'
}

/** Finalized poststate for consent operations; publication/cancellation cannot move money. */
export function settlementPostcondition(
  kind: 'propose' | 'cancel' | 'accept', before: EscrowFields, after: EscrowFields,
  role: Exclude<Role, 'OBSERVER'>, expected: { id?: string; share?: bigint; seconds?: number },
): boolean {
  const mine = (p: EscrowFields) => role === 'CLIENT' ? p.client_settlement : p.contractor_settlement
  const theirs = role === 'CLIENT' ? before.contractor_settlement : before.client_settlement
  const money = ['escrow_wei', 'contractor_due_wei', 'client_due_wei', 'contractor_paid_wei', 'client_refunded_wei'] as const
  if (kind === 'accept') {
    return !!theirs && theirs.offer_id === expected.id && after.status === 'CLOSED' && !!after.settled
      && after.settled_offer_id === expected.id && after.settled_offer_role === (role === 'CLIENT' ? 'CONTRACTOR' : 'CLIENT')
      && wei(after.escrow_wei) === 0n
      && wei(after.contractor_due_wei) === wei(before.contractor_due_wei) + wei(theirs.contractor_share_wei)
      && wei(after.client_due_wei) === wei(before.client_due_wei) + wei(before.escrow_wei) - wei(theirs.contractor_share_wei)
      && after.contractor_paid_wei === before.contractor_paid_wei && after.client_refunded_wei === before.client_refunded_wei
  }
  if (after.status !== 'ACTIVE' || money.some(k => wei(after[k]) !== wei(before[k]))) return false
  const next = mine(after)
  if (!next) return false
  if (kind === 'cancel') return next.offer_id === expected.id && next.status === 'CANCELLED'
  return next.status === 'OPEN' && BigInt(next.offer_id) === BigInt(mine(before)?.offer_id ?? '0') + 1n
    && wei(next.contractor_share_wei) === expected.share && next.scope_version === before.active_scope_version
    && next.escrow_wei === before.escrow_wei && next.expires_at - next.created_at === expected.seconds
}
