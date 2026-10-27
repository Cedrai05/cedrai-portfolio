import { NextResponse } from 'next/server'
import catalog from '@/data/blog-catalog.json'
export async function GET() {
  return NextResponse.json({ ...catalog, source: 'native' }, { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' } })
}
