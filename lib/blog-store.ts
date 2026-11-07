import { readFile, writeFile, mkdir, readdir, rename, link, rm } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { githubBlogStorageEnabled, listGithubBlogKeys, readGithubBlogFile, writeGithubBlogFile } from '@/lib/github-blog-store'

const localRoot = path.join(process.cwd(), '.private_uploads', 'native-blog')

function localPath(key: string) {
  if (!/^[a-zA-Z0-9_./-]+$/.test(key) || key.split('/').includes('..')) throw new Error('Invalid storage key')
  return path.join(localRoot, key)
}

export async function readBlogJSON<T>(key: string): Promise<T | null> {
  if (githubBlogStorageEnabled()) {
    const data = await readGithubBlogFile(key)
    return data ? JSON.parse(data.toString('utf8')) as T : null
  }
  try { return JSON.parse(await readFile(localPath(key), 'utf8')) as T }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}

export async function writeBlogJSON(key: string, value: unknown, overwrite = false) {
  const data = Buffer.from(JSON.stringify(value), 'utf8')
  if (githubBlogStorageEnabled()) return writeGithubBlogFile(key, data, overwrite)
  const file = localPath(key)
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const temp = file + '.' + randomUUID()
  await writeFile(temp, data, { mode: 0o600 })
  try { if (overwrite) await rename(temp, file); else await link(temp, file) }
  finally { await rm(temp, { force: true }) }
}

async function listLocalKeys(prefix: string) {
  try { return (await readdir(localPath(prefix))).filter(name => name.endsWith('.json')).map(name => prefix + name) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error }
}

export async function listBlogKeysWithStatus(prefix: string): Promise<{ keys: string[]; storageUnavailable: boolean }> {
  try {
    return { keys: githubBlogStorageEnabled() ? await listGithubBlogKeys(prefix) : await listLocalKeys(prefix), storageUnavailable: false }
  } catch {
    return { keys: [], storageUnavailable: true }
  }
}

export async function listBlogKeys(prefix: string) {
  const result = await listBlogKeysWithStatus(prefix)
  if (result.storageUnavailable) throw new Error('Blog storage is unavailable')
  return result.keys
}

export async function readBlogAsset(key: string) {
  if (githubBlogStorageEnabled()) {
    const data = await readGithubBlogFile(key)
    return data ? { body: new Uint8Array(data), contentType: undefined } : null
  }
  try { return { body: new Uint8Array(await readFile(localPath(key))), contentType: undefined } }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}

export async function writeBlogAsset(key: string, data: Buffer) {
  if (!key.startsWith('blog-native/v1/assets/')) throw new Error('Invalid blog asset key')
  if (githubBlogStorageEnabled()) {
    if (await readGithubBlogFile(key)) return
    await writeGithubBlogFile(key, data)
    return
  }
  const file = localPath(key)
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const temp = file + '.' + randomUUID()
  await writeFile(temp, data, { mode: 0o600 })
  try { await link(temp, file) }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error }
  finally { await rm(temp, { force: true }) }
}
