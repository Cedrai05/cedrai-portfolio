import { NextResponse } from 'next/server'
import catalog from '@/data/blog-catalog.json'
const categories = ['개발', 'CTF/Wargame', 'Bug Bounty', '블로그/기술문서', '논문/컨퍼런스', '공모전/자격증']
export async function GET() {
  return NextResponse.json({ source: 'native', categories: categories.map(name => {
    const posts = catalog.posts.filter(post => post.category === name)
    return { name, path: '/#archive', count: posts.length, posts: posts.slice(0,10).map(post => ({ id: post.slug, title: post.title, href: `https://cedrai05.github.io/?post=${post.slug}`, date: post.date.slice(0,7).replace('-', '.'), locked: post.protected })) }
  }) }, { headers: { 'Cache-Control': 'public, max-age=60' } })
}
