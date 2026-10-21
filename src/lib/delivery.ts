import {wei} from './escrow.ts'
import type {Role} from './escrow.ts'

export type DeliveryAttempt = {
  attempt_id: number; milestone_id: number; report: string; artifact_url: string;
  artifact_fetched: boolean; decision: string; created_at: number; submitted_by: string;
  criteria_hash: string; report_hash: string; agreed_scope_version: number;
}
export type DeliveryReview = {action: string; note?: string; receipt_id?: number; at: number}
export type Milestone = {
  milestone_id: number; title: string; criteria: string; criteria_hash: string; budget_wei: string;
  status: string; recorded_status: string; proposed_scope_version: number; agreed_scope_version: number;
  created_at: number; accepted_at: number; paid_at: number; attempt_count: number; latest_attempt_id: number;
  receipt_id: number; latest_attempt: DeliveryAttempt | null; latest_review: DeliveryReview | null;
}
export type PaymentReceipt = {
  receipt_id: number; project_id: number; milestone_id: number; title: string; attempt_id: number;
  amount_wei: string; client: string; contractor: string; approved_by: string; created_at: number;
  criteria_hash: string; report_hash: string; agreed_scope_version: number; current_scope_version: number;
  payment_revision: number; escrow_before_wei: string; escrow_after_wei: string;
  kind: 'MILESTONE_ALLOCATION'; native_transfer: false;
}
export type DeliveryFunds = {
  status: string; active_scope_version: number; escrow_wei?: string; reserved_wei?: string;
  available_wei?: string; payment_revision?: number; contractor_due_wei?: string;
  contractor_paid_wei?: string; client_due_wei?: string; client_refunded_wei?: string;
}

export function milestoneActions(project: DeliveryFunds, m: Milestone, role: Role) {
  const active = project.status === 'ACTIVE'
  const proposed = m.status === 'PROPOSED'
  const current = m.proposed_scope_version === project.active_scope_version
  return {
    canCancel: active && role === 'CLIENT' && proposed,
    canAccept: active && role === 'CONTRACTOR' && proposed && current && wei(m.budget_wei) <= wei(project.available_wei),
    canSubmit: active && role === 'CONTRACTOR' && ['ACTIVE','SUBMITTED','REVISION_REQUESTED'].includes(m.status) && m.attempt_count < 5,
    canRevise: active && role === 'CLIENT' && m.status === 'SUBMITTED',
    canApprove: active && role === 'CLIENT' && m.status === 'SUBMITTED' && m.latest_attempt?.decision === 'DELIVERY_MATCHES',
    staleProposal: proposed && !current,
  }
}

/** Exact amount, revision, attempt and receipt checks after finalized execution.
 * Concurrent unrelated writes can make this inconclusive: refresh, never retry.
 */
export function allocationVerified(before: DeliveryFunds, after: DeliveryFunds, milestone: Milestone,
  next: Milestone, receipts: PaymentReceipt[], pid: number, client: string): boolean {
  const r = receipts.find(item => item.receipt_id === next.receipt_id)
  const amount = wei(milestone.budget_wei)
  return next.status === 'PAID' && next.latest_attempt_id === milestone.latest_attempt_id
    && next.criteria_hash === milestone.criteria_hash && !!r && r.project_id === pid
    && r.milestone_id === milestone.milestone_id && r.attempt_id === milestone.latest_attempt_id
    && r.criteria_hash === milestone.criteria_hash && r.report_hash === milestone.latest_attempt?.report_hash
    && r.approved_by.toLowerCase() === client.toLowerCase() && r.native_transfer === false
    && r.kind === 'MILESTONE_ALLOCATION' && wei(r.amount_wei) === amount
    && wei(r.escrow_before_wei) === wei(before.escrow_wei) && wei(r.escrow_after_wei) === wei(after.escrow_wei)
    && r.payment_revision === (before.payment_revision ?? 0) + 1 && after.payment_revision === r.payment_revision
    && after.status === 'ACTIVE' && wei(after.escrow_wei) === wei(before.escrow_wei) - amount
    && wei(after.reserved_wei) === wei(before.reserved_wei) - amount
    && wei(after.contractor_due_wei) === wei(before.contractor_due_wei) + amount
    && wei(after.contractor_paid_wei) === wei(before.contractor_paid_wei)
    && wei(after.client_due_wei) === wei(before.client_due_wei)
    && wei(after.client_refunded_wei) === wei(before.client_refunded_wei)
}

export function unchangedMoney(before: DeliveryFunds, after: DeliveryFunds): boolean {
  return ['escrow_wei','contractor_due_wei','client_due_wei','contractor_paid_wei','client_refunded_wei']
    .every(k => wei(before[k as keyof DeliveryFunds] as string | undefined) === wei(after[k as keyof DeliveryFunds] as string | undefined))
}
