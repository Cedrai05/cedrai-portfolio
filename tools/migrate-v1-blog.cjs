#!/usr/bin/env node
// One-time recovery of the legacy blog through its authenticated read API.
// Source content is encrypted in memory before any file is written to disk.
const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const target = path.join(root, '.private_uploads', 'blog-migration')
const origin = 'https://www.cedrai.info'
const catalog = require(path.join(root, 'data/blog-catalog.json')).posts
const metadata = new Map(catalog.map(post => [post.slug, post]))

async function localEnv() {
  const text = await fs.readFile(path.join(root, '.env.local'), 'utf8')
  return Object.fromEntries(text.split(/\r?\n/).filter(line => /^[A-Z_][A-Z_0-9]*=/.test(line)).map(line => {
    const index = line.indexOf('=')
    return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, '')]
  }))
}

async function request(url, cookie, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(origin + url, { headers: { Cookie: cookie }, redirect: 'error', cache: 'no-store' })
      if (response.ok) return response
      if (response.status < 500 || i === attempts - 1) throw new Error(`${url} returned ${response.status}`)
    } catch (error) {
      if (i === attempts - 1) throw error
    }
    await new Promise(resolve => setTimeout(resolve, 500 * 2 ** i))
  }
  throw new Error('Request failed')
}

function seal(data, key) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const payload = Buffer.concat([cipher.update(data), cipher.final()])
  return JSON.stringify({
    format: 'cedrai-blog-aes-gcm-v1',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    payload: payload.toString('base64'),
  })
}

async function save(key, data, secret) {
  const file = path.join(target, key + '.sealed.json')
  try { await fs.access(file); return false } catch { /* not recovered yet */ }
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  const tmp = file + '.' + crypto.randomUUID()
  await fs.writeFile(tmp, seal(data, secret), { mode: 0o600 })
  await fs.rename(tmp, file)
  return true
}

async function mapLimit(values, limit, work) {
  let next = 0
  const workers = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (next < values.length) await work(values[next++])
  })
  await Promise.all(workers)
}

async function main() {
  const env = await localEnv()
  if (!env.ADMIN_ID || !env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) throw new Error('Local admin credentials are missing')
  const login = await fetch(origin + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: env.ADMIN_ID, password: env.ADMIN_PASSWORD }), redirect: 'error' })
  if (!login.ok) throw new Error(`Admin login returned ${login.status}`)
  const cookie = login.headers.get('set-cookie')?.split(';')[0]
  if (!cookie?.startsWith('cedrai_session=')) throw new Error('Admin session is missing')
  const key = crypto.createHash('sha256').update('cedrai-blog-storage-v1\0').update(env.ADMIN_SESSION_SECRET).digest()
  const status = await (await request('/api/native-blog/import-status', cookie)).json()
  if (!Array.isArray(status.posts) || !Array.isArray(status.assets)) throw new Error('Invalid source inventory')
  const sourcePosts = status.posts.map(name => {
    if (!/^posts\/tistory-[1-9][0-9]*\.json$/.test(name)) throw new Error('Invalid source post name')
    return name.replace(/^posts\//, '').replace(/\.json$/, '')
  })
  const sourceAssets = status.assets.map(name => {
    if (!/^assets\/[a-f0-9]{64}\.[a-z0-9]{1,10}$/.test(name)) throw new Error('Invalid source asset name')
    return name.slice('assets/'.length)
  })
  console.log(JSON.stringify({ sourcePosts: sourcePosts.length, sourceAssets: sourceAssets.length }))
  const referenced = new Set()
  let recoveredPosts = 0
  await mapLimit(sourcePosts, 5, async slug => {
    const info = metadata.get(slug)
    if (!info?.protected) throw new Error(`Missing protected catalog entry: ${slug}`)
    const source = await (await request(`/api/native-blog/posts/${slug}`, cookie)).json()
    if (typeof source.content !== 'string' || !Array.isArray(source.assets) || source.assets.some(name => !/^[a-f0-9]{64}\.[a-z0-9]{1,10}$/.test(name))) throw new Error(`Invalid source post: ${slug}`)
    for (const name of source.assets) referenced.add(name)
    const record = { version: 1, slug, visibility: 'protected', title: info.title, content: source.content, assets: source.assets }
    if (await save(`blog-native/v1/posts/${slug}.json`, Buffer.from(JSON.stringify(record)), key)) recoveredPosts++
  })
  const absent = [...referenced].filter(name => !sourceAssets.includes(name))
  if (absent.length) throw new Error(`${absent.length} referenced assets are missing from source inventory`)
  console.log(JSON.stringify({ recoveredPosts, referencedAssets: referenced.size, unreferencedAssets: sourceAssets.length - referenced.size }))
  if (process.argv.includes('--posts-only')) return
  let recoveredAssets = 0, totalBytes = 0, largestBytes = 0
  await mapLimit(sourceAssets, 4, async name => {
    const file = path.join(target, 'blog-native/v1/assets', name + '.sealed.json')
    try { await fs.access(file); return } catch { /* not recovered yet */ }
    const response = await request(`/api/native-blog/assets?preview=1&name=${encodeURIComponent(name)}`, cookie)
    const data = Buffer.from(await response.arrayBuffer())
    if (crypto.createHash('sha256').update(data).digest('hex') !== name.split('.')[0]) throw new Error(`Asset hash mismatch: ${name}`)
    if (data.length > 70 * 1024 * 1024) throw new Error(`Asset exceeds GitHub storage limit: ${name}`)
    if (await save(`blog-native/v1/assets/${name}`, data, key)) {
      recoveredAssets++
      totalBytes += data.length
      largestBytes = Math.max(largestBytes, data.length)
      if (recoveredAssets % 50 === 0) console.log(JSON.stringify({ recoveredAssets, totalAssets: sourceAssets.length, totalMiB: Math.round(totalBytes / 1048576) }))
    }
  })
  console.log(JSON.stringify({ recoveredAssets, totalAssets: sourceAssets.length, totalMiB: Math.round(totalBytes / 1048576), largestMiB: Math.round(largestBytes / 1048576) }))
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
