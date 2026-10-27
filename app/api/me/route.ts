import { NextResponse, type NextRequest } from 'next/server'
import { readToken, SESSION_COOKIE } from '@/lib/session'
import { roleForId, privateBlogHeaders } from '@/lib/blog-access'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest) {
  const id=process.env.ADMIN_SESSION_SECRET ? readToken(request.cookies.get(SESSION_COOKIE)?.value) : null
  const role=roleForId(id)
  return NextResponse.json({id:role?id:null,role},{headers:privateBlogHeaders()})
}
