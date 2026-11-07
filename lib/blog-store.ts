import { get, list, put, BlobNotFoundError } from '@vercel/blob'
import { readFile, writeFile, mkdir, readdir, rename, link, rm } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { blobStorageEnabled } from '@/lib/blob-storage'
import { githubBlogStorageEnabled, listGithubBlogKeys, readGithubBlogFile, writeGithubBlogFile } from '@/lib/github-blog-store'
const localRoot = path.join(process.cwd(),'.private_uploads','native-blog')
const blobTokenOptions = () => process.env.BLOB_READ_WRITE_TOKEN ? {token:process.env.BLOB_READ_WRITE_TOKEN} : {}
function localPath(key: string) {
  if (!/^[a-zA-Z0-9_./-]+$/.test(key) || key.split('/').includes('..')) throw new Error('Invalid storage key')
  return path.join(localRoot,key)
}
async function getPrivateBlob(key:string) {
  return get(key,{access:'private',...blobTokenOptions()})
}
export async function readLegacyBlobJSON<T>(key:string):Promise<T|null> {
  if(!blobStorageEnabled())return null
  try {
    const result=await getPrivateBlob(key)
    return result?.statusCode===200?await new Response(result.stream).json() as T:null
  }catch(error) {if(error instanceof BlobNotFoundError)return null;throw error}
}
export async function readLegacyBlobAsset(key:string):Promise<Buffer|null> {
  if(!blobStorageEnabled())return null
  try {
    const result=await getPrivateBlob(key)
    return result?.statusCode===200?Buffer.from(await new Response(result.stream).arrayBuffer()):null
  }catch(error) {if(error instanceof BlobNotFoundError)return null;throw error}
}
export async function readBlogJSON<T>(key: string): Promise<T | null> {
  let githubError:unknown
  if (key.startsWith('blog-native/v2/')&&githubBlogStorageEnabled()) {
    try { const data=await readGithubBlogFile(key);if(data)return JSON.parse(data.toString('utf8')) as T }
    catch(error) { githubError=error }
  }
  if (blobStorageEnabled()) {
    try {
      const result=await getPrivateBlob(key)
      if (!result || result.statusCode!==200) {if(githubError)throw githubError;return null}
      return await new Response(result.stream).json() as T
    } catch (error) {
      if (error instanceof BlobNotFoundError) {if(githubError)throw githubError;return null}
      if (key.startsWith('blog-native/v2/')&&githubBlogStorageEnabled()&&!githubError) return null
      throw error
    }
  }
  try { return JSON.parse(await readFile(localPath(key),'utf8')) as T }
  catch(error) { if ((error as NodeJS.ErrnoException).code==='ENOENT') {if(githubError)throw githubError;return null} throw error }
}
export async function writeBlogJSON(key: string, value: unknown, overwrite=false) {
  const data=JSON.stringify(value)
  if (key.startsWith('blog-native/v2/')&&githubBlogStorageEnabled()) {
    await writeGithubBlogFile(key,Buffer.from(data,'utf8'),overwrite)
    return
  }
  if (blobStorageEnabled()) {
    await put(key,data,{access:'private',addRandomSuffix:false,allowOverwrite:overwrite,contentType:'application/json',cacheControlMaxAge:60,...blobTokenOptions()})
    return
  }
  const file=localPath(key)
  await mkdir(path.dirname(file),{recursive:true,mode:0o700})
  const temp=file+'.'+randomUUID()
  await writeFile(temp,data,{mode:0o600})
  try { if(overwrite)await rename(temp,file);else await link(temp,file) }
  finally { await rm(temp,{force:true}) }
}
async function listBlobKeys(prefix:string) {
    const names:string[]=[]
    let cursor:string|undefined
    do { const result=await list({prefix,cursor,...blobTokenOptions()}); names.push(...result.blobs.map(blob=>blob.pathname)); cursor=result.hasMore?result.cursor:undefined } while(cursor)
    return names
}
async function listLocalKeys(prefix:string) {
  try { return (await readdir(localPath(prefix))).filter(name=>name.endsWith('.json')).map(name=>prefix+name) }
  catch(error) { if ((error as NodeJS.ErrnoException).code==='ENOENT') return []; throw error }
}
export async function listBlogKeysWithStatus(prefix:string):Promise<{keys:string[];storageUnavailable:boolean}> {
  const sources:Promise<string[]>[]=[]
  if(prefix.startsWith('blog-native/v2/')&&githubBlogStorageEnabled())sources.push(listGithubBlogKeys(prefix))
  sources.push(blobStorageEnabled()?listBlobKeys(prefix):listLocalKeys(prefix))
  const results=await Promise.allSettled(sources)
  return {keys:[...new Set(results.flatMap(result=>result.status==='fulfilled'?result.value:[]))],storageUnavailable:results.some(result=>result.status==='rejected')}
}
export async function listBlogKeys(prefix:string) {
  return (await listBlogKeysWithStatus(prefix)).keys
}
export async function readBlogAsset(key: string) {
  let githubError:unknown
  if(key.startsWith('blog-native/v1/assets/')&&githubBlogStorageEnabled()) {
    try { const data=await readGithubBlogFile(key);if(data)return {body:new Uint8Array(data),contentType:undefined} }
    catch(error) { githubError=error }
  }
  if (blobStorageEnabled()) {
    try {
      const result=await getPrivateBlob(key)
      if(result?.statusCode===200)return {body:result.stream,contentType:result.blob.contentType}
      if(githubError)throw githubError
      return null
    } catch(error) { if(error instanceof BlobNotFoundError) {if(githubError)throw githubError;return null} throw error }
  }
  try { return {body:new Uint8Array(await readFile(localPath(key))),contentType:undefined} }
  catch(error) { if((error as NodeJS.ErrnoException).code==='ENOENT') {if(githubError)throw githubError;return null} throw error }
}
export async function writeBlogAsset(key:string,data:Buffer) {
  if(!key.startsWith('blog-native/v1/assets/')||!githubBlogStorageEnabled())throw new Error('GitHub blog asset storage is unavailable')
  if(await readGithubBlogFile(key))return
  await writeGithubBlogFile(key,data)
}
