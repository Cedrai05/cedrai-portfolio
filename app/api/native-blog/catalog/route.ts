import { NextResponse } from 'next/server'
import { getBlogCatalog } from '@/lib/blog-repository'
export const dynamic='force-dynamic'
export async function GET() {
  try { const posts=await getBlogCatalog();return NextResponse.json({posts,total:posts.length},{headers:{'Cache-Control':'no-store'}}) }
  catch{return NextResponse.json({error:'글 목록을 불러오지 못했습니다.'},{status:503})}
}
