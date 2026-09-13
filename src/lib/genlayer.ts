import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { ExecutionResult, TransactionStatus } from 'genlayer-js/types'
import { CONTRACT_ADDRESS, EXPLORER_BASE } from './config'
import { waitForExplicitExecutionResult } from './transactionExecution'

export type RegistryState = {
  project_count: number
  contract_version?: string
  scope_version_ledger?: boolean
  lifecycle_finality?: boolean
  default_acceptance_window_seconds?: number
  min_acceptance_window_seconds?: number
  max_acceptance_window_seconds?: number
}

export type ScopeProject = {
  project_id: number
  client: string
  contractor: string
  active_scope_version: number
  active_scope: string
  scope_length: number
  scope_capacity_left: number
  request_count: number
  scope_version_count?: number
  accepted: boolean
  accepted_at: number
  cancelled: boolean
  cancelled_at: number
  acceptance_deadline: number
  acceptance_seconds_remaining: number
  declined: boolean
  declined_at: number
  expired: boolean
  expiry_recorded: boolean
  expired_at: number
  closed: boolean
  closed_at: number
  closed_scope_version: number
  client_close_vote_version: number
  contractor_close_vote_version: number
  client_close_approved: boolean
  contractor_close_approved: boolean
  terminal: boolean
  status:
    | 'PENDING_CONTRACTOR_ACCEPTANCE'
    | 'ACTIVE'
    | 'CANCELLED'
    | 'DECLINED'
    | 'EXPIRED'
    | 'CLOSED'
    | string
  created_at: number
}

export type ClientProjectSummary = {
  project_id: number
  contractor: string
  active_scope_version: number
  request_count: number
  scope_version_count?: number
  accepted: boolean
  cancelled: boolean
  declined?: boolean
  expired?: boolean
  closed?: boolean
  acceptance_deadline?: number
  status:
    | 'PENDING_CONTRACTOR_ACCEPTANCE'
    | 'ACTIVE'
    | 'CANCELLED'
    | 'DECLINED'
    | 'EXPIRED'
    | 'CLOSED'
    | string
  created_at: number
}

export type ClientProjectPage = {
  client: string
  from_index: number
  count: number
  total: number
  items: ClientProjectSummary[]
}

export type ScopeRequest = {
  project_id?: number
  request_id: number
  submitter: string
  request_text: string
  classification: 'SCOPE_IN' | 'SCOPE_EXTENSION' | 'SCOPE_UNCLEAR' | string
  classified_against_version: number
  client_approved: boolean
  contractor_approved: boolean
  rejected?: boolean
  applied?: boolean
  created_at?: number
  status: string
}


export type ScopeVersionSummary = {
  version: number
  previous_version: number
  origin: 'INITIAL_SCOPE' | 'APPROVED_EXTENSION' | string
  originating_request_id: number
  extension_text: string
  scope_length: number
  effective_at: number
  client_approved: boolean
  contractor_approved: boolean
  active: boolean
}

export type ScopeVersionDetail = ScopeVersionSummary & {
  project_id: number
  scope_text: string
}

export type ScopeVersionPage = {
  project_id: number
  from_version: number
  count: number
  total: number
  items: ScopeVersionSummary[]
}

export type RequestPage = {
  project_id: number
  from_id: number
  count: number
  total: number
  items: ScopeRequest[]
}

export type WriteOutcome =
  | { kind: 'succeeded'; hash: `0x${string}` }
  | { kind: 'failed'; hash: `0x${string}`; error: string }
  | { kind: 'submitted'; hash: `0x${string}`; warning: string }

const readClient = createClient({
  chain: studionet,
})

function parseJsonResult<T>(value: unknown): T {
  let current: unknown = value

  for (let i = 0; i < 3; i += 1) {
    if (typeof current !== 'string') break
    const trimmed = current.trim()

    try {
      current = JSON.parse(trimmed)
    } catch {
      break
    }
  }

  if (typeof current !== 'object' || current === null) {
    throw new Error('Contract returned an unexpected value.')
  }

  return current as T
}

function requireProvider(): EthereumProvider {
  if (!window.ethereum) {
    throw new Error('MetaMask or another EIP-1193 wallet is required.')
  }

  return window.ethereum
}

export async function connectWallet(): Promise<`0x${string}`> {
  const provider = requireProvider()

  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
  })) as string[]

  const address = accounts?.[0]
  if (!address) {
    throw new Error('No wallet account was returned.')
  }

  const account = address as `0x${string}`

  const walletClient = createClient({
    chain: studionet,
    account,
    provider,
  })

  await walletClient.connect('studionet')
  return account
}

export async function readRegistry(): Promise<RegistryState> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_registry',
    args: [],
  })

  return parseJsonResult<RegistryState>(result)
}

export async function readProject(projectId: number): Promise<ScopeProject> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_project',
    args: [projectId],
  })

  return parseJsonResult<ScopeProject>(result)
}

export async function readProjectsByClient(
  client: string,
  fromIndex = 1,
  count = 20,
): Promise<ClientProjectPage> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_projects_by_client',
    args: [client, fromIndex, count],
  })

  return parseJsonResult<ClientProjectPage>(result)
}

export async function readRequestPage(
  projectId: number,
  fromId: number,
  count: number,
): Promise<RequestPage> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_requests',
    args: [projectId, fromId, count],
  })

  return parseJsonResult<RequestPage>(result)
}

export async function readScopeVersion(
  projectId: number,
  version: number,
): Promise<ScopeVersionDetail> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_scope_version',
    args: [projectId, version],
  })

  return parseJsonResult<ScopeVersionDetail>(result)
}

export async function readScopeVersions(
  projectId: number,
  fromVersion = 1,
  count = 20,
): Promise<ScopeVersionPage> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_scope_versions',
    args: [projectId, fromVersion, count],
  })

  return parseJsonResult<ScopeVersionPage>(result)
}

export async function readRequest(
  projectId: number,
  requestId: number,
): Promise<ScopeRequest> {
  const result = await readClient.readContract({
    address: CONTRACT_ADDRESS,
    functionName: 'get_request',
    args: [projectId, requestId],
  })

  return parseJsonResult<ScopeRequest>(result)
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(() => {
      reject(new Error('Receipt monitoring timed out.'))
    }, ms)
  })
}

async function submitWrite(
  account: `0x${string}`,
  functionName: string,
  args: Array<string | number>,
): Promise<WriteOutcome> {
  const provider = requireProvider()

  const walletClient = createClient({
    chain: studionet,
    account,
    provider,
  })

  await walletClient.connect('studionet')

  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value: 0n,
  })

  let receipt: Record<string, unknown>

  try {
    receipt = (await Promise.race([
      readClient.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.FINALIZED,
      }),
      timeoutAfter(90_000),
    ])) as Record<string, unknown>

  } catch (error) {
    console.error('Receipt monitoring after submitted transaction:', error)

    return {
      kind: 'submitted',
      hash,
      warning:
        'Transaction was submitted, but automatic confirmation is delayed. Do not submit it again. Open Explorer or use Refresh.',
    }
  }

  const executionName = await waitForExplicitExecutionResult(
    receipt,
    async () =>
      (await readClient.request({
        method: 'eth_getTransactionByHash',
        params: [hash],
      })) as Record<string, unknown>,
  )

  if (executionName === ExecutionResult.FINISHED_WITH_ERROR) {
    return {
      kind: 'failed',
      hash,
      error:
        'Consensus accepted the transaction, but contract execution returned FINISHED_WITH_ERROR. No success is claimed; the project state was refreshed for rollback verification.',
    }
  }

  if (executionName !== ExecutionResult.FINISHED_WITH_RETURN) {
    return {
      kind: 'submitted',
      hash,
      warning:
        'The transaction reached finality, but StudioNet did not expose an explicit execution result within the bounded confirmation window. Do not repeat it; verify it in Explorer or use Refresh.',
    }
  }

  return { kind: 'succeeded', hash }
}

export function createProject(
  account: `0x${string}`,
  contractor: string,
  initialScope: string,
) {
  return submitWrite(account, 'create_project', [contractor, initialScope])
}

export function createProjectWithWindow(
  account: `0x${string}`,
  contractor: string,
  initialScope: string,
  acceptanceWindowSeconds: number,
) {
  return submitWrite(account, 'create_project_with_window', [
    contractor,
    initialScope,
    acceptanceWindowSeconds,
  ])
}

export function acceptProject(
  account: `0x${string}`,
  projectId: number,
) {
  return submitWrite(account, 'accept_project', [projectId])
}

export function cancelProject(
  account: `0x${string}`,
  projectId: number,
) {
  return submitWrite(account, 'cancel_project', [projectId])
}

export function declineProject(
  account: `0x${string}`,
  projectId: number,
) {
  return submitWrite(account, 'decline_project', [projectId])
}

export function expireProject(
  account: `0x${string}`,
  projectId: number,
) {
  return submitWrite(account, 'expire_project', [projectId])
}

export function approveClose(
  account: `0x${string}`,
  projectId: number,
) {
  return submitWrite(account, 'approve_close', [projectId])
}

export function submitRequest(
  account: `0x${string}`,
  projectId: number,
  text: string,
) {
  return submitWrite(account, 'submit_request', [projectId, text])
}

export function approveExtension(
  account: `0x${string}`,
  projectId: number,
  requestId: number,
) {
  return submitWrite(account, 'approve_extension', [projectId, requestId])
}

export function rejectExtension(
  account: `0x${string}`,
  projectId: number,
  requestId: number,
) {
  return submitWrite(account, 'reject_extension', [projectId, requestId])
}

export function explorerAddressUrl() {
  return `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`
}

export function explorerTxUrl(hash: string) {
  return `${EXPLORER_BASE}/transactions/${hash}`
}
