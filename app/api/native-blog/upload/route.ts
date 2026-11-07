import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { blogRole, privateBlogHeaders, sameOriginWrite } from '@/lib/blog-access'
import { writeBlogAsset, writeBlogJSON } from '@/lib/blog-store'
import { githubBlogStorageEnabled } from '@/lib/github-blog-store'
import { BLOG_PREFIX, type NativePost, validAsset } from '@/lib/native-blog'

export const runtime = 'nodejs'
const maxFileBytes = 4 * 1024 * 1024

export async function GET(request: NextRequest) {
  const headers = privateBlogHeaders()
  if (blogRole(request) !== 'admin') return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 403, headers })
  return NextResponse.json({ storage: githubBlogStorageEnabled() ? 'github' : 'local', maxFileBytes }, { headers })
}

export async function POST(request: NextRequest) {
  const headers = privateBlogHeaders()
  if (blogRole(request) !== 'admin' || !sameOriginWrite(request)) return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 403, headers })
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return NextResponse.json({ error: '파일 형식이 올바르지 않습니다.' }, { status: 415, headers })
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || file.size > maxFileBytes) return NextResponse.json({ error: '파일은 4MB 이하여야 합니다.' }, { status: 400, headers })
    const name = String(form.get('name') || file.name)
    const data = Buffer.from(await file.arrayBuffer())
    if (validAsset(name)) {
      if (createHash('sha256').update(data).digest('hex') !== name.split('.')[0]) return NextResponse.json({ error: '첨부파일 검증에 실패했습니다.' }, { status: 400, headers })
      await writeBlogAsset(`${BLOG_PREFIX}assets/${name}`, data)
    } else if (name === file.name && /^tistory-[1-9][0-9]*\.json$/.test(name)) {
      const slug = name.slice(0, -5)
      const post = JSON.parse(data.toString('utf8')) as NativePost
      if (post.version !== 1 || post.slug !== slug || !['protected', 'private'].includes(post.visibility) || typeof post.title !== 'string' || typeof post.content !== 'string' || !Array.isArray(post.assets) || post.assets.some(name => typeof name !== 'string' || !validAsset(name))) return NextResponse.json({ error: '글 파일 검증에 실패했습니다.' }, { status: 400, headers })
      await writeBlogJSON(`${BLOG_PREFIX}posts/${name}`, post, true)
    } else return NextResponse.json({ error: '지원하지 않는 파일입니다.' }, { status: 400, headers })
    return NextResponse.json({ ok: true }, { headers })
  } catch { return NextResponse.json({ error: '업로드 파일을 확인해 주세요.' }, { status: 400, headers }) }
}
