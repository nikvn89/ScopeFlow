import assert from 'node:assert/strict'
import test from 'node:test'
import {readExplicitExecutionResult as read,waitForExplicitExecutionResult as wait} from '../src/lib/transactionExecution.ts'
const receipt=(execution='SUCCESS',tag=0,status='FINALIZED')=>({status,consensus_data:{leader_receipt:[{mode:'leader',execution_result:execution,result:Buffer.from([tag,0]).toString('base64')}]}})
test('only finalized raw normal-return leader proves success',()=>{
 assert.equal(read(receipt()),'FINISHED_WITH_RETURN')
 assert.equal(read(receipt('SUCCESS',0,'ACCEPTED')),null)
 assert.equal(read({txExecutionResultName:'FINISHED_WITH_RETURN',statusName:'FINALIZED'}),null)
 assert.equal(read({txExecutionResult:1,status:'FINALIZED'}),null)
 assert.equal(read(receipt('SUCCESS',1)),'FINISHED_WITH_ERROR')
 assert.equal(read(receipt('ERROR',0)),'FINISHED_WITH_ERROR')
})
test('unknown or validator-only result never proves success',()=>{
 const s=receipt();s.consensus_data.leader_receipt[0].result=''
 assert.equal(read(s),null)
 s.consensus_data.leader_receipt[0].mode='validator';assert.equal(read(s),null)
})
test('latest leader result wins',()=>{
 const s=receipt();s.consensus_data.leader_receipt.push(receipt('ERROR',1).consensus_data.leader_receipt[0]);assert.equal(read(s),'FINISHED_WITH_ERROR')
})
test('polls after transient failure until finalized result is explicit',async()=>{
 let clock=0,calls=0
 assert.equal(await wait({},async()=>{if(++calls===1)throw Error('not indexed');return receipt()}, {timeoutMs:5,intervalMs:1,now:()=>clock,delay:async ms=>{clock+=ms}}),'FINISHED_WITH_RETURN')
 assert.equal(calls,2)
})
test('bounded unknown stays unknown',async()=>{
 let clock=0
 assert.equal(await wait({},async()=>({}),{timeoutMs:3,intervalMs:1,now:()=>clock,delay:async ms=>{clock+=ms}}),null)
 assert.equal(clock,3)
})
