import { NextRequest } from 'next/server'
import { readToken, SESSION_COOKIE } from '@/lib/session'
export type BlogRole = 'admin' | 'club-member' | null
export function roleForId(id: string | null): BlogRole {
  if (!id) return null
  if (process.env.ADMIN_ID && id === process.env.ADMIN_ID) return 'admin'
  if (process.env.CLUB_ID && id === process.env.CLUB_ID) return 'club-member'
  return null
}
export function blogRole(request: NextRequest): BlogRole {
  if (!process.env.ADMIN_SESSION_SECRET) return null
  return roleForId(readToken(request.cookies.get(SESSION_COOKIE)?.value))
}
export function canReadSecret(role: BlogRole) { return role === 'admin' || role === 'club-member' }
export function sameOriginWrite(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    const source = new URL(origin)
    const targetHost = request.headers.get('host') || new URL(request.url).host
    return ['https:', 'http:'].includes(source.protocol) && source.host === targetHost
  } catch { return false }
}
export function privateBlogHeaders() {
  return new Headers({ 'Cache-Control':'private, no-store', 'Vary':'Cookie', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' })
}
