import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { CONTRACT_ADDRESS, EXPLORER_BASE } from './config'

export type RegistryState = {
  project_count: number
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
  created_at: number
}

export type ClientProjectSummary = {
  project_id: number
  contractor: string
  active_scope_version: number
  request_count: number
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

export type RequestPage = {
  project_id: number
  from_id: number
  count: number
  total: number
  items: ScopeRequest[]
}

export type WriteOutcome =
  | { kind: 'accepted'; hash: `0x${string}` }
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

  try {
    const receipt = (await Promise.race([
      readClient.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
      }),
      timeoutAfter(90_000),
    ])) as Record<string, unknown>

    const executionName = String(receipt?.txExecutionResultName ?? '')

    if (/ERROR/i.test(executionName)) {
      throw new Error(
        `Contract execution failed. Open the transaction in Explorer: ${EXPLORER_BASE}/transactions/${hash}`,
      )
    }

    return { kind: 'accepted', hash }
  } catch (error) {
    console.error('Receipt monitoring after submitted transaction:', error)

    return {
      kind: 'submitted',
      hash,
      warning:
        'Transaction was submitted, but automatic confirmation is delayed. Do not submit it again. Open Explorer or use Refresh.',
    }
  }
}

export function createProject(
  account: `0x${string}`,
  contractor: string,
  initialScope: string,
) {
  return submitWrite(account, 'create_project', [contractor, initialScope])
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
