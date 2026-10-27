import { NextResponse } from 'next/server'
import { BLOG_CATEGORIES } from '@/lib/blog-catalog'
import { getBlogCatalog } from '@/lib/blog-repository'
export const dynamic='force-dynamic'
export async function GET(){try{const catalog=await getBlogCatalog();return NextResponse.json({source:'native',categories:BLOG_CATEGORIES.map(name=>{const posts=catalog.filter(post=>post.category===name);return {name,path:'/blog#archive',count:posts.length,posts:posts.slice(0,10).map(post=>({id:post.slug,title:post.title,href:`/blog?post=${post.slug}`,date:post.date.slice(0,7).replace('-','.'),locked:post.protected}))}})},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'목록을 불러오지 못했습니다.'},{status:503})}}
