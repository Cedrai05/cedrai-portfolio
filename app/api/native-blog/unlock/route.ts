import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({error:'글별 비밀번호는 더 이상 사용하지 않습니다. 관리자 또는 seKUrity 계정으로 로그인해 주세요.'},{status:410,headers:{'Cache-Control':'no-store'}})
}
