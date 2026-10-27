import { NextResponse } from 'next/server'
import { allowAttempt, blogHeaders, createReadTicket, readNativePost, validSlug, verifyPassword } from '@/lib/native-blog'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function OPTIONS(request: Request) { return new Response(null, { status: 204, headers: blogHeaders(request) }) }
export async function POST(request: Request) {
  const headers = blogHeaders(request)
  const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers })
  if (!process.env.ADMIN_SESSION_SECRET) return reply('보호글 서비스 준비 중입니다.', 503)
  if (!allowAttempt(request)) return reply('입력이 너무 많습니다. 1분 뒤 다시 시도해 주세요.', 429)
  if (Number(request.headers.get('content-length')) > 4096) return reply('입력값을 확인해 주세요.', 400)
  try {
    const { slug, password } = await request.json()
    if (!validSlug(slug) || typeof password !== 'string' || password.length > 256) return reply('입력값을 확인해 주세요.', 400)
    const post = await readNativePost(slug)
    if (!post || !await verifyPassword(post, password)) return reply('비밀번호가 일치하지 않습니다.', 401)
    return NextResponse.json({ content: post.content, assets: post.assets, ticket: createReadTicket(slug) }, { headers })
  } catch { return reply('보호글을 열지 못했습니다. 잠시 후 다시 시도해 주세요.', 503) }
}
