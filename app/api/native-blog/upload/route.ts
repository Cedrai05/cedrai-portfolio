import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse, type NextRequest } from 'next/server'
import { readToken, SESSION_COOKIE } from '@/lib/session'
import { BLOG_PREFIX, validAsset, validSlug } from '@/lib/native-blog'
export const runtime = 'nodejs'
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HandleUploadBody
    const result = await handleUpload({ body, request, onBeforeGenerateToken: async pathname => {
      const id = readToken(request.cookies.get(SESSION_COOKIE)?.value)
      if (!process.env.ADMIN_ID || id !== process.env.ADMIN_ID) throw new Error('관리자 로그인이 필요합니다.')
      const post = pathname.slice(`${BLOG_PREFIX}posts/`.length).replace(/\.json$/, '')
      const allowed = (pathname === `${BLOG_PREFIX}posts/${post}.json` && validSlug(post)) || (pathname.startsWith(`${BLOG_PREFIX}assets/`) && validAsset(pathname.slice(`${BLOG_PREFIX}assets/`.length)))
      if (!allowed) throw new Error('이관 파일 경로가 올바르지 않습니다.')
      return { addRandomSuffix: false, maximumSizeInBytes: 100 * 1024 * 1024, tokenPayload: JSON.stringify({ adminId: id }) }
    } })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: '관리자 인증 또는 업로드 파일을 확인해 주세요.' }, { status: 403 }) }
}
