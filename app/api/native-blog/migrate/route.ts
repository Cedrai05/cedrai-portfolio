import { createHash } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { blogRole, privateBlogHeaders, sameOriginWrite } from '@/lib/blog-access'
import { readLegacyBlobAsset, readLegacyBlobJSON } from '@/lib/blog-store'
import { githubBlogStorageEnabled, readGithubBlogFile, writeGithubBlogFile } from '@/lib/github-blog-store'
import { WRITTEN_CATALOG_TAG } from '@/lib/blog-repository'
import { metadataFromStored, type StoredPost } from '@/lib/blog-writing'
import { validAsset, validWrittenSlug, WRITTEN_PREFIX, BLOG_PREFIX } from '@/lib/native-blog'

export const runtime='nodejs'
export async function POST(request:NextRequest) {
  const headers=privateBlogHeaders()
  if(blogRole(request)!=='admin'||!sameOriginWrite(request))return NextResponse.json({error:'관리자 로그인이 필요합니다.'},{status:403,headers})
  if(!githubBlogStorageEnabled())return NextResponse.json({error:'새 글 저장소가 설정되지 않았습니다.'},{status:503,headers})
  let number:number
  try { number=(await request.json()).number }
  catch { return NextResponse.json({error:'글 번호를 확인해 주세요.'},{status:400,headers}) }
  if(!Number.isSafeInteger(number)||number<124||number>999999)return NextResponse.json({error:'글 번호를 확인해 주세요.'},{status:400,headers})
  try {
    const claim=await readLegacyBlobJSON<{slug:string}>(`${WRITTEN_PREFIX}ids/${number}.json`)
    if(!claim||!validWrittenSlug(claim.slug))return NextResponse.json({error:'기존 글 번호를 찾을 수 없습니다.'},{status:404,headers})
    const slug=claim.slug
    const source=await readLegacyBlobJSON<StoredPost>(`${WRITTEN_PREFIX}posts/${slug}.json`)
    if(!source||source.version!==2||source.metadata.slug!==slug)return NextResponse.json({error:'기존 글 원본을 찾을 수 없습니다.'},{status:404,headers})
    const post={...source,metadata:{...source.metadata,number}}
    const assets: {key:string;data:Buffer}[]=[]
    for(const name of post.assets) {
      if(!validAsset(name))throw new Error('Invalid source asset name')
      const key=`${BLOG_PREFIX}assets/${name}`
      if(await readGithubBlogFile(key))continue
      const data=await readLegacyBlobAsset(key)
      if(!data||createHash('sha256').update(data).digest('hex')!==name.split('.')[0])throw new Error('Source asset is missing or damaged')
      assets.push({key,data})
    }
    const records=[
      ...assets,
      {key:`${WRITTEN_PREFIX}posts/${slug}.json`,data:Buffer.from(JSON.stringify(post))},
      {key:`${WRITTEN_PREFIX}catalog/${slug}.json`,data:Buffer.from(JSON.stringify(metadataFromStored(post)))},
      {key:`${WRITTEN_PREFIX}ids/${number}.json`,data:Buffer.from(JSON.stringify({slug}))},
      {key:`${WRITTEN_PREFIX}numbers/${slug}.json`,data:Buffer.from(JSON.stringify({number}))},
    ]
    let copied=0
    for(const record of records) {
      if(await readGithubBlogFile(record.key))continue
      try { await writeGithubBlogFile(record.key,record.data);copied++ }
      catch(error) { if(!await readGithubBlogFile(record.key))throw error }
    }
    revalidateTag(WRITTEN_CATALOG_TAG,{expire:0})
    return NextResponse.json({number,slug,copied},{headers})
  }catch {
    return NextResponse.json({error:'기존 Blob 저장소에서 원본을 읽지 못했습니다. 저장소 차단 해제 후 다시 시도해 주세요.'},{status:503,headers})
  }
}
