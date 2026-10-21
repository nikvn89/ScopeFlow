// Read-only, whitelist-only output. No keys, signing, or full raw RPC records.
import {createClient} from 'genlayer-js'
import {studionet} from 'genlayer-js/chains'
import {TransactionHashVariant} from 'genlayer-js/types'
import {readExplicitExecutionResult} from '../src/lib/transactionExecution.ts'
const [address,id,hash]=process.argv.slice(2)
if(!/^0x[0-9a-fA-F]{40}$/.test(address??'') || !/^[1-9][0-9]*$/.test(id??'') || !Number.isSafeInteger(Number(id)))throw Error('Usage: npm run check:runtime -- ADDRESS PROJECT_ID [TX_HASH]')
if(hash && !/^0x[0-9a-fA-F]{64}$/.test(hash))throw Error('Invalid transaction hash')
const client=createClient({chain:studionet})
const read=async(functionName,args=[])=>{
 const raw=await client.readContract({address,functionName,args,transactionHashVariant:TransactionHashVariant.LATEST_FINAL})
 return typeof raw==='string'?JSON.parse(raw):raw
}
const registry=await read('get_registry')
if(registry.contract_version!=='0.7.0'||!registry.settlement_offers)throw Error('Not the fresh 0.7.0 deployment')
const p=await read('get_project',[Number(id)])
const projectKeys=['project_id','client','contractor','status','active_scope_version','chain_timestamp','escrow_wei','contractor_due_wei','client_due_wei','contractor_paid_wei','client_refunded_wei','client_settlement','contractor_settlement','settled','settled_offer_id','settled_offer_role']
console.log(JSON.stringify({address,registry,project:Object.fromEntries(projectKeys.map(k=>[k,p[k]]))},null,2))
if(hash){
 const tx=await client.request({method:'eth_getTransactionByHash',params:[hash]})
 console.log(JSON.stringify({hash,status:tx?.status,from:tx?.from_address??tx?.from,to:tx?.to_address??tx?.to,value:tx?.value,execution:readExplicitExecutionResult(tx??{})},null,2))
}
console.log('Read-only snapshot. Contract due/paid counters do not prove asynchronous native delivery; verify linked transfer receipts and recipient balances separately.')
