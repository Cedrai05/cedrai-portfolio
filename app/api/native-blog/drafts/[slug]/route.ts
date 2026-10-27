import { NextResponse,type NextRequest } from 'next/server'
import { blogRole,privateBlogHeaders,sameOriginWrite } from '@/lib/blog-access'
import { WRITTEN_PREFIX } from '@/lib/native-blog'
import { writeBlogJSON } from '@/lib/blog-store'
import { readWrittenPost,writtenMetadata } from '@/lib/blog-writing'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}) {
  const headers=privateBlogHeaders()
  if(blogRole(request)!=='admin')return NextResponse.json({error:'관리자 로그인이 필요합니다.'},{status:403,headers})
  try {
    const {slug}=await params
    const post=await readWrittenPost(slug,true)
    if(!post||post.archivedAt||await writtenMetadata(slug))return NextResponse.json({error:'임시 저장한 글을 찾을 수 없습니다.'},{status:404,headers})
    return NextResponse.json({post:post.metadata,markdown:post.markdown,assets:post.assets},{headers})
  } catch{return NextResponse.json({error:'임시 저장한 글을 불러오지 못했습니다.'},{status:503,headers})}
}

async function archive(request:NextRequest,params:Promise<{slug:string}>,restore:boolean){
  const headers=privateBlogHeaders()
  if(blogRole(request)!=='admin'||!sameOriginWrite(request))return NextResponse.json({error:'관리자 로그인이 필요합니다.'},{status:403,headers})
  try{
    const {slug}=await params,post=await readWrittenPost(slug,true)
    if(!post||await writtenMetadata(slug))return NextResponse.json({error:'임시글을 찾을 수 없습니다.'},{status:404,headers})
    if(restore)delete post.archivedAt;else post.archivedAt=new Date().toISOString()
    await writeBlogJSON(`${WRITTEN_PREFIX}drafts/${slug}.json`,post,true)
    return NextResponse.json({ok:true},{headers})
  }catch{return NextResponse.json({error:'임시글을 변경하지 못했습니다.'},{status:503,headers})}
}
export async function DELETE(request:NextRequest,{params}:{params:Promise<{slug:string}>}){return archive(request,params,false)}
export async function POST(request:NextRequest,{params}:{params:Promise<{slug:string}>}){return archive(request,params,true)}
