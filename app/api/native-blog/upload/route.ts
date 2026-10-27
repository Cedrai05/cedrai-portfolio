import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse, type NextRequest } from 'next/server'
import { readToken, SESSION_COOKIE } from '@/lib/session'
import { BLOG_PREFIX, validAsset, validSlug } from '@/lib/native-blog'
import { blogRole, sameOriginWrite, privateBlogHeaders } from '@/lib/blog-access'
import { blobStorageEnabled } from '@/lib/blob-storage'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  if (blogRole(request) !== 'admin') return NextResponse.json({error:'관리자 로그인이 필요합니다.'},{status:403})
  return NextResponse.json({storage:blobStorageEnabled()?'blob':'local'},{headers:privateBlogHeaders()})
}
export async function POST(request: NextRequest) {
  try {
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      if (blogRole(request) !== 'admin' || !sameOriginWrite(request) || blobStorageEnabled() || process.env.VERCEL) return NextResponse.json({error:'업로드를 허용하지 않습니다.'},{status:403})
      const form=await request.formData(), file=form.get('file'), name=String(form.get('name')||'')
      if (!(file instanceof File) || !validAsset(name) || file.size>20*1024*1024) return NextResponse.json({error:'파일을 확인해 주세요.'},{status:400})
      const data=Buffer.from(await file.arrayBuffer())
      if(createHash('sha256').update(data).digest('hex')!==name.split('.')[0]) return NextResponse.json({error:'파일 검증에 실패했습니다.'},{status:400})
      const dir=path.join(process.cwd(),'.private_uploads/native-blog',BLOG_PREFIX,'assets')
      await mkdir(dir,{recursive:true,mode:0o700}); await writeFile(path.join(dir,name),data,{mode:0o600})
      return NextResponse.json({ok:true},{headers:privateBlogHeaders()})
    }
    const body = await request.json() as HandleUploadBody
    const result = await handleUpload({ body, request, onBeforeGenerateToken: async pathname => {
      const id = readToken(request.cookies.get(SESSION_COOKIE)?.value)
      if (!sameOriginWrite(request) || !process.env.ADMIN_ID || id !== process.env.ADMIN_ID) throw new Error('관리자 로그인이 필요합니다.')
      const post = pathname.slice(`${BLOG_PREFIX}posts/`.length).replace(/\.json$/, '')
      const allowed = (pathname === `${BLOG_PREFIX}posts/${post}.json` && validSlug(post)) || (pathname.startsWith(`${BLOG_PREFIX}assets/`) && validAsset(pathname.slice(`${BLOG_PREFIX}assets/`.length)))
      if (!allowed) throw new Error('이관 파일 경로가 올바르지 않습니다.')
      return { addRandomSuffix: false, allowOverwrite: true, maximumSizeInBytes: 100 * 1024 * 1024, tokenPayload: JSON.stringify({ adminId: id }) }
    } })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return NextResponse.json({ error: '관리자 인증 또는 업로드 파일을 확인해 주세요.' }, { status: 403 }) }
}
