import { NextResponse,type NextRequest } from 'next/server'
import { blogRole,privateBlogHeaders } from '@/lib/blog-access'
import { listDrafts } from '@/lib/blog-writing'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest) {
  const headers=privateBlogHeaders()
  if(blogRole(request)!=='admin')return NextResponse.json({error:'관리자 로그인이 필요합니다.'},{status:403,headers})
  try{return NextResponse.json({posts:await listDrafts()},{headers})}
  catch{return NextResponse.json({error:'임시 저장한 글을 불러오지 못했습니다.'},{status:503,headers})}
}
