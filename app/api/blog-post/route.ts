import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BLOG = 'https://rinhye05.tistory.com'
const ALLOW_ORIGIN = 'https://rinhye05.github.io'
const HEADERS = { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Vary': 'Origin', 'Cache-Control': 'no-store' }

function extractArticle(html: string) {
  const opening = /<div\b[^>]*class="[^"]*contents_style[^"]*"[^>]*>/i.exec(html)
  if (!opening || opening.index === undefined) return ''
  const start = opening.index + opening[0].length
  let depth = 1
  for (const tag of html.slice(start).matchAll(/<\/?div\b[^>]*>/gi)) {
    depth += tag[0].startsWith('</') ? -1 : 1
    if (depth === 0) return html.slice(start, start + (tag.index ?? 0))
  }
  return ''
}

function cleanArticle(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\s+(?:src|href)\s*=\s*(["'])javascript:[\s\S]*?\1/gi, '')
    .replace(/(\s(?:src|href)=")\/(?!\/)/gi, `$1${BLOG}/`)
    .replace(/(\s(?:src|href)=")\/\//gi, '$1https://')
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^\d{1,8}$/.test(id)) return NextResponse.json({ error: '잘못된 글 번호입니다.' }, { status: 400, headers: HEADERS })

  try {
    const sitemapResponse = await fetch(`${BLOG}/sitemap.xml`, { cache: 'no-store' })
    if (!sitemapResponse.ok) throw new Error('공개글 목록을 확인할 수 없습니다.')
    const sitemap = await sitemapResponse.text()
    const publicUrl = `${BLOG}/${id}`
    if (!sitemap.includes(publicUrl + '</loc>')) {
      return NextResponse.json({ error: '보호글 본문은 이 블로그에 표시하지 않습니다.' }, { status: 403, headers: HEADERS })
    }

    const response = await fetch(publicUrl, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CedraiBlog/1.0)' },
    })
    if (!response.ok) throw new Error(`Tistory post ${id}: ${response.status}`)
    const html = await response.text()
    const article = extractArticle(html)
    if (!article) throw new Error('글 본문을 찾을 수 없습니다.')
    const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/ :: (?:Cédrai|C&eacute;drai)$/, '') ?? ''
    return NextResponse.json({ title, content: `<div class="tistory-content">${cleanArticle(article)}</div>`, sourceUrl: publicUrl }, { headers: HEADERS })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '글을 읽을 수 없습니다.' }, { status: 502, headers: HEADERS })
  }
}
