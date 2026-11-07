import { NextResponse } from 'next/server'
import { BLOG_CATEGORIES, postHref } from '@/lib/blog-catalog'
import { getAvailableBlogCatalog } from '@/lib/blog-repository'
export const dynamic='force-dynamic'
export async function GET(){const {posts:catalog,storageUnavailable}=await getAvailableBlogCatalog();return NextResponse.json({source:'native',storageUnavailable,categories:BLOG_CATEGORIES.map(name=>{const posts=catalog.filter(post=>post.category===name);return {name,path:'/blog',count:posts.length,posts:posts.slice(0,10).map(post=>({id:post.slug,title:post.title,href:postHref(post),date:post.date.slice(0,7).replace('-','.'),locked:post.protected}))}})},{headers:{'Cache-Control':'no-store'}})}
