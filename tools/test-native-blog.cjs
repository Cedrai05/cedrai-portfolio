// Run after npm ci: node tools/test-native-blog.cjs
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const code = ts.transpileModule(fs.readFileSync('lib/native-blog.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = { exports: {} }
vm.runInNewContext(code, { exports: mod.exports, require: name => name === '@/lib/blob-storage' ? {} : require(name), process, Buffer, Response, Headers, Date, Map })
const api = mod.exports
process.env.ADMIN_SESSION_SECRET = crypto.randomBytes(32).toString('hex')
;(async () => {
  const salt = crypto.randomBytes(16).toString('hex')
  const password = 'test-password-only'
  const post = { visibility:'protected', password:{ algorithm:'pbkdf2-sha256', iterations:600000, salt, hash: crypto.pbkdf2Sync(password, Buffer.from(salt,'hex'),600000,32,'sha256').toString('hex') } }
  assert.equal(await api.verifyPassword(post,password),true)
  assert.equal(await api.verifyPassword(post,'wrong'),false)
  assert.equal(await api.verifyPassword({...post,visibility:'private'},password),false)
  const ticket = api.createReadTicket('tistory-1')
  assert.equal(api.verifyReadTicket(ticket,'tistory-1'),true)
  assert.equal(api.verifyReadTicket(ticket,'tistory-2'),false)
  assert.equal(api.verifyReadTicket(ticket+'x','tistory-1'),false)
  const adminPayload = Buffer.from('admin').toString('base64url')
  const adminToken = adminPayload+'.'+crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update(adminPayload).digest('base64url')
  assert.equal(api.verifyReadTicket(adminToken,'tistory-1'),false)
  const expiredPayload = Buffer.from(JSON.stringify({slug:'tistory-1',expires:Date.now()-1})).toString('base64url')
  const expired = expiredPayload+'.'+crypto.createHmac('sha256',process.env.ADMIN_SESSION_SECRET).update('native-blog-read:v1:'+expiredPayload).digest('base64url')
  assert.equal(api.verifyReadTicket(expired,'tistory-1'),false)
  assert.equal(api.validAsset('../secret.json'),false)
  assert.equal(api.validSlug('tistory-1/../2'),false)
  assert.equal(api.blogHeaders(new Request('https://example.test',{headers:{origin:'https://evil.test'}})).get('Access-Control-Allow-Origin'),null)
  const request = new Request('https://example.test',{headers:{'x-forwarded-for':'test-ip'}})
  for(let i=0;i<15;i++) assert.equal(api.allowAttempt(request),true)
  assert.equal(api.allowAttempt(request),false)
  console.log('Native blog security checks passed: password, visibility, ticket integrity/scope/expiry, session isolation, paths, CORS, throttle')
})().catch(error=>{console.error(error);process.exitCode=1})
