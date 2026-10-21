import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root=new URL('../',import.meta.url)
const release=JSON.parse(readFileSync(new URL('release.json',root),'utf8'))
const sha=createHash('sha256').update(readFileSync(new URL(release.contract_file,root),'utf8').replaceAll('\r\n','\n')).digest('hex')
if(sha!==release.normalized_sha256)throw Error('Contract source differs from the frozen release hash.')
console.log('Frozen contract SHA256: '+sha)
