import { postHref } from '@/lib/blog-catalog'
import { NextResponse, type NextRequest } from 'next/server'
import { blogRole, privateBlogHeaders, sameOriginWrite } from '@/lib/blog-access'
import { BlogInputError, renderBlogMarkdown, saveWriting, validateWriting } from '@/lib/blog-writing'
export const runtime='nodejs'
export async function POST(request:NextRequest) {
  const headers=privateBlogHeaders()
  if(blogRole(request)!=='admin')return NextResponse.json({error:'관리자만 글을 작성할 수 있습니다.'},{status:403,headers})
  if(!sameOriginWrite(request)||!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'요청을 확인해 주세요.'},{status:403,headers})
  try {
    const text=await request.text()
    if(text.length>700000)throw new BlogInputError('본문은 50만 자 이내로 작성해 주세요.')
    const body=JSON.parse(text)
    const input=validateWriting(body)
    if(body.mode==='preview')return NextResponse.json({content:renderBlogMarkdown(input,true)},{headers})
    if(body.mode!=='draft'&&body.mode!=='publish')throw new BlogInputError('저장 방식을 확인해 주세요.')
    const metadata=await saveWriting(input,body.mode==='publish')
    return NextResponse.json({post:metadata,href:body.mode==='draft'?`/blog/write?draft=${metadata.slug}`:postHref(metadata),draft:body.mode==='draft'},{headers})
  } catch(error) {
    const status=error instanceof BlogInputError?error.status:error instanceof SyntaxError?400:503
    return NextResponse.json({error:error instanceof BlogInputError?error.message:status===400?'입력 내용을 확인해 주세요.':'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'},{status,headers})
  }
}
