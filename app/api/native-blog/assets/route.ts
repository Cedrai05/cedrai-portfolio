import { NextResponse } from 'next/server'
import { BLOG_PREFIX, blogHeaders, readNativePost, validAsset, validSlug, verifyReadTicket } from '@/lib/native-blog'
import { getPrivateFile } from '@/lib/blob-storage'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function OPTIONS(request: Request) { return new Response(null, { status: 204, headers: blogHeaders(request) }) }
export async function GET(request: Request) {
  const headers = blogHeaders(request)
  const fail = (status: number) => NextResponse.json({ error: '파일을 열 수 없습니다.' }, { status, headers })
  const params = new URL(request.url).searchParams
  const slug = params.get('slug'), name = params.get('name') || ''
  const token = request.headers.get('authorization')?.replace(/^Bearer /, '') || ''
  if (!validSlug(slug) || !validAsset(name) || !verifyReadTicket(token, slug)) return fail(401)
  try {
    const post = await readNativePost(slug)
    if (post?.visibility !== 'protected' || !post.assets.includes(name)) return fail(404)
    const result = await getPrivateFile(`${BLOG_PREFIX}assets/${name}`)
    if (!result || result.statusCode !== 200) return fail(404)
    const contentType = result.blob.contentType || 'application/octet-stream'
    // Active document formats download rather than executing on the portfolio origin.
    const inline = /^(image\/(?:png|jpeg|gif|webp|avif)|video\/mp4|audio\/)/.test(contentType)
    headers.set('Content-Type', contentType)
    headers.set('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${name}"`)
    headers.set('Content-Security-Policy', "default-src 'none'; sandbox")
    return new Response(result.stream, { headers })
  } catch { return fail(503) }
}
