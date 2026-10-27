import { NextResponse,type NextRequest } from 'next/server'
import { getPostMetadata,getStoredArticle } from '@/lib/blog-repository'
import { blogRole,canReadSecret,privateBlogHeaders } from '@/lib/blog-access'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  const headers=privateBlogHeaders(),id=new URL(request.url).searchParams.get('id')||'',slug=id.startsWith('blog-')?id:`tistory-${id}`
  try{const post=await getPostMetadata(slug);if(!post)return NextResponse.json({error:'글을 찾을 수 없습니다.'},{status:404,headers})
    if(post.protected&&!canReadSecret(blogRole(request)))return NextResponse.json({error:'로그인해 주세요.'},{status:401,headers})
    const article=await getStoredArticle(slug);if(!article)return NextResponse.json({error:'본문을 찾을 수 없습니다.'},{status:404,headers})
    return NextResponse.json({title:post.title,content:article.content,assets:article.assets,sourceUrl:`/blog?post=${slug}`},{headers})
  }catch{return NextResponse.json({error:'본문을 불러오지 못했습니다.'},{status:503,headers})}
}
