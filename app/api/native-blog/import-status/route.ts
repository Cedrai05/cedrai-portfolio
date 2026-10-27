import { NextResponse, type NextRequest } from 'next/server'
import { list } from '@vercel/blob'
import { readToken, SESSION_COOKIE } from '@/lib/session'
import { BLOG_PREFIX } from '@/lib/native-blog'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  if (!process.env.ADMIN_ID || readToken(request.cookies.get(SESSION_COOKIE)?.value) !== process.env.ADMIN_ID) return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 403 })
  try {
    const names: string[] = []
    let cursor: string | undefined
    do {
      const result = await list({ prefix: BLOG_PREFIX, cursor })
      names.push(...result.blobs.map(blob => blob.pathname.slice(BLOG_PREFIX.length)))
      cursor = result.hasMore ? result.cursor : undefined
    } while (cursor)
    return NextResponse.json({ posts: names.filter(name => name.startsWith('posts/')), assets: names.filter(name => name.startsWith('assets/')) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: '저장소를 확인할 수 없습니다.' }, { status: 503 }) }
}
