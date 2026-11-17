import { NextResponse,type NextRequest } from 'next/server'
import { getPostMetadata,getStoredArticle,WRITTEN_CATALOG_TAG } from '@/lib/blog-repository'
import { blogRole,canReadSecret,privateBlogHeaders,sameOriginWrite } from '@/lib/blog-access'
import { markBlogPostDeleted } from '@/lib/blog-deletion'
import { revalidateTag } from 'next/cache'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}) {
  const headers=privateBlogHeaders()
  try {
    const {slug}=await params
    const metadata=await getPostMetadata(slug)
    if(!metadata)return NextResponse.json({error:'글을 찾을 수 없습니다.'},{status:404,headers})
    if(metadata.protected&&!canReadSecret(blogRole(request)))return NextResponse.json({error:'로그인해 주세요.'},{status:401,headers})
    const post=await getStoredArticle(slug)
    if(!post)return NextResponse.json({error:'본문을 찾을 수 없습니다.'},{status:404,headers})
    return NextResponse.json({content:post.content,assets:post.assets},{headers})
  } catch{return NextResponse.json({error:'본문을 불러오지 못했습니다.'},{status:503,headers})}
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{slug:string}>}) {
  const headers=privateBlogHeaders()
  if(blogRole(request)!=='admin')return NextResponse.json({error:'관리자만 글을 삭제할 수 있습니다.'},{status:403,headers})
  if(!sameOriginWrite(request))return NextResponse.json({error:'요청을 확인해 주세요.'},{status:403,headers})
  try {
    const {slug}=await params
    const post=await getPostMetadata(slug)
    if(!post)return NextResponse.json({error:'글을 찾을 수 없습니다.'},{status:404,headers})
    await markBlogPostDeleted(post.slug)
    revalidateTag(WRITTEN_CATALOG_TAG,{expire:0})
    return NextResponse.json({ok:true},{headers})
  } catch{return NextResponse.json({error:'글을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'},{status:503,headers})}
}
