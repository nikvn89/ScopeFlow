// Read-only evidence capture. Public fields only; never export full RPC objects.
import {createHash} from 'node:crypto'
import {readFile, mkdir, writeFile} from 'node:fs/promises'
import {createClient} from 'genlayer-js'
import {studionet} from 'genlayer-js/chains'
import {TransactionHashVariant} from 'genlayer-js/types'
import {readExplicitExecutionResult} from '../src/lib/transactionExecution.ts'

const usage='npm run capture:runtime -- ADDRESS PROJECT_ID [TX_HASH ...]'
if(process.argv[2]==='--help'){console.log(usage+'\nCaptures a sanitized finalized-state snapshot. Does not sign or assert a runtime PASS.');process.exit(0)}
const [address,id,...hashes]=process.argv.slice(2)
if(!/^0x[0-9a-fA-F]{40}$/.test(address??'')||! /^[1-9][0-9]*$/.test(id??'')||!Number.isSafeInteger(Number(id))||hashes.length>40||hashes.some(h=>!/^0x[0-9a-fA-F]{64}$/.test(h)))throw Error(usage)
const root=new URL('../',import.meta.url)
const release=JSON.parse(await readFile(new URL('release.json',root),'utf8'))
const client=createClient({chain:studionet})
const read=async(functionName,args=[])=>{
 const raw=await client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL})
 let value=raw;for(let i=0;i<3&&typeof value==='string';i++)value=JSON.parse(value)
 return value
}
const scalar=v=>['string','number','boolean','bigint'].includes(typeof v)?v:undefined
const summarize=tx=>({hash:scalar(tx?.hash),status:scalar(tx?.status),from:scalar(tx?.from_address??tx?.from),to:scalar(tx?.to_address??tx?.to),
 value:scalar(tx?.value),type:scalar(tx?.type),triggered_by:scalar(tx?.triggered_by),
 triggered_transactions:Array.isArray(tx?.triggered_transactions)?tx.triggered_transactions.filter(v=>typeof v==='string'&&/^0x[0-9a-fA-F]{64}$/.test(v)):[],
 value_credited:scalar(tx?.value_credited),created_at:scalar(tx?.created_at),execution:readExplicitExecutionResult(tx??{})})
try{
 const [registry,code]=await Promise.all([read('get_registry'),client.getContractCode(address)])
 const deployedSha=createHash('sha256').update(code.replaceAll('\r\n','\n')).digest('hex')
 if(registry.contract_version!=='0.8.0'||!registry.milestone_delivery||!registry.payment_receipts||deployedSha!==release.normalized_sha256)throw Error('Deployment profile or source parity failed')
 const [project,milestones,payments]=await Promise.all([read('get_project',[Number(id)]),read('get_milestones',[Number(id),1,20]),read('get_payment_receipts',[Number(id),1,20])])
 const histories=[]
 for(const item of milestones.items)histories.push(await read('get_delivery_attempts',[Number(id),item.milestone_id,1,5]))
 const transactions=[];const queue=[...new Set(hashes)];const seen=new Set()
 while(queue.length){
  const hash=queue.shift();if(seen.has(hash))continue;seen.add(hash)
  if(seen.size>80)throw Error('Linked transaction capture limit reached')
  const tx=await client.request({method:'eth_getTransactionByHash',params:[hash]})
  if(!tx)throw Error('Transaction not found')
  const safe=summarize(tx);transactions.push(safe)
  for(const child of safe.triggered_transactions??[])if(typeof child==='string'&&/^0x[0-9a-fA-F]{64}$/.test(child))queue.push(child)
 }
 const capturedAt=new Date().toISOString()
 const snapshot={status:'SNAPSHOT_ONLY_REVIEW_REQUIRED',captured_at:capturedAt,network:'StudioNet',chain_id:61999,
  address,source_sha256:deployedSha,registry,project,milestones,delivery_histories:histories,payment_receipts:payments,transactions,
  limitations:'Reads are sequential snapshots, not an atomic historical block. Allocation receipts and paid counters do not prove native delivery. Verify parent/child provenance, recipient, credited amount and before/after wallet balances. No live-model accuracy or negative-runtime PASS is implied.'}
 const directory=new URL('tests/evidence/',root);await mkdir(directory,{recursive:true})
 const file=new URL('runtime-0.8.0-'+capturedAt.replaceAll(/[:.]/g,'-')+'.json',directory)
 await writeFile(file,JSON.stringify(snapshot,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n')
 console.log('Saved '+file.pathname+'\nSource parity: PASS. Snapshot captured; runtime assessment still required.')
}catch{
 console.error('Runtime capture failed. Check address, source profile, project ID, transaction hashes and RPC availability. No runtime PASS was recorded.')
 process.exitCode=1
}
