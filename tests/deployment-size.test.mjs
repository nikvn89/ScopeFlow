import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import test from 'node:test'
import {abi} from 'genlayer-js'
import {encodeFunctionData, parseAbi, zeroAddress} from 'viem'

const release=JSON.parse(readFileSync(new URL('../release.json',import.meta.url),'utf8'))
const code=readFileSync(new URL('../'+release.contract_file,import.meta.url),'utf8')
const sender='0x1111111111111111111111111111111111111111'
const data=abi.transactions.serialize([code,abi.calldata.encode(abi.calldata.makeCalldataObject(undefined,[],undefined)),false])
export function payloadBytes(variant){
 const definition=parseAbi([variant===6?'function addTransaction(address,address,uint256,uint256,bytes,uint256)':'function addTransaction(address,address,uint256,uint256,bytes)'])
 const args=[sender,zeroAddress,5n,3n,data];if(variant===6)args.push(1792569000n)
 const encoded=encodeFunctionData({abi:definition,functionName:'addTransaction',args})
 const request={jsonrpc:'2.0',id:1,method:'eth_sendTransaction',params:[{from:sender,to:sender,data:encoded,value:'0x0',gas:'0xfffff',nonce:'0x0',type:'0x0',chainId:'0xf22f',gasPrice:'0xfffff'}]}
 return Buffer.byteLength(JSON.stringify(request))
}

test('compact SDK deploy payload stays within the conservative 100KB request budget',()=>{
 assert.ok(Buffer.byteLength(code)<=48000)
 for(const variant of [5,6])assert.ok(payloadBytes(variant)<100000,`ABI v${variant}: ${payloadBytes(variant)}`)
})
test('release freezes separate readable and deployable source fingerprints',()=>{
 const hash=text=>createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex')
 assert.equal(hash(code),release.normalized_sha256)
 const source=readFileSync(new URL('../'+release.readable_contract_file,import.meta.url),'utf8')
 assert.equal(hash(source),release.readable_normalized_sha256)
 assert.equal(release.contract_file,'deploy/ScopeFlow.py')
 assert.ok(code.startsWith('# v0.8.0\n# { "Depends": "py-genlayer:'))
})
