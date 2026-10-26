import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BLOG = 'https://rinhye05.tistory.com'
const ALLOW_ORIGIN = 'https://rinhye05.github.io'
const CATEGORY_BY_ID: Record<string, string> = {}

for (const [category, ids] of Object.entries({
  'CTF/Wargame': [123,116,115,113,111,110,109,108,107,105,103,101,99,98,97,96,95,93,92,88,86,85,84,82,81,80,77,62,61,53,43,37,31,30,25,24,23,22,21,20,19,16,15,14,13,12,5,3,2,1],
  'BugbBounty': [122,121,120,119,118,117,114,112,106,104,94,83,33,32,11,10,9,8],
  '블로그/기술문서': [102,100,91,90,89,87,79,78,76,75,74,73,59,58,54,52,51,48,47,46,45,44,42,41,40,39,38,36,35,34,29,27,26,17,7,6,4],
  '개발': [72,71,70,69,68,66,65,64,63,60,57,56,55,50,49],
  '논문/컨퍼런스': [28],
})) {
  for (const id of ids) CATEGORY_BY_ID[String(id)] = category
}

function decode(value: string) {
  return value.replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, ' ').trim()
}

function classify(id: string, title: string) {
  if (CATEGORY_BY_ID[id]) return CATEGORY_BY_ID[id]
  if (/dreamhack|\bctf\b|btlo|핵테온/i.test(title)) return 'CTF/Wargame'
  if (/논문|학회|컨퍼런스|conference|paper/i.test(title)) return '논문/컨퍼런스'
  if (/공모전|자격증|경진대회/i.test(title)) return '공모전/자격증'
  if (/리눅스|linux|자료구조|알고리즘|개발/i.test(title)) return '개발'
  if (/injection|xss|ssrf|csrf|취약점|웹해킹|web.hacking/i.test(title)) return 'BugbBounty'
  return '블로그/기술문서'
}

function classifySource(path: string) {
  const source = decodeURIComponent(path).toLowerCase()
  if (/\/category\/(dreamhack|ctf|btlo)(\/|$)/.test(source)) return 'CTF/Wargame'
  if (source.includes('/secure/web-hacking') || source.includes('/seku/')) return 'BugbBounty'
  if (source.includes('/major/') || source.includes('/secure/linux')) return '개발'
  if (source.includes('/secure/논문')) return '논문/컨퍼런스'
  return '블로그/기술문서'
}

function subcategories(html: string) {
  const found = new Set<string>()
  for (const hit of html.matchAll(/href="(\/category\/[^"?#]+)"[^>]*>([\s\S]{0,300}?)<\/a>/g)) {
    const path = hit[1]
    const count = Number(decode(hit[2]).match(/\((\d+)\)/)?.[1] ?? 0)
    if (count < 1) continue
    const levels = decodeURIComponent(path).split('/').filter(Boolean)
    if (levels.length >= 3 || levels[1] === 'BTLO') found.add(path)
  }
  return [...found]
}

type Post = {
  slug: string
  title: string
  category: string
  date: string
  readTime: string
  summary: string
  tags: string[]
  sourceUrl: string
  protected: boolean
}

function parsePosts(html: string): Post[] {
  const anchors = [...html.matchAll(/href="\/(\d+)"/g)]
  const posts: Post[] = []
  const seen = new Set<string>()

  for (let i = 0; i < anchors.length; i++) {
    const id = anchors[i][1]
    if (seen.has(id)) continue
    const start = anchors[i].index ?? 0
    const end = anchors[i + 1]?.index ?? html.length
    const block = html.slice(start, end)
    const titleHtml = block.match(/data-title="article-title"[^>]*>([\s\S]*?)<\/div>/)?.[1]
    if (!titleHtml) continue
    const title = decode(titleHtml)
    if (!title) continue
    seen.add(id)

    const date = block.match(/thisDatetime\s*=\s*["'](\d{4}-\d{2}-\d{2})/)?.[1] ?? ''
    const protectedPost = /data-status="보호"|보호글/.test(block)
    const sourceUrl = `${BLOG}/${id}`
    posts.push({
      slug: `tistory-${id}`,
      title,
      category: classify(id, title),
      date,
      readTime: protectedPost ? 'PROTECTED' : 'TISTORY LOG',
      summary: protectedPost ? '보호글 · 원문은 티스토리에서 확인하세요.' : '',
      tags: [],
      sourceUrl,
      protected: protectedPost,
    })
  }

  return posts
}

async function getPage(page: number, categoryPath = '/') {
  const url = `${BLOG}${categoryPath}${page === 1 ? '' : `?page=${page}`}`
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CedraiBlog/1.0)' },
  })
  if (!response.ok) throw new Error(`Tistory page ${page}: ${response.status}`)
  return response.text()
}

export async function GET() {
  try {
    const firstPage = await getPage(1)
    const count = Number(firstPage.match(/href="\/category"[^>]*>[\s\S]{0,150}?\((\d+)\)/)?.[1] ?? 0)
    if (count < 1 || count > 1000) throw new Error('글 수를 확인할 수 없습니다.')
    const pageCount = Math.ceil(count / 10)
    const pages = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => getPage(index + 2)))
    const posts = [firstPage, ...pages].flatMap(parsePosts)
    const unique = [...new Map(posts.map((post) => [post.slug, post])).values()]
    if (unique.length < count) throw new Error(`Expected ${count} posts, got ${unique.length}`)
    const unknown = new Set(unique.filter((post) => !CATEGORY_BY_ID[post.slug.slice(8)]).map((post) => post.slug))
    if (unknown.size) {
      const categoryPages = await Promise.all(subcategories(firstPage).map(async (path) => {
        try { return { path, posts: parsePosts(await getPage(1, path)) } }
        catch { return { path, posts: [] as Post[] } }
      }))
      const mapped = new Map<string, string>()
      for (const page of categoryPages) {
        for (const post of page.posts) {
          if (unknown.has(post.slug)) mapped.set(post.slug, classifySource(page.path))
        }
      }
      for (const post of unique) post.category = mapped.get(post.slug) ?? post.category
    }
    return NextResponse.json({ posts: unique, total: unique.length }, {
      headers: { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Vary': 'Origin', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '티스토리 목록을 읽을 수 없습니다.' }, {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, 'Vary': 'Origin', 'Cache-Control': 'no-store' },
    })
  }
}
