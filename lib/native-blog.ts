import { createHmac, pbkdf2 as derive, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { getPrivateFile } from '@/lib/blob-storage'

const pbkdf2 = promisify(derive)
export const BLOG_PREFIX = 'blog-native/v1/'
export const validSlug = (slug: unknown): slug is string => typeof slug === 'string' && /^tistory-[1-9][0-9]*$/.test(slug)
export const validAsset = (name: string) => /^[a-f0-9]{64}\.[a-z0-9]{1,10}$/.test(name)
export type NativePost = { version: 1; slug: string; visibility: 'protected' | 'private'; title: string; content: string; assets: string[]; password?: { algorithm: 'pbkdf2-sha256'; iterations: number; salt: string; hash: string } }

export async function readNativePost(slug: string): Promise<NativePost | null> {
  if (!validSlug(slug)) return null
  const result = await getPrivateFile(`${BLOG_PREFIX}posts/${slug}.json`)
  if (!result || result.statusCode !== 200) return null
  const post = await new Response(result.stream).json() as NativePost
  return post.version === 1 && post.slug === slug ? post : null
}

export async function verifyPassword(post: NativePost, password: string) {
  const spec = post.password
  if (post.visibility !== 'protected' || !spec || spec.algorithm !== 'pbkdf2-sha256' || spec.iterations !== 600000 || !/^[a-f0-9]{32}$/.test(spec.salt) || !/^[a-f0-9]{64}$/.test(spec.hash)) return false
  const actual = await pbkdf2(password, Buffer.from(spec.salt, 'hex'), spec.iterations, 32, 'sha256')
  return timingSafeEqual(actual, Buffer.from(spec.hash, 'hex'))
}

function signature(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) throw new Error('Blog service unavailable')
  return createHmac('sha256', secret).update(`native-blog-read:v1:${payload}`).digest()
}
export function createReadTicket(slug: string) {
  const payload = Buffer.from(JSON.stringify({ slug, expires: Date.now() + 60 * 60 * 1000 })).toString('base64url')
  return `${payload}.${signature(payload).toString('base64url')}`
}
export function verifyReadTicket(token: string, slug: string) {
  try {
    const [payload, signed, extra] = token.split('.')
    if (!payload || !signed || extra || token.length > 1024) return false
    const supplied = Buffer.from(signed, 'base64url')
    const expected = signature(payload)
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return decoded.slug === slug && Number.isFinite(decoded.expires) && decoded.expires > Date.now() && decoded.expires <= Date.now() + 60 * 60 * 1000
  } catch { return false }
}

export function blogHeaders(request: Request) {
  const origin = request.headers.get('origin')
  const allowed = ['https://cedrai05.github.io', 'https://www.cedrai.info', 'https://cedrai.info']
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' })
  if (origin && allowed.includes(origin)) headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return headers
}

// A per-instance throttle bounds repeated KDF work. It is an extra control, not durable account state.
const attempts = new Map<string, { count: number; until: number }>()
export function allowAttempt(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const key = createHmac('sha256', process.env.ADMIN_SESSION_SECRET || 'unconfigured').update(ip).digest('hex')
  const now = Date.now()
  if (attempts.size > 2000) for (const [id, item] of attempts) if (item.until < now) attempts.delete(id)
  const item = attempts.get(key)
  if (!item || item.until < now) { attempts.set(key, { count: 1, until: now + 60000 }); return true }
  return ++item.count <= 15
}
