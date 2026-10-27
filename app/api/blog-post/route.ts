import { NextResponse } from 'next/server'
import { BLOG_POSTS } from '@/lib/blog-catalog'
import { getBlogPost } from '@/lib/blog-post'
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') || ''
  const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' }
  const post = BLOG_POSTS.find(post => post.slug === `tistory-${id}`)
  if (!post) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404, headers })
  if (post.protected) return NextResponse.json({ error: '이 블로그에서 글 비밀번호를 입력해 주세요.' }, { status: 403, headers })
  const article = await getBlogPost(id)
  if (!article) return NextResponse.json({ error: '본문을 찾을 수 없습니다.' }, { status: 404, headers })
  const origin = new URL(request.url).origin
  return NextResponse.json({ title: article.title, content: article.contentHtml.replaceAll('/blog-content/', `${origin}/blog-content/`), sourceUrl: new URL(article.href,origin).href }, { headers })
}
