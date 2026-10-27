import { NextResponse } from 'next/server'
import catalog from '@/data/blog-catalog.json'
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') || ''
  const post = catalog.posts.find(post => post.slug === `tistory-${id}`)
  if (!post) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } })
  if (post.protected) return NextResponse.json({ error: '이 블로그에서 글 비밀번호를 입력해 주세요.' }, { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } })
  return NextResponse.redirect(`https://cedrai05.github.io/content/posts/${post.slug}.json`, 307)
}
