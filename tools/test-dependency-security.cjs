// Run from the repository root after npm ci. Uses only bounded, disposable input.
const assert = require('node:assert/strict')
const { createRequire } = require('node:module')
const { test } = require('node:test')

// Resolve through the consumers so a nested vulnerable copy cannot pass unnoticed.
const blobRequire = createRequire(require.resolve('@vercel/blob'))
const oidcRequire = createRequire(blobRequire.resolve('@vercel/oidc'))
const configRequire = createRequire(oidcRequire.resolve('@vercel/cli-config'))
const eslintRequire = createRequire(require.resolve('eslint-config-next'))
const parserRequire = createRequire(eslintRequire.resolve('@typescript-eslint/parser'))
const estreeRequire = createRequire(parserRequire.resolve('@typescript-eslint/typescript-estree'))
const { z } = configRequire('zod')
const config = oidcRequire('@vercel/cli-config')
const { Minimatch, minimatch } = estreeRequire('minimatch')

test('Vercel config also bundles patched Zod, not just a patched external dependency', () => {
  let visited = 0
  const schema = config.authConfigSchema.refine(() => { visited++; return true }).array().max(1)
  const result = schema.safeParse(Array.from({ length: 100 }, () => ({ token: 'disposable-token' })))
  assert.equal(result.success, false)
  assert.equal(result.error.issues[0].code, 'too_big')
  assert.equal(visited, 0)
  assert.deepEqual(schema.parse([{ token: 'disposable-token' }]), [{ token: 'disposable-token' }])
  assert.equal(visited, 1)
})

test('Zod rejects oversized arrays before visiting elements, including nested and async inputs', async () => {
  let visited = 0
  const item = z.string().refine(() => { visited++; return true })
  const schema = z.array(item).max(2)
  const oversized = Array(100).fill('item')
  const results = [
    schema.safeParse(oversized),
    z.object({ items: schema }).safeParse({ items: oversized }),
    await schema.safeParseAsync(oversized),
    z.array(item).length(2).safeParse(oversized),
  ]
  for (const result of results) {
    assert.equal(result.success, false)
    assert.equal(result.error.issues.length, 1)
    assert.equal(result.error.issues[0].code, 'too_big')
  }
  assert.equal(visited, 0)
  assert.deepEqual(schema.parse(['one', 'two']), ['one', 'two'])
  assert.equal(visited, 2)
  assert.equal(schema.safeParse([1]).success, false)
})

test('Zod also rejects oversized maps and sets before element validation', () => {
  let visited = 0
  const item = z.string().refine(() => { visited++; return true })
  const map = z.map(item, item).max(1)
  const set = z.set(item).max(1)
  for (const result of [map.safeParse(new Map([['a', 'a'], ['b', 'b']])), set.safeParse(new Set(['a', 'b']))]) {
    assert.equal(result.success, false)
    assert.equal(result.error.issues[0].code, 'too_big')
  }
  assert.equal(visited, 0)
  assert.deepEqual(map.parse(new Map([['a', 'a']])), new Map([['a', 'a']]))
  assert.deepEqual(set.parse(new Set(['a'])), new Set(['a']))
})

test('Vercel config parsing, encoding, passthrough fields and invalid-input rejection remain compatible', () => {
  const global = { credStorage: 'file', currentTeam: 'disposable-team', telemetry: { enabled: false }, futureOption: true }
  const auth = { token: 'disposable-token', refreshToken: 'disposable-refresh', expiresAt: 2000000000, tokenSource: 'env' }
  assert.deepEqual(config.parseGlobalConfig(global), global)
  assert.deepEqual(z.encode(config.globalConfigSchema, global), global)
  assert.deepEqual(config.parseAuthConfig(auth), auth)
  assert.deepEqual(z.encode(config.authConfigSchema, auth), auth)
  const { tokenSource, ...storedAuth } = auth
  assert.deepEqual(config.parseAuthFileConfig(auth), storedAuth)
  assert.throws(() => config.parseGlobalConfig({ credStorage: 'invalid' }), /credStorage/)
  assert.throws(() => config.parseAuthConfig({ token: [] }))
})

test('Minimatch enforces the pattern-expansion budget for repeated globstar/parent segments', () => {
  const pattern = Array(6).fill('**/../a/b').join('/')
  assert.throws(() => new Minimatch(pattern, { optimizationLevel: 2, braceExpandMax: 4 }), /too many patterns/)
  assert.equal(minimatch('src/article.tsx', 'src/**/*.tsx', { dot: true }), true)
  assert.equal(minimatch('src/article.js', 'src/**/*.tsx', { dot: true }), false)
  assert.equal(minimatch('src/.hidden.tsx', 'src/**/*.tsx', { dot: true }), true)
})
