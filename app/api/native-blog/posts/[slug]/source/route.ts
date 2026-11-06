import { NextResponse, type NextRequest } from 'next/server'
import { blogRole, privateBlogHeaders } from '@/lib/blog-access'
import { metadataFromStored, readWrittenPost, writtenMetadata } from '@/lib/blog-writing'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}) {
  const headers=privateBlogHeaders()
  if(blogRole(request)!=='admin')return NextResponse.json({error:'관리자 로그인이 필요합니다.'},{status:403,headers})
  try {
    const {slug}=await params
    const post=await readWrittenPost(slug)
    if(!post||post.version!==2||post.archivedAt||!await writtenMetadata(slug))return NextResponse.json({error:'수정할 글을 찾을 수 없습니다.'},{status:404,headers})
    return NextResponse.json({post:{...metadataFromStored(post),summary:post.metadata.summary},markdown:post.markdown,assets:post.assets,revision:post.fingerprint},{headers})
  } catch {
    return NextResponse.json({error:'글 원본을 불러오지 못했습니다.'},{status:503,headers})
  }
}
