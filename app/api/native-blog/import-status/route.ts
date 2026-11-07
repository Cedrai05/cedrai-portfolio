import { NextResponse, type NextRequest } from 'next/server'
import { blogRole, privateBlogHeaders } from '@/lib/blog-access'
import { listBlogKeys } from '@/lib/blog-store'
import { BLOG_PREFIX } from '@/lib/native-blog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const headers = privateBlogHeaders()
  if (blogRole(request) !== 'admin') return NextResponse.json({ error: '관리자 로그인이 필요합니다.' }, { status: 403, headers })
  try {
    const [posts, assets] = await Promise.all([
      listBlogKeys(`${BLOG_PREFIX}posts/`),
      listBlogKeys(`${BLOG_PREFIX}assets/`),
    ])
    return NextResponse.json({ posts: posts.map(name => name.slice(BLOG_PREFIX.length)), assets: assets.map(name => name.slice(BLOG_PREFIX.length)) }, { headers })
  } catch { return NextResponse.json({ error: '저장소를 확인할 수 없습니다.' }, { status: 503, headers }) }
}
