import { NextResponse } from 'next/server'
import { getAvailableBlogCatalog } from '@/lib/blog-repository'
export const dynamic='force-dynamic'
export async function GET(){const {posts,storageUnavailable}=await getAvailableBlogCatalog();return NextResponse.json({posts,total:posts.length,source:'native',storageUnavailable},{headers:{'Cache-Control':'no-store'}})}
