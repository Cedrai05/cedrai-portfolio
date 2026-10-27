import { NextResponse,type NextRequest } from 'next/server'
import { BLOG_PREFIX,validAsset,validSlug } from '@/lib/native-blog'
import { getPostMetadata,getStoredArticle } from '@/lib/blog-repository'
import { blogRole,canReadSecret,privateBlogHeaders } from '@/lib/blog-access'
import { readBlogAsset } from '@/lib/blog-store'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest) {
  const headers=privateBlogHeaders()
  const fail=(status:number)=>NextResponse.json({error:'파일을 열 수 없습니다.'},{status,headers})
  const params=new URL(request.url).searchParams
  const slug=params.get('slug'),name=params.get('name')||'',preview=params.get('preview')==='1'
  if(!validAsset(name))return fail(404)
  const role=blogRole(request)
  try {
    if(preview) {if(role!=='admin')return fail(403)}
    else {
      if(!validSlug(slug))return fail(404)
      const metadata=await getPostMetadata(slug)
      if(!metadata)return fail(404)
      if(metadata.protected&&!canReadSecret(role))return fail(401)
      const post=await getStoredArticle(slug)
      if(!post||!post.assets.includes(name))return fail(404)
    }
    const file=await readBlogAsset(`${BLOG_PREFIX}assets/${name}`)
    if(!file)return fail(404)
    const ext=name.split('.').pop()!
    const mime:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',mp4:'video/mp4',mp3:'audio/mpeg',pdf:'application/pdf'}
    const contentType=file.contentType||mime[ext]||'application/octet-stream'
    const inline=/^(image\/(?:png|jpeg|gif|webp|avif)|video\/mp4|audio\/)/.test(contentType)
    headers.set('Content-Type',contentType)
    headers.set('Content-Disposition',`${inline?'inline':'attachment'}; filename="${name}"`)
    headers.set('Content-Security-Policy',"default-src 'none'; sandbox")
    return new Response(file.body,{headers})
  } catch{return fail(503)}
}
