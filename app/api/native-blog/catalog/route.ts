import { NextResponse } from 'next/server'
import { getAvailableBlogCatalog } from '@/lib/blog-repository'
import { privateBlogHeaders } from '@/lib/blog-access'
export const dynamic='force-dynamic'
export async function GET() {
  const {posts,storageUnavailable}=await getAvailableBlogCatalog()
  return NextResponse.json({posts,total:posts.length,storageUnavailable},{headers:privateBlogHeaders()})
}
