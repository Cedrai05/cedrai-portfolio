import { NextResponse, type NextRequest } from 'next/server'
import { getBlogCatalog } from '@/lib/blog-repository'
import { blogRole, privateBlogHeaders } from '@/lib/blog-access'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest) {
  try { const posts=await getBlogCatalog();return NextResponse.json({posts,total:posts.length},{headers:privateBlogHeaders()}) }
  catch(error) {
    const detail=error as Error & {statusCode?:number;status?:number;code?:string;cause?:Error & {statusCode?:number;status?:number;code?:string}}
    const diagnostic=blogRole(request)==='admin'?{name:detail?.name,code:detail?.code,status:detail?.statusCode??detail?.status,message:detail?.message?.replace(/[A-Za-z0-9_-]{32,}/g,'[redacted]').slice(0,300),cause:detail?.cause&&{name:detail.cause.name,code:detail.cause.code,status:detail.cause.statusCode??detail.cause.status,message:detail.cause.message?.replace(/[A-Za-z0-9_-]{32,}/g,'[redacted]').slice(0,300)}}:undefined
    return NextResponse.json({error:'글 목록을 불러오지 못했습니다.',diagnostic},{status:503,headers:privateBlogHeaders()})
  }
}
