import test from 'node:test'
import assert from 'node:assert/strict'
import {milestoneActions, allocationVerified, unchangedMoney} from '../src/lib/delivery.ts'
import {escrowActions} from '../src/lib/escrow.ts'

const before={status:'ACTIVE',active_scope_version:2,escrow_wei:'100',reserved_wei:'30',available_wei:'70',contractor_due_wei:'4',client_due_wei:'0',contractor_paid_wei:'8',client_refunded_wei:'0',payment_revision:2}
const after={...before,escrow_wei:'70',reserved_wei:'0',contractor_due_wei:'34',payment_revision:3}
const m={milestone_id:1,title:'Pages',criteria:'Responsive home and pricing pages',criteria_hash:'criteria-hash',budget_wei:'30',status:'SUBMITTED',proposed_scope_version:2,agreed_scope_version:2,attempt_count:2,latest_attempt_id:2,latest_attempt:{decision:'DELIVERY_MATCHES',report_hash:'report-hash'},receipt_id:0}
const next={...m,status:'PAID',receipt_id:1}
const r={receipt_id:1,project_id:7,milestone_id:1,attempt_id:2,amount_wei:'30',criteria_hash:'criteria-hash',report_hash:'report-hash',approved_by:'0xAbc',native_transfer:false,kind:'MILESTONE_ALLOCATION',escrow_before_wei:'100',escrow_after_wei:'70',payment_revision:3}
const verify=(b=before,a=after,item=m,n=next,rs=[r])=>allocationVerified(b,a,item,n,rs,7,'0xabc')

test('client approves only matching exact latest report; observer and contractor cannot',()=>{
 assert.equal(milestoneActions(before,m,'CLIENT').canApprove,true)
 for(const role of ['OBSERVER','CONTRACTOR'])assert.equal(milestoneActions(before,m,role).canApprove,false)
 for(const decision of ['DELIVERY_GAPS','DELIVERY_UNCLEAR','MATCHES'])assert.equal(milestoneActions(before,{...m,latest_attempt:{decision}},'CLIENT').canApprove,false)
 assert.equal(milestoneActions(before,{...m,status:'REVISION_REQUESTED'},'CLIENT').canApprove,false)
})
test('contractor accepts only current proposed milestones with available unreserved budget',()=>{
 const proposed={...m,status:'PROPOSED'}
 assert.equal(milestoneActions(before,proposed,'CONTRACTOR').canAccept,true)
 assert.equal(milestoneActions({...before,available_wei:'29'},proposed,'CONTRACTOR').canAccept,false)
 assert.equal(milestoneActions({...before,active_scope_version:3},proposed,'CONTRACTOR').staleProposal,true)
 assert.equal(milestoneActions({...before,active_scope_version:3},proposed,'CONTRACTOR').canAccept,false)
 assert.equal(milestoneActions(before,proposed,'CLIENT').canAccept,false)
})
test('closed projects block all delivery actions',()=>{
 for(const role of ['CLIENT','CONTRACTOR','OBSERVER']){
 const actions=milestoneActions({...before,status:'CLOSED'},m,role)
 for(const key of ['canCancel','canAccept','canSubmit','canRevise','canApprove'])assert.equal(actions[key],false)
 }
})
test('attempt cap stops further submission but allows reviewing latest report',()=>{
 assert.equal(milestoneActions(before,{...m,attempt_count:4},'CONTRACTOR').canSubmit,true)
 assert.equal(milestoneActions(before,{...m,attempt_count:5},'CONTRACTOR').canSubmit,false)
 assert.equal(milestoneActions(before,{...m,attempt_count:5},'CLIENT').canApprove,true)
})
test('finalized allocation verification pins amount, consent, receipt and money conservation',()=>{
 assert.equal(verify(),true)
 for(const changed of [{amount_wei:'31'},{attempt_id:1},{criteria_hash:'other'},{report_hash:'other'},
 {project_id:8},{milestone_id:2},{receipt_id:2},{approved_by:'0xdef'},{native_transfer:true},
 {kind:'TRANSFER'},{escrow_before_wei:'99'},{escrow_after_wei:'69'},{payment_revision:2}]){
 assert.equal(verify(before,after,m,next,[{...r,...changed}]),false,JSON.stringify(changed))
 }
})
test('successful receipt cannot mask wrong poststate or partial checks',()=>{
 for(const changed of [{escrow_wei:'71'},{reserved_wei:'30'},{contractor_due_wei:'30'},
 {contractor_paid_wei:'9'},{client_due_wei:'1'},{client_refunded_wei:'1'},{status:'CLOSED'},{payment_revision:4}]){
 assert.equal(verify(before,{...after,...changed}),false,JSON.stringify(changed))
 }
 assert.equal(verify(before,after,m,{...next,latest_attempt_id:3}),false)
 assert.equal(verify(before,after,m,{...next,status:'SUBMITTED'}),false)
 assert.equal(verify(before,after,m,next,[]),false)
})
test('money comparison covers every balance and exact large integers',()=>{
 assert.equal(unchangedMoney(before,{...before,payment_revision:99}),true)
 for(const field of ['escrow_wei','contractor_due_wei','client_due_wei','contractor_paid_wei','client_refunded_wei'])
 assert.equal(unchangedMoney(before,{...before,[field]:'99999999999999999999999999'}),false)
})
test('contractor can withdraw due while project remains active',()=>{
 const actions=escrowActions(after,'CONTRACTOR')
 assert.equal(actions.canWithdraw,true)
 assert.equal(actions.myDue,34n)
 assert.equal(actions.canSettle,true)
 assert.equal(escrowActions(after,'CLIENT').canWithdraw,false)
})
