import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { isGithubConfigured, listFiles, readFile, writeFile } from '@/lib/github'

const root='data/native-blog/'
type Envelope={format:'cedrai-blog-aes-gcm-v1';iv:string;tag:string;payload:string}

export function githubBlogStorageEnabled() {
  return isGithubConfigured() && Boolean(process.env.ADMIN_SESSION_SECRET)
}

function storagePath(key:string) {
  if(!/^[a-zA-Z0-9_./-]+$/.test(key)||key.split('/').includes('..'))throw new Error('Invalid blog storage key')
  return `${root}${key}.sealed.json`
}

function encryptionKey() {
  const secret=process.env.ADMIN_SESSION_SECRET
  if(!secret)throw new Error('Blog encryption key is not configured')
  return createHash('sha256').update('cedrai-blog-storage-v1\0').update(secret).digest()
}

function seal(value:Buffer) {
  const iv=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',encryptionKey(),iv)
  const payload=Buffer.concat([cipher.update(value),cipher.final()])
  const record:Envelope={format:'cedrai-blog-aes-gcm-v1',iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),payload:payload.toString('base64')}
  return JSON.stringify(record)
}

function unseal(value:string) {
  const record=JSON.parse(value) as Envelope
  if(record.format!=='cedrai-blog-aes-gcm-v1'||!record.iv||!record.tag||!record.payload)throw new Error('Invalid encrypted blog record')
  const decipher=createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(record.iv,'base64'))
  decipher.setAuthTag(Buffer.from(record.tag,'base64'))
  return Buffer.concat([decipher.update(Buffer.from(record.payload,'base64')),decipher.final()])
}

export async function readGithubBlogFile(key:string):Promise<Buffer|null> {
  const {content,sha}=await readFile(storagePath(key))
  return sha?unseal(content):null
}

export async function writeGithubBlogFile(key:string,value:Buffer,overwrite=false) {
  const file=storagePath(key)
  const sha=overwrite?(await readFile(file)).sha:''
  await writeFile(file,seal(value),sha,`blog: save ${key.split('/').at(-2)||'record'}`)
}

export async function listGithubBlogKeys(prefix:string) {
  if(!prefix.endsWith('/'))throw new Error('Invalid blog key prefix')
  const directory=`${root}${prefix.slice(0,-1)}`
  const files=await listFiles(directory)
  return files.filter(name=>name.endsWith('.sealed.json')).map(name=>`${prefix}${name.slice(0,-'.sealed.json'.length)}`)
}
