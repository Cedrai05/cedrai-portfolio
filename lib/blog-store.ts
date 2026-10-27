import { get, list, put, BlobNotFoundError } from '@vercel/blob'
import { readFile, writeFile, mkdir, readdir, rename, link, rm } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { blobStorageEnabled } from '@/lib/blob-storage'
const localRoot = path.join(process.cwd(),'.private_uploads','native-blog')
function localPath(key: string) {
  if (!/^[a-zA-Z0-9_./-]+$/.test(key) || key.split('/').includes('..')) throw new Error('Invalid storage key')
  return path.join(localRoot,key)
}
export async function readBlogJSON<T>(key: string): Promise<T | null> {
  if (blobStorageEnabled()) {
    try {
      const result=await get(key,{access:'private',useCache:false})
      if (!result || result.statusCode!==200) return null
      return await new Response(result.stream).json() as T
    } catch (error) { if (error instanceof BlobNotFoundError) return null; throw error }
  }
  try { return JSON.parse(await readFile(localPath(key),'utf8')) as T }
  catch(error) { if ((error as NodeJS.ErrnoException).code==='ENOENT') return null; throw error }
}
export async function writeBlogJSON(key: string, value: unknown, overwrite=false) {
  const data=JSON.stringify(value)
  if (blobStorageEnabled()) {
    await put(key,data,{access:'private',addRandomSuffix:false,allowOverwrite:overwrite,contentType:'application/json',cacheControlMaxAge:60})
    return
  }
  const file=localPath(key)
  await mkdir(path.dirname(file),{recursive:true,mode:0o700})
  const temp=file+'.'+randomUUID()
  await writeFile(temp,data,{mode:0o600})
  try { if(overwrite)await rename(temp,file);else await link(temp,file) }
  finally { await rm(temp,{force:true}) }
}
export async function listBlogKeys(prefix: string) {
  if (blobStorageEnabled()) {
    const names:string[]=[]
    let cursor:string|undefined
    do { const result=await list({prefix,cursor}); names.push(...result.blobs.map(blob=>blob.pathname)); cursor=result.hasMore?result.cursor:undefined } while(cursor)
    return names
  }
  try { return (await readdir(localPath(prefix))).filter(name=>name.endsWith('.json')).map(name=>prefix+name) }
  catch(error) { if ((error as NodeJS.ErrnoException).code==='ENOENT') return []; throw error }
}
export async function readBlogAsset(key: string) {
  if (blobStorageEnabled()) {
    try {
      const result=await get(key,{access:'private',useCache:false})
      return result?.statusCode===200 ? {body:result.stream,contentType:result.blob.contentType} : null
    } catch(error) { if(error instanceof BlobNotFoundError)return null;throw error }
  }
  try { return {body:new Uint8Array(await readFile(localPath(key))),contentType:undefined} }
  catch(error) { if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error }
}
