// 서버 전용 — 절대 클라이언트 컴포넌트에서 import 하지 마세요.
import { createHmac, timingSafeEqual } from 'crypto'

export const SESSION_COOKIE = 'cedrai_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7일

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET
  if (!s) throw new Error('ADMIN_SESSION_SECRET 환경변수가 설정되지 않았습니다.')
  return s
}

/** 길이 정보가 새지 않도록 해시로 변환한 뒤 상수 시간 비교 */
export function safeEqual(a: string, b: string) {
  const ha = createHmac('sha256', secret()).update(a).digest()
  const hb = createHmac('sha256', secret()).update(b).digest()
  return timingSafeEqual(ha, hb)
}

/** `<base64url(id)>.<hmac>` 형태의 세션 토큰 */
export function createToken(id: string) {
  const payload = Buffer.from(id, 'utf8').toString('base64url')
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

/** 유효하면 id를, 아니면 null을 돌려줍니다. */
export function readToken(token: string | undefined): string | null {
  if (!token) return null
  const [payload, sig, extra] = token.split('.')
  if (!payload || !sig || extra !== undefined) return null

  const expected = createHmac('sha256', secret()).update(payload).digest('base64url')
  const given = Buffer.from(sig, 'utf8')
  const want = Buffer.from(expected, 'utf8')
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null

  return Buffer.from(payload, 'base64url').toString('utf8')
}
