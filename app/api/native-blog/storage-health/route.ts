import { list } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'
import { blogRole, privateBlogHeaders } from '@/lib/blog-access'

export const runtime='nodejs'
export const dynamic='force-dynamic'

export async function GET(request:NextRequest) {
  const headers=privateBlogHeaders()
  if(blogRole(request)!=='admin')return NextResponse.json({error:'관리자 로그인이 필요합니다.'},{status:403,headers})
  const token=process.env.BLOB_READ_WRITE_TOKEN
  if(!token)return NextResponse.json({error:'비공개 Blob 읽기·쓰기 토큰이 설정되지 않았습니다.'},{status:503,headers})
  try {
    const key='blog-native/v2/ids/129.json'
    const {blobs}=await list({prefix:key,token})
    const blob=blobs.find(item=>item.pathname===key)
    if(!blob)return NextResponse.json({listed:false},{headers})
    const url=new URL(blob.url)
    const response=await fetch(blob.url,{headers:{authorization:`Bearer ${token}`},cache:'no-store'})
    const error=response.ok?undefined:(await response.text()).replace(/[A-Za-z0-9_-]{32,}/g,'[redacted]').slice(0,400)
    return NextResponse.json({listed:true,hostKind:url.hostname.includes('.private.')?'private':url.hostname.includes('.public.')?'public':'other',status:response.status,error},{headers})
  }catch(error) {
    return NextResponse.json({error:(error as Error).message.replace(/[A-Za-z0-9_-]{32,}/g,'[redacted]').slice(0,400)},{status:503,headers})
  }
}
