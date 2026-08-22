import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  approveExtension,
  connectWallet,
  createProject,
  explorerAddressUrl,
  explorerTxUrl,
  readProject,
  readProjectsByClient,
  readRegistry,
  readRequestPage,
  rejectExtension,
  submitRequest,
  type ClientProjectSummary,
  type RegistryState,
  type ScopeProject,
  type ScopeRequest,
  type WriteOutcome,
} from './lib/genlayer'
import {
  MAX_REQUEST_LENGTH,
  MAX_SCOPE_LENGTH,
  MIN_REQUEST_LENGTH,
  MIN_SCOPE_LENGTH,
  PAGE_SIZE,
} from './lib/config'
import { normalizeError } from './lib/errors'

type WorkspaceTab = 'project' | 'requests' | 'history'
type Role = 'CLIENT' | 'CONTRACTOR' | 'OBSERVER'
type Notice = {
  kind: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  hash?: string
}

const RECENT_KEY = 'scopeflow-v2-recent-projects'

function shortAddress(value: string) {
  if (!value) return '—'
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

function sameAddress(a?: string, b?: string) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase())
}

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim())
}

function humanClassification(value: string) {
  switch (value) {
    case 'SCOPE_IN':
      return 'In scope'
    case 'SCOPE_EXTENSION':
      return 'Scope extension'
    case 'SCOPE_UNCLEAR':
      return 'Needs clarification'
    default:
      return value.replaceAll('_', ' ')
  }
}

function humanStatus(value: string) {
  return value.replaceAll('_', ' ')
}

function badgeClass(value: string) {
  if (
    value === 'SCOPE_IN' ||
    value === 'ACCEPTED_IN_SCOPE' ||
    value === 'APPROVED_EXTENSION'
  ) {
    return 'badge badge-good'
  }

  if (
    value === 'SCOPE_EXTENSION' ||
    value === 'AWAITING_APPROVAL'
  ) {
    return 'badge badge-warn'
  }

  if (
    value === 'REJECTED_EXTENSION' ||
    value === 'SUPERSEDED'
  ) {
    return 'badge badge-bad'
  }

  return 'badge badge-neutral'
}

function txSummary(outcome: WriteOutcome): Notice {
  if (outcome.kind === 'accepted') {
    return {
      kind: 'success',
      title: 'Transaction accepted',
      message: 'The transaction reached ACCEPTED status. On-chain state can now be refreshed.',
      hash: outcome.hash,
    }
  }

  return {
    kind: 'warning',
    title: 'Submitted — confirmation delayed',
    message: outcome.warning,
    hash: outcome.hash,
  }
}

function getRecentProjectIds(): number[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
      .slice(0, 12)
  } catch {
    return []
  }
}

function rememberProjectId(projectId: number) {
  const next = [
    projectId,
    ...getRecentProjectIds().filter((value) => value !== projectId),
  ].slice(0, 12)

  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}

function RequestCard({
  request,
  project,
  role,
  account,
  busy,
  onApprove,
  onReject,
  compact = false,
}: {
  request: ScopeRequest
  project: ScopeProject
  role: Role
  account: `0x${string}` | null
  busy: string | null
  onApprove: (id: number) => void
  onReject: (id: number) => void
  compact?: boolean
}) {
  const liveExtension =
    request.classification === 'SCOPE_EXTENSION' &&
    request.status === 'AWAITING_APPROVAL'

  const isParty = role === 'CLIENT' || role === 'CONTRACTOR'
  const alreadyApproved =
    role === 'CLIENT'
      ? request.client_approved
      : role === 'CONTRACTOR'
        ? request.contractor_approved
        : false

  let approveReason = ''
  if (!account) approveReason = 'Connect a project-party wallet.'
  else if (!isParty) approveReason = 'Only this project’s Client or Contractor may approve.'
  else if (!liveExtension) approveReason = 'This extension is not awaiting approval.'
  else if (alreadyApproved) approveReason = `The ${role.toLowerCase()} already approved.`

  let rejectReason = ''
  if (!account) rejectReason = 'Connect a project-party wallet.'
  else if (!isParty) rejectReason = 'Only this project’s Client or Contractor may reject.'
  else if (!liveExtension) rejectReason = 'This extension is not awaiting a decision.'

  return (
    <article className={`request-card ${compact ? 'request-card-compact' : ''}`}>
      <div className="request-card-top">
        <div>
          <span className="eyebrow">Request #{request.request_id}</span>
          <h3>{request.request_text}</h3>
        </div>
        <div className="request-badges">
          <span className={badgeClass(request.classification)}>
            {humanClassification(request.classification)}
          </span>
          <span className={badgeClass(request.status)}>
            {humanStatus(request.status)}
          </span>
        </div>
      </div>

      <div className="request-meta">
        <span>
          Submitted by <strong>{shortAddress(request.submitter)}</strong>
        </span>
        <span>
          Judged against <strong>Scope V{request.classified_against_version}</strong>
        </span>
        {request.status === 'SUPERSEDED' && (
          <span>
            Current scope is <strong>V{project.active_scope_version}</strong>
          </span>
        )}
      </div>

      {request.classification === 'SCOPE_EXTENSION' && (
        <div className="approval-grid">
          <div className={request.client_approved ? 'approval approved' : 'approval'}>
            <span>Client</span>
            <strong>{request.client_approved ? 'Approved' : 'Pending'}</strong>
          </div>
          <div
            className={
              request.contractor_approved ? 'approval approved' : 'approval'
            }
          >
            <span>Contractor</span>
            <strong>{request.contractor_approved ? 'Approved' : 'Pending'}</strong>
          </div>
        </div>
      )}

      {!compact && request.classification === 'SCOPE_EXTENSION' && (
        <div className="request-actions">
          <div>
            <button
              className="button button-primary"
              disabled={Boolean(approveReason) || busy !== null}
              onClick={() => onApprove(request.request_id)}
            >
              {busy === `approve-${request.request_id}` ? 'Approving…' : 'Approve'}
            </button>
            {approveReason && <small>{approveReason}</small>}
          </div>
          <div>
            <button
              className="button button-danger"
              disabled={Boolean(rejectReason) || busy !== null}
              onClick={() => onReject(request.request_id)}
            >
              {busy === `reject-${request.request_id}` ? 'Rejecting…' : 'Reject'}
            </button>
            {rejectReason && <small>{rejectReason}</small>}
          </div>
        </div>
      )}
    </article>
  )
}

export default function App() {
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [registry, setRegistry] = useState<RegistryState | null>(null)
  const [myProjects, setMyProjects] = useState<ClientProjectSummary[]>([])
  const [recentProjects, setRecentProjects] = useState<number[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [project, setProject] = useState<ScopeProject | null>(null)
  const [requests, setRequests] = useState<ScopeRequest[]>([])
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('project')
  const [pageStart, setPageStart] = useState(1)

  const [contractorInput, setContractorInput] = useState('')
  const [scopeInput, setScopeInput] = useState('')
  const [openIdInput, setOpenIdInput] = useState('')
  const [requestText, setRequestText] = useState('')

  const [loadingDashboard, setLoadingDashboard] = useState(true)
  const [loadingProject, setLoadingProject] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const role = useMemo<Role>(() => {
    if (project && account && sameAddress(account, project.client)) return 'CLIENT'
    if (project && account && sameAddress(account, project.contractor)) return 'CONTRACTOR'
    return 'OBSERVER'
  }, [account, project])

  const refreshDashboard = useCallback(async (wallet?: string | null) => {
    setLoadingDashboard(true)

    try {
      const nextRegistry = await readRegistry()
      setRegistry(nextRegistry)

      const nextRecent = getRecentProjectIds()
      setRecentProjects(nextRecent)

      const target = wallet ?? account

      if (target) {
        const page = await readProjectsByClient(target, 1, PAGE_SIZE)
        setMyProjects([...page.items].reverse())
      } else {
        setMyProjects([])
      }
    } catch (error) {
      console.error('ScopeFlow dashboard refresh error:', error)
      setNotice({
        kind: 'error',
        title: 'Could not load registry',
        message: normalizeError(error),
      })
    } finally {
      setLoadingDashboard(false)
    }
  }, [account])

  const openProject = useCallback(
    async (projectId: number, requestedStart = 1) => {
      setLoadingProject(true)

      try {
        const nextProject = await readProject(projectId)
        setProject(nextProject)
        setSelectedProjectId(projectId)
        rememberProjectId(projectId)
        setRecentProjects(getRecentProjectIds())

        if (nextProject.request_count === 0) {
          setRequests([])
          setPageStart(1)
        } else {
          let start = requestedStart
          const maxStart =
            Math.floor((nextProject.request_count - 1) / PAGE_SIZE) * PAGE_SIZE + 1

          if (start > maxStart) start = maxStart
          if (start < 1) start = 1

          const count = Math.min(
            PAGE_SIZE,
            nextProject.request_count - start + 1,
          )

          const page = await readRequestPage(projectId, start, count)
          setRequests(page.items)
          setPageStart(start)
        }
      } catch (error) {
        console.error('ScopeFlow open project error:', error)
        setNotice({
          kind: 'error',
          title: 'Could not open project',
          message: normalizeError(error),
        })
      } finally {
        setLoadingProject(false)
      }
    },
    [],
  )

  useEffect(() => {
    void refreshDashboard(null)
    // Initial registry load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!notice || notice.title !== 'Wallet connected') return

    const timer = window.setTimeout(() => {
      setNotice(null)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    const provider = window.ethereum
    if (!provider?.on) return

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = Array.isArray(args[0]) ? (args[0] as string[]) : []
      const next = (accounts[0] as `0x${string}` | undefined) ?? null
      setAccount(next)

      if (next) {
        void refreshDashboard(next)
      } else {
        setMyProjects([])
      }
    }

    provider.on('accountsChanged', handleAccountsChanged)

    return () => {
      provider.removeListener?.('accountsChanged', handleAccountsChanged)
    }
  }, [refreshDashboard])

  async function handleConnect() {
    setBusy('connect')

    try {
      const address = await connectWallet()
      setAccount(address)
      await refreshDashboard(address)
      setNotice({
        kind: 'success',
        title: 'Wallet connected',
        message: `Connected as ${shortAddress(address)}. You can create your own project now.`,
      })
    } catch (error) {
      console.error('Wallet connection error:', error)
      setNotice({
        kind: 'error',
        title: 'Wallet connection failed',
        message: normalizeError(error),
      })
    } finally {
      setBusy(null)
    }
  }

  async function executeWrite(
    key: string,
    fn: () => Promise<WriteOutcome>,
  ): Promise<WriteOutcome | null> {
    if (busy) return null
    setBusy(key)

    try {
      const outcome = await fn()
      setNotice(txSummary(outcome))
      return outcome
    } catch (error) {
      console.error(`ScopeFlow ${key} error:`, error)
      setNotice({
        kind: 'error',
        title: 'Transaction not submitted',
        message: normalizeError(error),
      })
      return null
    } finally {
      setBusy(null)
    }
  }

  async function handleCreateProject() {
    if (!account) {
      setNotice({
        kind: 'error',
        title: 'Connect wallet',
        message: 'Connect your wallet before creating a project.',
      })
      return
    }

    const contractor = contractorInput.trim()
    const scope = scopeInput.trim()

    if (!isAddress(contractor)) {
      setNotice({
        kind: 'error',
        title: 'Invalid Contractor',
        message: 'Enter a valid 0x Contractor address.',
      })
      return
    }

    if (sameAddress(contractor, account)) {
      setNotice({
        kind: 'error',
        title: 'Choose another Contractor',
        message: 'Client and Contractor must be different addresses.',
      })
      return
    }

    if (scope.length < MIN_SCOPE_LENGTH || scope.length > MAX_SCOPE_LENGTH) {
      setNotice({
        kind: 'error',
        title: 'Invalid scope length',
        message: `Initial scope must contain ${MIN_SCOPE_LENGTH}–${MAX_SCOPE_LENGTH} characters.`,
      })
      return
    }

    const outcome = await executeWrite('create-project', () =>
      createProject(account, contractor, scope),
    )

    if (!outcome || outcome.kind !== 'accepted') return

    await new Promise((resolve) => window.setTimeout(resolve, 1200))
    await refreshDashboard(account)

    try {
      const page = await readProjectsByClient(account, 1, PAGE_SIZE)
      const latest = [...page.items].sort((a, b) => b.project_id - a.project_id)[0]

      if (latest) {
        setContractorInput('')
        setScopeInput('')
        await openProject(latest.project_id)
        setWorkspaceTab('project')
      }
    } catch (error) {
      console.error('Could not auto-open created project:', error)
      setNotice({
        kind: 'info',
        title: 'Project created',
        message: 'Creation was accepted. Refresh My Projects to open the new project.',
        hash: outcome.hash,
      })
    }
  }

  async function handleOpenById() {
    const projectId = Number(openIdInput)

    if (!Number.isInteger(projectId) || projectId <= 0) {
      setNotice({
        kind: 'error',
        title: 'Invalid project id',
        message: 'Enter a positive project id.',
      })
      return
    }

    await openProject(projectId)
    setWorkspaceTab('project')
  }

  async function handleSubmitRequest() {
    if (!account || !project) return

    const clean = requestText.trim()

    if (
      clean.length < MIN_REQUEST_LENGTH ||
      clean.length > MAX_REQUEST_LENGTH
    ) {
      setNotice({
        kind: 'error',
        title: 'Invalid request length',
        message: `Change request must contain ${MIN_REQUEST_LENGTH}–${MAX_REQUEST_LENGTH} characters.`,
      })
      return
    }

    const outcome = await executeWrite('submit-request', () =>
      submitRequest(account, project.project_id, clean),
    )

    if (outcome?.kind === 'accepted') {
      setRequestText('')
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      await openProject(project.project_id, pageStart)
    }
  }

  async function handleApprove(requestId: number) {
    if (!account || !project) return

    const outcome = await executeWrite(`approve-${requestId}`, () =>
      approveExtension(account, project.project_id, requestId),
    )

    if (outcome?.kind === 'accepted') {
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      await openProject(project.project_id, pageStart)
    }
  }

  async function handleReject(requestId: number) {
    if (!account || !project) return

    const outcome = await executeWrite(`reject-${requestId}`, () =>
      rejectExtension(account, project.project_id, requestId),
    )

    if (outcome?.kind === 'accepted') {
      await new Promise((resolve) => window.setTimeout(resolve, 1200))
      await openProject(project.project_id, pageStart)
    }
  }

  function closeProject() {
    setSelectedProjectId(null)
    setProject(null)
    setRequests([])
    setWorkspaceTab('project')
    setOpenIdInput('')
    void refreshDashboard(account)
  }

  const actionable = requests.filter(
    (item) =>
      item.classification === 'SCOPE_EXTENSION' &&
      item.status === 'AWAITING_APPROVAL',
  )

  const capacityPercent = project
    ? Math.min(100, Math.round((project.scope_length / MAX_SCOPE_LENGTH) * 100))
    : 0

  const canSubmit =
    Boolean(account && project) && (role === 'CLIENT' || role === 'CONTRACTOR')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="sidebar-brand" onClick={closeProject}>
          <img src="/scopeflow-logo.svg" alt="ScopeFlow logo" />
          <span>
            <strong>ScopeFlow</strong>
            <small>GenLayer project</small>
          </span>
        </button>

        <nav className="sidebar-nav" aria-label="ScopeFlow navigation">
          <button
            className={!project ? 'sidebar-link active' : 'sidebar-link'}
            onClick={closeProject}
          >
            <span className="nav-icon">⌂</span>
            Dashboard
          </button>

          {project && (
            <>
              <button
                className={workspaceTab === 'project' ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => setWorkspaceTab('project')}
              >
                <span className="nav-icon">▣</span>
                Project scope
              </button>
              <button
                className={workspaceTab === 'requests' ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => setWorkspaceTab('requests')}
              >
                <span className="nav-icon">⇄</span>
                Change requests
                {actionable.length > 0 && <span className="nav-count">{actionable.length}</span>}
              </button>
              <button
                className={workspaceTab === 'history' ? 'sidebar-link active' : 'sidebar-link'}
                onClick={() => setWorkspaceTab('history')}
              >
                <span className="nav-icon">↺</span>
                History
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="network-card">
            <span className="network-dot" />
            <div>
              <strong>StudioNet</strong>
              <small>Chain ID 61999</small>
            </div>
          </div>
          <a className="sidebar-contract" href={explorerAddressUrl()} target="_blank" rel="noreferrer">
            Contract 0xBC87…7F4A <span>↗</span>
          </a>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-context">
            <span>PROJECT / SCOPEFLOW</span>
            <strong>{project ? `Project #${project.project_id}` : 'Dashboard'}</strong>
          </div>

          <div className="topbar-actions">
            <a className="genlayer-badge" href="https://genlayer.com" target="_blank" rel="noreferrer">
              <img src="/genlayer-logo.jpg" alt="GenLayer logo" />
              <span>Built on GenLayer</span>
            </a>
            {account && (
              <div className="role-pill">
                {project && <span>{role}</span>}
                <strong>{shortAddress(account)}</strong>
              </div>
            )}
            <button
              className="button button-wallet"
              onClick={handleConnect}
              disabled={busy !== null}
            >
              {busy === 'connect'
                ? 'Connecting…'
                : account
                  ? 'Switch wallet'
                  : 'Connect wallet'}
            </button>
          </div>
        </header>

        <main className="content">
        {!project ? (
          <>
            <section className="hero dashboard-hero">
              <div className="hero-copy">
                <div className="hero-brandline">
                  <img src="/scopeflow-logo.svg" alt="ScopeFlow logo" />
                  <span>ScopeFlow · Consensus-governed scope</span>
                </div>
                <h1>Keep project scope clear as the work evolves.</h1>
                <p>
                  Lock the agreed scope, submit change requests, and let GenLayer classify
                  whether each request is already covered, extends the agreement, or needs clarification.
                </p>
                <div className="hero-actions">
                  <a className="button button-hero" href="#create-project">Create a project</a>
                  <a className="button button-hero-secondary" href={explorerAddressUrl()} target="_blank" rel="noreferrer">
                    View contract ↗
                  </a>
                </div>
              </div>

              <div className="hero-visual">
                <div className="hero-genlayer">
                  <img src="/genlayer-logo.jpg" alt="GenLayer logo" />
                  <span>Built on GenLayer</span>
                </div>
                <div className="scope-orbit orbit-one" />
                <div className="scope-orbit orbit-two" />
                <div className="scope-state-card">
                  <small>Registry state</small>
                  <strong>
                    {registry?.project_count ?? '—'}{' '}
                    {registry?.project_count === 1 ? 'project' : 'projects'}
                  </strong>
                  <span>Scope decisions backed by validator consensus</span>
                </div>
              </div>
            </section>

            <section className="metric-strip">
              <div className="metric-card">
                <span>Registry projects</span>
                <strong>{registry?.project_count ?? '—'}</strong>
                <small>Multi-tenant contract</small>
              </div>
              <div className="metric-card">
                <span>My projects</span>
                <strong>{account ? myProjects.length : '—'}</strong>
                <small>{account ? 'Created by this wallet' : 'Connect wallet to load'}</small>
              </div>
              <div className="metric-card">
                <span>Decision paths</span>
                <strong>3</strong>
                <small>In scope · Extension · Unclear</small>
              </div>
              <a className="metric-card metric-link" href={explorerAddressUrl()} target="_blank" rel="noreferrer">
                <span>Contract</span>
                <strong>0xBC87…7F4A</strong>
                <small>Open Explorer ↗</small>
              </a>
            </section>

            <section className="self-service-banner">
              <div className="self-service-icon">✓</div>
              <div>
                <strong>No deployer permission required.</strong>
                <span>
                  Connect your own wallet → create a project → your wallet becomes that
                  project’s Client.
                </span>
              </div>
            </section>

            <div className="dashboard-grid">
              <section className="panel create-panel" id="create-project">
                <span className="eyebrow">CREATE PROJECT</span>
                <h2>Start a new ScopeFlow project</h2>
                <p>
                  Your connected wallet becomes Client. Choose a different wallet as
                  Contractor and lock the initial scope.
                </p>

                <label>
                  <span>Contractor address</span>
                  <input
                    value={contractorInput}
                    onChange={(event) => setContractorInput(event.target.value)}
                    placeholder="0x..."
                    maxLength={42}
                  />
                </label>

                <label>
                  <span>Initial scope</span>
                  <textarea
                    value={scopeInput}
                    onChange={(event) => setScopeInput(event.target.value)}
                    maxLength={MAX_SCOPE_LENGTH}
                    rows={7}
                    placeholder="Describe the work already agreed between Client and Contractor..."
                  />
                </label>

                <div className="input-footer">
                  <span>
                    {scopeInput.length} / {MAX_SCOPE_LENGTH}
                  </span>
                  <button
                    className="button button-primary"
                    disabled={
                      busy !== null ||
                      !account ||
                      !isAddress(contractorInput) ||
                      scopeInput.trim().length < MIN_SCOPE_LENGTH
                    }
                    onClick={() => void handleCreateProject()}
                  >
                    {busy === 'create-project' ? 'Creating…' : 'Create Project'}
                  </button>
                </div>

                {!account && (
                  <small className="form-reason">
                    Connect your wallet first. Any wallet can create a project.
                  </small>
                )}
              </section>

              <div className="dashboard-side">
                <section className="panel open-panel">
                  <span className="eyebrow">OPEN ANY PROJECT</span>
                  <h2>Open by project ID</h2>
                  <p>
                    Useful for Contractors, reviewers, or anyone opening a shared project.
                  </p>

                  <div className="open-row">
                    <input
                      type="number"
                      min="1"
                      value={openIdInput}
                      onChange={(event) => setOpenIdInput(event.target.value)}
                      placeholder="Project ID"
                    />
                    <button
                      className="button button-secondary"
                      disabled={loadingProject || !openIdInput}
                      onClick={() => void handleOpenById()}
                    >
                      {loadingProject ? 'Opening…' : 'Open'}
                    </button>
                  </div>
                </section>

                <section className="panel projects-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">MY PROJECTS</span>
                      <h2>Created by this wallet</h2>
                    </div>
                    <button
                      className="button button-ghost"
                      onClick={() => void refreshDashboard(account)}
                      disabled={loadingDashboard}
                    >
                      Refresh
                    </button>
                  </div>

                  {!account ? (
                    <div className="mini-empty">Connect wallet to load your projects.</div>
                  ) : myProjects.length === 0 ? (
                    <div className="mini-empty">
                      No project created by this wallet yet.
                    </div>
                  ) : (
                    <div className="project-list">
                      {myProjects.map((item) => (
                        <button
                          className="project-list-item"
                          key={item.project_id}
                          onClick={() => void openProject(item.project_id)}
                        >
                          <div>
                            <strong>Project #{item.project_id}</strong>
                            <small>Contractor {shortAddress(item.contractor)}</small>
                          </div>
                          <div>
                            <span>V{item.active_scope_version}</span>
                            <small>{item.request_count} requests</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {recentProjects.length > 0 && (
                  <section className="panel recent-panel">
                    <span className="eyebrow">RECENTLY OPENED</span>
                    <div className="recent-pills">
                      {recentProjects.map((id) => (
                        <button key={id} onClick={() => void openProject(id)}>
                          #{id}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <section className="workspace-header">
              <div>
                <button className="back-link" onClick={closeProject}>
                  ← All projects
                </button>
                <span className="eyebrow">PROJECT #{project.project_id}</span>
                <h1>Scope V{project.active_scope_version}</h1>
                <div className="workspace-meta">
                  <span>
                    Client <strong>{shortAddress(project.client)}</strong>
                  </span>
                  <span>
                    Contractor <strong>{shortAddress(project.contractor)}</strong>
                  </span>
                  <span className={`workspace-role role-${role.toLowerCase()}`}>
                    {role}
                  </span>
                </div>
              </div>

              <button
                className="button button-secondary"
                disabled={loadingProject || busy !== null}
                onClick={() => void openProject(project.project_id, pageStart)}
              >
                {loadingProject ? 'Refreshing…' : 'Refresh Project'}
              </button>
            </section>

            <nav className="tabs" aria-label="ScopeFlow project sections">
              <button
                className={workspaceTab === 'project' ? 'tab active' : 'tab'}
                onClick={() => setWorkspaceTab('project')}
              >
                Project
              </button>
              <button
                className={workspaceTab === 'requests' ? 'tab active' : 'tab'}
                onClick={() => setWorkspaceTab('requests')}
              >
                Change Requests
                {actionable.length > 0 && (
                  <span className="tab-count">{actionable.length}</span>
                )}
              </button>
              <button
                className={workspaceTab === 'history' ? 'tab active' : 'tab'}
                onClick={() => setWorkspaceTab('history')}
              >
                History
              </button>
            </nav>

            {workspaceTab === 'project' && (
              <div className="project-layout">
                <section className="panel scope-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">ACTIVE AGREEMENT</span>
                      <h2>Scope V{project.active_scope_version}</h2>
                    </div>
                    <span className="project-id-chip">Project #{project.project_id}</span>
                  </div>

                  <div className="scope-document">
                    {project.active_scope
                      .split('<<<SCOPEGUARD_APPROVED_EXTENSION>>>')
                      .map((part, index) => (
                        <div key={`${index}-${part.slice(0, 20)}`}>
                          {index > 0 && (
                            <div className="extension-divider">Approved extension</div>
                          )}
                          <p>{part.trim()}</p>
                        </div>
                      ))}
                  </div>

                  <div className="capacity">
                    <div>
                      <span>Scope capacity</span>
                      <strong>
                        {project.scope_length} / {MAX_SCOPE_LENGTH} characters
                      </strong>
                    </div>
                    <div className="capacity-track">
                      <div
                        className="capacity-fill"
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>
                    <small>{project.scope_capacity_left} characters remaining</small>
                  </div>
                </section>

                <aside className="side-stack">
                  <section className="panel">
                    <span className="eyebrow">PROJECT PARTIES</span>
                    <div className="party-row">
                      <div>
                        <small>Client</small>
                        <strong>{shortAddress(project.client)}</strong>
                      </div>
                      {role === 'CLIENT' && <span className="you-tag">You</span>}
                    </div>
                    <div className="party-row">
                      <div>
                        <small>Contractor</small>
                        <strong>{shortAddress(project.contractor)}</strong>
                      </div>
                      {role === 'CONTRACTOR' && <span className="you-tag">You</span>}
                    </div>
                  </section>

                  <section className="panel stats-card">
                    <div>
                      <small>Scope version</small>
                      <strong>{project.active_scope_version}</strong>
                    </div>
                    <div>
                      <small>Requests</small>
                      <strong>{project.request_count}</strong>
                    </div>
                  </section>

                  <section className="panel explainer">
                    <span className="eyebrow">SEMANTIC GATE</span>
                    <ol>
                      <li>
                        <strong>In scope</strong>
                        <span>No new approval right.</span>
                      </li>
                      <li>
                        <strong>Scope extension</strong>
                        <span>Both parties must consent.</span>
                      </li>
                      <li>
                        <strong>Needs clarification</strong>
                        <span>Scope remains unchanged.</span>
                      </li>
                    </ol>
                  </section>
                </aside>
              </div>
            )}

            {workspaceTab === 'requests' && (
              <div className="requests-layout">
                <section className="panel submit-panel">
                  <span className="eyebrow">NEW CHANGE REQUEST</span>
                  <h2>Test the boundary of Scope V{project.active_scope_version}</h2>
                  <p>
                    Client and Contractor may both submit. GenLayer classifies the request
                    against this project’s current scope.
                  </p>

                  <textarea
                    value={requestText}
                    maxLength={MAX_REQUEST_LENGTH}
                    onChange={(event) => setRequestText(event.target.value)}
                    placeholder="Example: Add a full dark mode theme across every page of the website."
                    rows={7}
                  />

                  <div className="input-footer">
                    <span>
                      {requestText.length} / {MAX_REQUEST_LENGTH}
                    </span>
                    <button
                      className="button button-primary"
                      disabled={
                        busy !== null ||
                        !canSubmit ||
                        requestText.trim().length < MIN_REQUEST_LENGTH
                      }
                      onClick={() => void handleSubmitRequest()}
                    >
                      {busy === 'submit-request'
                        ? 'Submitting…'
                        : 'Submit for consensus'}
                    </button>
                  </div>

                  {!account && (
                    <small className="form-reason">Connect a project-party wallet.</small>
                  )}
                  {account && role === 'OBSERVER' && (
                    <small className="form-reason">
                      This wallet is an Observer for Project #{project.project_id}. Open
                      your own project or switch to its Client/Contractor wallet to write.
                    </small>
                  )}
                </section>

                <section className="action-list">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">ACTION REQUIRED</span>
                      <h2>Live extensions</h2>
                    </div>
                    <span>{actionable.length} awaiting decision</span>
                  </div>

                  {actionable.length === 0 ? (
                    <div className="panel empty-state">
                      No extension on this page is waiting for approval.
                    </div>
                  ) : (
                    actionable.map((request) => (
                      <RequestCard
                        key={request.request_id}
                        request={request}
                        project={project}
                        role={role}
                        account={account}
                        busy={busy}
                        onApprove={(id) => void handleApprove(id)}
                        onReject={(id) => void handleReject(id)}
                      />
                    ))
                  )}
                </section>
              </div>
            )}

            {workspaceTab === 'history' && (
              <section className="history-section">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">APPEND-ONLY HISTORY</span>
                    <h2>Project #{project.project_id} decisions</h2>
                  </div>
                </div>

                {requests.length === 0 ? (
                  <div className="panel empty-state">
                    No requests have been recorded for this project.
                  </div>
                ) : (
                  <div className="history-list">
                    {requests.map((request) => (
                      <RequestCard
                        key={request.request_id}
                        request={request}
                        project={project}
                        role={role}
                        account={account}
                        busy={busy}
                        onApprove={(id) => void handleApprove(id)}
                        onReject={(id) => void handleReject(id)}
                        compact
                      />
                    ))}
                  </div>
                )}

                {project.request_count > PAGE_SIZE && (
                  <div className="pagination">
                    <button
                      className="button button-secondary"
                      disabled={pageStart <= 1 || loadingProject}
                      onClick={() =>
                        void openProject(
                          project.project_id,
                          Math.max(1, pageStart - PAGE_SIZE),
                        )
                      }
                    >
                      Newer
                    </button>

                    <span>
                      {pageStart}–
                      {Math.min(pageStart + PAGE_SIZE - 1, project.request_count)} of{' '}
                      {project.request_count}
                    </span>

                    <button
                      className="button button-secondary"
                      disabled={
                        pageStart + PAGE_SIZE > project.request_count ||
                        loadingProject
                      }
                      onClick={() =>
                        void openProject(project.project_id, pageStart + PAGE_SIZE)
                      }
                    >
                      Older
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
        </main>
      </div>

      {notice && (
        <aside className={`toast toast-${notice.kind}`} role="status">
          <button
            className="toast-close"
            aria-label="Close notification"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
          <strong>{notice.title}</strong>
          <p>{notice.message}</p>
          {notice.hash && (
            <a href={explorerTxUrl(notice.hash)} target="_blank" rel="noreferrer">
              View transaction {shortAddress(notice.hash)} ↗
            </a>
          )}
        </aside>
      )}
    </div>
  )
}
