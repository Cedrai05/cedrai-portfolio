// Requires npm run build. All writes go to an in-memory GitHub mock.
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const http = require('node:http')
const { spawn } = require('node:child_process')

const site = 'http://127.0.0.1:8924'
const api = 'http://127.0.0.1:8925'
const secret = crypto.randomBytes(32).toString('hex')
const files = new Map()
const results = []
let server, mock, writes = 0, calls = 0
const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(body))
}
async function github(request, response) {
  calls++
  const url = new URL(request.url, api)
  const prefix = '/repos/test/content-access/contents/'
  if (!url.pathname.startsWith(prefix)) return json(response, 404, {})
  const key = decodeURIComponent(url.pathname.slice(prefix.length))
  const previous = files.get(key)
  if (request.method === 'GET') return previous
    ? json(response, 200, { sha: previous.sha, content: previous.data.toString('base64') })
    : json(response, 404, { message: 'Not Found' })
  if (request.method !== 'PUT') return json(response, 405, {})
  writes++
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString())
  assert.equal(body.branch, 'main')
  if (previous && body.sha !== previous.sha) return json(response, 409, { message: 'Conflict' })
  const data = Buffer.from(body.content, 'base64')
  const sha = crypto.createHash('sha1').update(data).digest('hex')
  files.set(key, { data, sha, message: body.message })
  json(response, previous ? 200 : 201, { content: { sha }, commit: { html_url: api + '/mock-commit' } })
}
async function request(route, { cookie, method, body, raw } = {}) {
  const headers = { Origin: site }
  if (cookie) headers.Cookie = cookie
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(site + route, {
    method: method || (body !== undefined || raw !== undefined ? 'PUT' : 'GET'),
    headers, body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await response.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: response.status, data, headers: response.headers }
}
async function check(name, fn) {
  try { await fn(); results.push({ name, result: 'PASS' }) }
  catch (error) { results.push({ name, result: 'FAIL', error: error.message }) }
}
const signedCookie = (id, signingSecret = secret) => {
  const payload = Buffer.from(id).toString('base64url')
  return 'cedrai_session=' + payload + '.' + crypto.createHmac('sha256', signingSecret).update(payload).digest('base64url')
}
async function login(id, password) {
  const result = await request('/api/login', { method: 'POST', body: { id, password } })
  assert.equal(result.status, 200)
  return result.headers.get('set-cookie').split(';')[0]
}
async function start(overrides = {}) {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '8924'], {
    env: { ...process.env, ADMIN_ID: 'local-admin', ADMIN_PASSWORD: 'local-admin-password', CLUB_ID: 'local-member', CLUB_PASSWORD: 'local-member-password', ADMIN_SESSION_SECRET: secret, GITHUB_TOKEN: 'mock-token', GITHUB_REPO: 'test/content-access', GITHUB_BRANCH: 'main', GITHUB_API_BASE: api, BLOB_READ_WRITE_TOKEN: '', BLOB_STORE_ID: '', VERCEL: '', ...overrides },
    stdio: 'ignore',
  })
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await request('/api/me')).status === 200) return } catch { /* Server is starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Test server did not start')
}
async function stop() {
  if (!server) return
  const current = server
  server = undefined
  await new Promise(resolve => { current.once('exit', resolve); current.kill('SIGTERM') })
}
const inputs = {
  projects: [{ id: 'project-test', title: 'Admin project', progress: 150, description: 'test', tags: ['test'], timeline: [] }],
  now: [{ id: 'now-test', content: 'Admin NOW', created_at: '2026-11-17T00:00:00.000Z' }],
  schedule: { events: [{ id: 'event-test', title: 'Admin event', date: '2026-11-17' }], todos: [{ id: 'todo-test', content: 'Admin todo', date: '2026-11-17', done: true }] },
}
async function main() {
  mock = http.createServer((req, res) => github(req, res).catch(error => json(res, 500, { error: error.message })))
  await new Promise(resolve => mock.listen(8925, '127.0.0.1', resolve))
  await start()
  const admin = await login('local-admin', 'local-admin-password')
  const member = await login('local-member', 'local-member-password')
  const loggedOut = (await request('/api/logout', { method: 'POST', cookie: member })).headers.get('set-cookie').split(';')[0]
  const memberAgain = await login('local-member', 'local-member-password')
  const forgedAdmin = member.replace(Buffer.from('local-member').toString('base64url'), Buffer.from('local-admin').toString('base64url'))
  const denied = [undefined, member, memberAgain, loggedOut, forgedAdmin, admin + '.extra', signedCookie('unknown-account'), signedCookie('former-admin'), signedCookie('local-admin', 'wrong-secret')]
  for (const [kind, items] of Object.entries(inputs)) {
    const route = '/api/content/' + kind
    await check(kind + ': public reads and admin save', async () => {
      assert.equal((await request(route)).status, 200)
      const saved = await request(route, { cookie: admin, body: { items, sha: '' } })
      assert.equal(saved.status, 200, JSON.stringify(saved.data))
      assert(saved.data.sha)
      assert.equal(saved.data.commit, api + '/mock-commit')
      assert.match(files.get('data/' + kind + '.json').message, /by local-admin/)
      if (kind === 'projects') assert.equal(saved.data.items[0].progress, 100)
      assert.deepEqual((await request(route)).data, { items: saved.data.items, sha: saved.data.sha })
      assert.deepEqual((await request(route, { cookie: member })).data.items, saved.data.items)
    })
    for (const [index, cookie] of denied.entries()) await check(kind + ': deny non-admin case ' + index, async () => {
      const before = files.get('data/' + kind + '.json')
      const attempts = calls, updates = writes
      const response = await request(route, { cookie, body: { items, sha: before.sha } })
      assert.equal(response.status, 401, 'Non-admin reached save: ' + response.status)
      assert.equal(calls, attempts, 'Denied request contacted GitHub')
      assert.equal(writes, updates)
      assert.equal(files.get('data/' + kind + '.json'), before, 'Denied request changed stored data')
    })
    await check(kind + ': auth before parsing, malformed input and SHA conflict', async () => {
      const before = files.get('data/' + kind + '.json')
      assert.equal((await request(route, { cookie: member, raw: '{' })).status, 401)
      assert.equal((await request(route, { cookie: admin, raw: '{' })).status, 400)
      assert.equal((await request(route, { cookie: admin, body: { items: kind === 'schedule' ? [] : {}, sha: before.sha } })).status, 400)
      assert.equal((await request(route, { cookie: admin, body: { items, sha: 'stale-sha' } })).status, 409)
      assert.equal(files.get('data/' + kind + '.json'), before)
      assert.equal((await request(route, { cookie: admin, body: { items, sha: before.sha } })).status, 200)
    })
  }
  await check('unknown content kind remains 404', async () => assert.equal((await request('/api/content/missing', { cookie: admin, body: {} })).status, 404))
  for (const overrides of [{ ADMIN_ID: '' }, { ADMIN_SESSION_SECRET: '' }, { ADMIN_ID: 'replacement-admin' }, { ADMIN_SESSION_SECRET: crypto.randomBytes(32).toString('hex') }]) {
    await stop(); await start(overrides)
    await check('fail closed after auth configuration change: ' + Object.keys(overrides)[0], async () => {
      for (const [kind, items] of Object.entries(inputs)) {
        const before = calls
        assert.equal((await request('/api/content/' + kind, { cookie: admin, body: { items, sha: '' } })).status, 401)
        assert.equal(calls, before)
      }
    })
  }
  await stop(); await start({ GITHUB_TOKEN: '', GITHUB_REPO: '' })
  await check('unconfigured storage preserves public fallback and admin 503', async () => {
    for (const [kind, items] of Object.entries(inputs)) {
      assert.equal((await request('/api/content/' + kind)).status, 200)
      assert.equal((await request('/api/content/' + kind, { cookie: admin, body: { items } })).status, 503)
      assert.equal((await request('/api/content/' + kind, { cookie: member, body: { items } })).status, 401)
    }
  })
  const failed = results.filter(result => result.result === 'FAIL')
  console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, failures: failed }, null, 2))
  if (failed.length) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => {
  await stop()
  if (mock) await new Promise(resolve => mock.close(resolve))
})
