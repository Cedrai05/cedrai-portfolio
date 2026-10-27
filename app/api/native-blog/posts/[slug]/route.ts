import { NextResponse,type NextRequest } from 'next/server'
import { getPostMetadata,getStoredArticle } from '@/lib/blog-repository'
import { blogRole,canReadSecret,privateBlogHeaders } from '@/lib/blog-access'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}) {
  const headers=privateBlogHeaders()
  try {
    const {slug}=await params
    const metadata=await getPostMetadata(slug)
    if(!metadata)return NextResponse.json({error:'글을 찾을 수 없습니다.'},{status:404,headers})
    if(metadata.protected&&!canReadSecret(blogRole(request)))return NextResponse.json({error:'관리자 또는 seKUrity 계정으로 로그인해 주세요.'},{status:401,headers})
    const post=await getStoredArticle(slug)
    if(!post)return NextResponse.json({error:'본문을 찾을 수 없습니다.'},{status:404,headers})
    return NextResponse.json({content:post.content,assets:post.assets},{headers})
  } catch{return NextResponse.json({error:'본문을 불러오지 못했습니다.'},{status:503,headers})}
}
