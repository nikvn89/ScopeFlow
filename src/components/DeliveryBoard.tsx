import {useCallback, useEffect, useRef, useState} from 'react'
import {deliveryWrite, readMilestones, readMilestone, readPaymentReceipts, readDeliveryAttempts, readProject, type ScopeProject} from '../lib/genlayer'
import {allocationVerified, milestoneActions, unchangedMoney, type Milestone, type PaymentReceipt, type DeliveryAttempt, type DeliveryReview} from '../lib/delivery'
import {formatGen, parseGen, wei, type Role} from '../lib/escrow'
import {normalizeError} from '../lib/errors'

type Notice = {kind: 'success' | 'error' | 'warning' | 'info'; title: string; message: string; hash?: string}
type Props = {project: ScopeProject; role: Role; account: `0x${string}` | null; busy: string | null;
  onBusy: (value: string | null) => void; onNotice: (notice: Notice) => void; onRefresh: () => Promise<void>}
type Action = 'propose_milestone' | 'accept_milestone' | 'cancel_milestone' | 'submit_delivery' | 'request_delivery_revision' | 'approve_delivery'
type History = {submission: DeliveryAttempt; review: DeliveryReview | null}[]
const date = (unix: number) => unix ? new Date(unix * 1000).toLocaleString() : '—'

export default function DeliveryBoard({project, role, account, busy, onBusy, onNotice, onRefresh}: Props) {
  const [items, setItems] = useState<Milestone[]>([])
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [history, setHistory] = useState<History>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [criteria, setCriteria] = useState('')
  const [budget, setBudget] = useState('')
  const [report, setReport] = useState('')
  const [url, setUrl] = useState('')
  const [revision, setRevision] = useState('')
  const [localPending, setLocalPending] = useState(false)
  const inFlight = useRef(false)
  const selected = items.find(m => m.milestone_id === selectedId)
  const disabled = busy !== null || localPending || loading || !!loadError

  const load = useCallback(async () => {
    setLoading(true); setLoadError('')
    try {
      const [milestones, payments] = await Promise.all([readMilestones(project.project_id), readPaymentReceipts(project.project_id)])
      setItems(milestones.items); setReceipts(payments.items)
      setSelectedId(current => milestones.items.some(m => m.milestone_id === current) ? current : milestones.items[0]?.milestone_id ?? null)
    } catch (e) {setLoadError(normalizeError(e)); setItems([]); setReceipts([])}
    finally {setLoading(false)}
  }, [project.project_id])
  useEffect(() => {void load()}, [load, project.milestone_count, project.payment_revision, project.status, project.chain_timestamp])
  useEffect(() => {
    if (!selectedId) {setHistory([]); return}
    let stale = false
    setHistoryLoading(true); setHistory([])
    readDeliveryAttempts(project.project_id, selectedId).then(page => {if (!stale) setHistory(page.items)})
      .catch(e => {if (!stale) onNotice({kind:'error', title:'Could not read delivery history',message:normalizeError(e)})})
      .finally(() => {if (!stale) setHistoryLoading(false)})
    return () => {stale = true}
  }, [project.project_id, selectedId, selected?.attempt_count, selected?.status])
  useEffect(() => {setReport(''); setUrl(''); setRevision('')}, [selectedId])

  async function act(method: Action, m?: Milestone) {
    if (!account || inFlight.current || disabled) return
    inFlight.current = true; setLocalPending(true); onBusy('delivery')
    let hash: string | undefined
    try {
      // Capture the displayed intent before signing. Read poststate separately.
      const before = await readProject(project.project_id)
      let args: Array<string | number | bigint> = [project.project_id]
      let amount = 0n
      if (method === 'propose_milestone') {
        amount = parseGen(budget)
        if (title.trim().length < 3 || criteria.trim().length < 20 || amount <= 0n) throw new Error('Enter a title, at least 20 characters of criteria and a positive GEN budget.')
        args.push(title.trim(), criteria.trim(), amount)
      } else {
        if (!m) throw new Error('Select a milestone.')
        args.push(m.milestone_id)
        if (method === 'submit_delivery') args.push(report.trim(), url.trim())
        if (method === 'approve_delivery') args.push(m.latest_attempt_id)
        if (method === 'request_delivery_revision') args.push(m.latest_attempt_id, revision.trim())
      }
      const outcome = await deliveryWrite(account, method, args)
      hash = outcome.hash
      if (outcome.kind !== 'succeeded') {
        onNotice({kind:outcome.kind==='failed'?'error':'warning',title:outcome.kind==='failed'?'Contract rejected transaction':'Confirmation pending',
          message:outcome.kind==='failed'?outcome.error:outcome.warning,hash})
        await onRefresh(); await load(); return
      }
      const [after, page] = await Promise.all([readProject(project.project_id), readPaymentReceipts(project.project_id)])
      let verified = false
      if (method === 'propose_milestone') {
        const next = await readMilestone(project.project_id, (before.milestone_count ?? 0) + 1)
        verified = after.milestone_count === (before.milestone_count ?? 0) + 1 && next.title===title.trim()
          && next.criteria===criteria.trim() && wei(next.budget_wei)===amount && next.status==='PROPOSED'
          && unchangedMoney(before,after) && before.reserved_wei===after.reserved_wei
        if (verified) {setTitle('');setCriteria('');setBudget('');setSelectedId(next.milestone_id)}
      } else if (m) {
        const next = await readMilestone(project.project_id,m.milestone_id)
        const identicalTerms = next.criteria_hash===m.criteria_hash && next.budget_wei===m.budget_wei
        if (method==='approve_delivery') verified=allocationVerified(before,after,m,next,page.items,project.project_id,account)
        else if (method==='accept_milestone') verified=identicalTerms && next.status==='ACTIVE' && next.agreed_scope_version===before.active_scope_version
          && wei(after.reserved_wei)===wei(before.reserved_wei)+wei(m.budget_wei)
          && after.payment_revision===(before.payment_revision??0)+1 && unchangedMoney(before,after)
        else if (method==='cancel_milestone') verified=identicalTerms && next.status==='CANCELLED' && unchangedMoney(before,after) && before.reserved_wei===after.reserved_wei
        else if (method==='submit_delivery') verified=identicalTerms && next.status==='SUBMITTED' && next.attempt_count===m.attempt_count+1
          && next.latest_attempt?.report===report.trim() && next.latest_attempt?.artifact_url===url.trim()
          && ['DELIVERY_MATCHES','DELIVERY_GAPS','DELIVERY_UNCLEAR'].includes(next.latest_attempt?.decision??'')
          && unchangedMoney(before,after) && before.reserved_wei===after.reserved_wei
        else if (method==='request_delivery_revision') verified=identicalTerms && next.status==='REVISION_REQUESTED' && next.latest_attempt_id===m.latest_attempt_id
          && next.latest_review?.note===revision.trim() && next.latest_review.action==='REVISION_REQUESTED' && unchangedMoney(before,after)
        if (verified && method==='submit_delivery') {setReport('');setUrl('')}
        if (verified && method==='request_delivery_revision') setRevision('')
      }
      onNotice({kind:verified?'success':'warning',title:verified?'Finalized state verified':'Postcondition not verified',
        message:verified?(method==='approve_delivery'?'Milestone budget allocated. Contractor can withdraw it while the project stays active.':'Delivery board updated from finalized contract state.'):
        'Execution returned, but the expected state was not confirmed. Refresh and inspect the transaction before doing anything again.',hash})
      await onRefresh(); await load()
    } catch (e) {
      onNotice({kind:'error', title:hash?'Postcondition read failed':'Delivery action failed',
        message:normalizeError(e)+(hash?' Do not repeat the transaction; refresh first.':''),hash})
    } finally {inFlight.current=false;setLocalPending(false);onBusy(null)}
  }

  const actions = selected ? milestoneActions(project,selected,role) : null
  const paid = receipts.reduce((sum,r) => sum+wei(r.amount_wei),0n)
  return <section className="delivery-board" aria-label="Milestone delivery board">
    <div className="delivery-intro">
      <div><span className="eyebrow">DELIVERY & PAYMENTS · V5</span><h2>Agree the work. Review the delivery. Release its budget.</h2>
        <p>Each accepted milestone keeps its own fixed criteria. GenLayer reviews the report; the Client approves the exact submission before money becomes withdrawable.</p></div>
      <button className="button button-secondary" disabled={disabled} onClick={() => {void onRefresh();void load()}}>Refresh board</button>
    </div>
    <div className="delivery-stats">
      <div><small>Unreserved escrow</small><strong>{formatGen(wei(project.available_wei))}</strong></div>
      <div><small>Reserved for agreed work</small><strong>{formatGen(wei(project.reserved_wei))}</strong></div>
      <div><small>Milestone allocations</small><strong>{formatGen(paid)}</strong><small>Withdrawals are separate</small></div>
      <div><small>Work items</small><strong>{items.length} / 20</strong><small>{items.filter(m=>m.status==='PAID').length} approved</small></div>
    </div>
    {loadError && <div className="notice notice-error" role="alert">Could not read the board: {loadError} <button onClick={()=>void load()}>Retry</button></div>}
    {loading && <p role="status">Reading finalized delivery state…</p>}
    <div className="delivery-columns">
      <aside className="panel delivery-list">
        <span className="eyebrow">MILESTONE BOARD</span><h3>Agreed pieces of work</h3>
        {items.length===0 && !loading && !loadError && <p>No milestones yet. The Client can propose the first one below.</p>}
        <div className="milestone-list">{items.map(m=><button key={m.milestone_id} className={'milestone-select '+(selectedId===m.milestone_id?'selected':'')}
          disabled={localPending} onClick={()=>setSelectedId(m.milestone_id)}>
          <span className="milestone-select-top"><b>#{m.milestone_id} · {m.title}</b><span className={'delivery-status status-'+m.status.toLowerCase()}>{m.status.replaceAll('_',' ')}</span></span>
          <span>{formatGen(wei(m.budget_wei))} · {m.attempt_count}/5 submissions</span>
        </button>)}</div>
        {role==='CLIENT' && project.status==='ACTIVE' && <form className="milestone-create" onSubmit={e=>{e.preventDefault();void act('propose_milestone')}}>
          <h3>Propose a milestone</h3>
          <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} minLength={3} required disabled={disabled}/></label>
          <label>Acceptance criteria<textarea value={criteria} onChange={e=>setCriteria(e.target.value)} minLength={20} maxLength={2000} required rows={5} disabled={disabled} placeholder="Describe each requirement the delivery must address."/></label>
          <small>{criteria.length}/2000 · Fixed once proposed</small>
          <label>Budget in GEN<input inputMode="decimal" value={budget} onChange={e=>setBudget(e.target.value)} required disabled={disabled} placeholder="0.001"/></label>
          <p>Proposing does not reserve funds. The Contractor accepts against the current scope and available escrow.</p>
          <button className="button button-primary" disabled={disabled||items.length>=20}>Propose milestone</button>
        </form>}
      </aside>
      <div className="delivery-detail panel">
        {!selected ? <div className="delivery-empty"><h3>Choose a milestone</h3><p>Criteria, submissions and approvals will appear here.</p></div> : <>
          <div className="delivery-detail-title"><div><span className="eyebrow">MILESTONE #{selected.milestone_id}</span><h2>{selected.title}</h2></div><span className={'delivery-status status-'+selected.status.toLowerCase()}>{selected.status.replaceAll('_',' ')}</span></div>
          <div className="delivery-terms"><div><small>Budget</small><strong>{formatGen(wei(selected.budget_wei))}</strong></div><div><small>Scope at agreement</small><strong>{selected.agreed_scope_version?'V'+selected.agreed_scope_version:'Awaiting acceptance'}</strong></div><div><small>Submitted attempts</small><strong>{selected.attempt_count} / 5</strong></div></div>
          <h3>Fixed acceptance criteria</h3><p className="delivery-document">{selected.criteria}</p>
          {actions?.staleProposal && <p className="delivery-warning">Scope changed after this proposal. Cancel it and propose a new milestone under the current scope.</p>}
          {selected.status==='PROPOSED' && !actions?.staleProposal && <p>The budget is reserved only after the Contractor accepts. Current free escrow: {formatGen(wei(project.available_wei))}.</p>}
          {actions?.canAccept && <button className="button button-primary" disabled={disabled} onClick={()=>void act('accept_milestone',selected)}>Accept criteria & reserve {formatGen(wei(selected.budget_wei))}</button>}
          {actions?.canCancel && <button className="button button-secondary" disabled={disabled} onClick={()=>void act('cancel_milestone',selected)}>Cancel proposed milestone</button>}
          {selected.latest_attempt && <section className="delivery-latest">
            <span className="eyebrow">LATEST SUBMISSION · #{selected.latest_attempt_id}</span>
            <h3>{selected.latest_attempt.decision.replaceAll('_',' ')}</h3>
            <p className="delivery-document">{selected.latest_attempt.report}</p>
            {selected.latest_attempt.artifact_url && <a href={selected.latest_attempt.artifact_url} target="_blank" rel="noopener noreferrer">Open submitted artifact ↗</a>}
            <p className="delivery-disclosure">The review compares the report with criteria. It does not inspect the artifact or prove real-world completion. No payment is automatic.</p>
            {selected.latest_review?.note && <blockquote><strong>Client requested a revision:</strong> {selected.latest_review.note}</blockquote>}
          </section>}
          {actions?.canApprove && <div className="delivery-approval"><p>Approve submission #{selected.latest_attempt_id} and allocate {formatGen(wei(selected.budget_wei))} to the Contractor. This approval is final; withdrawal happens separately.</p>
            <button className="button button-primary" disabled={disabled} onClick={()=>void act('approve_delivery',selected)}>Approve submission #{selected.latest_attempt_id} & allocate budget</button></div>}
          {actions?.canRevise && <form className="delivery-revision" onSubmit={e=>{e.preventDefault();void act('request_delivery_revision',selected)}}>
            <label>What needs to change?<textarea rows={2} value={revision} onChange={e=>setRevision(e.target.value)} minLength={5} maxLength={1000} required disabled={disabled}/></label>
            <button className="button button-secondary" disabled={disabled}>Request revision of submission #{selected.latest_attempt_id}</button>
          </form>}
          {actions?.canSubmit && <form className="delivery-submit" onSubmit={e=>{e.preventDefault();void act('submit_delivery',selected)}}>
            <h3>Submit delivery #{selected.attempt_count+1}</h3><p>Explain how the completed work satisfies every criterion. A new submission replaces the current one for approval and keeps earlier attempts in history.</p>
            <label>Delivery report<textarea rows={6} value={report} onChange={e=>setReport(e.target.value)} minLength={20} maxLength={4000} required disabled={disabled}/></label><small>{report.length}/4000</small>
            <label>Artifact URL (optional)<input type="url" pattern="https://.*" value={url} onChange={e=>setUrl(e.target.value)} maxLength={500} disabled={disabled} placeholder="https://…"/></label>
            <button className="button button-primary" disabled={disabled}>Submit report for GenLayer review</button>
          </form>}
          {selected.attempt_count>=5 && selected.status!=='PAID' && selected.status!=='PROJECT_CLOSED' && <p className="delivery-warning">All five submissions have been used. A latest matching submission can still be approved; otherwise both parties must resolve the remaining escrow through final settlement.</p>}
          {selected.status==='PAID' && <p className="delivery-paid">Budget allocated in receipt #{selected.receipt_id}. The Contractor can use Withdraw in Project scope.</p>}
          {selected.status==='PROJECT_CLOSED' && <p>Both parties closed the project. Its final allocation overrides this unfinished milestone; its history remains readable.</p>}
          <details className="delivery-history"><summary>Submission and review history ({selected.attempt_count})</summary>
            {historyLoading ? <p>Reading history…</p> : history.map(({submission:a,review})=><article key={a.attempt_id}>
              <h4>Submission #{a.attempt_id} · {a.decision.replaceAll('_',' ')}</h4><small>{date(a.created_at)}</small><p className="delivery-document">{a.report}</p>
              <p>{review ? `${review.action.replaceAll('_',' ')}${review.note?': '+review.note:''}`:'No Client review recorded'}</p>
              <details><summary>Record hashes</summary><code>Criteria: {a.criteria_hash}<br/>Report: {a.report_hash}</code></details>
            </article>)}
          </details>
        </>}
      </div>
    </div>
    <section className="panel delivery-payments"><span className="eyebrow">IMMUTABLE ALLOCATION RECEIPTS</span><h2>Payment history</h2>
      <p>These receipts record funds allocated to the Contractor. Native payouts are confirmed separately when the Contractor withdraws.</p>
      {!receipts.length && <p>No milestone allocation receipts yet.</p>}
      {receipts.map(r=><details key={r.receipt_id} className="payment-receipt"><summary><span>#{r.receipt_id} · {r.title} · submission #{r.attempt_id}</span><strong>{formatGen(wei(r.amount_wei))}</strong></summary>
        <dl><dt>Approved</dt><dd>{date(r.created_at)}</dd><dt>Approved by</dt><dd>{r.approved_by}</dd><dt>Escrow before / after</dt><dd>{formatGen(wei(r.escrow_before_wei))} / {formatGen(wei(r.escrow_after_wei))}</dd><dt>Scope at agreement / approval</dt><dd>V{r.agreed_scope_version} / V{r.current_scope_version}</dd><dt>Payment revision</dt><dd>{r.payment_revision}</dd><dt>Criteria hash</dt><dd>{r.criteria_hash}</dd><dt>Report hash</dt><dd>{r.report_hash}</dd></dl>
      </details>)}
    </section>
    {localPending && <p className="delivery-pending" role="status">Waiting for finalized execution and checking the resulting state. Do not repeat the action.</p>}
  </section>
}
