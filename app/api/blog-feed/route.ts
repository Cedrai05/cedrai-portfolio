import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BLOG = 'https://rinhye05.tistory.com'
const ALLOW_ORIGIN = 'https://cedrai05.github.io'
const CATEGORY_BY_ID: Record<string, string> = {}

for (const [category, ids] of Object.entries({
  'CTF/Wargame': [123,116,115,113,111,110,109,108,107,105,103,101,99,98,97,96,95,93,92,88,86,85,84,82,81,80,77,62,61,53,43,37,31,30,25,24,23,22,21,20,19,16,15,14,13,12,5,3,2,1],
  // Personal study notes are technical documents, including security theory,
  // course exercises, Linux, and university coursework.
  '블로그/기술문서': [122,121,120,119,118,117,114,112,106,104,102,100,94,91,90,89,87,83,79,78,76,75,74,73,72,71,70,69,68,66,65,64,63,60,59,58,57,56,55,54,52,51,50,49,48,47,46,45,44,42,41,40,39,38,36,35,34,33,32,29,27,26,17,11,10,9,8,7,6,4],
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
  if (/\[\s*dreamhack\s*\]|\bctf\b|wargame|워게임|\bbtlo\b|핵테온/i.test(title)) return 'CTF/Wargame'
  if (/논문|학회|컨퍼런스|conference|paper/i.test(title)) return '논문/컨퍼런스'
  if (/공모전|자격증|경진대회/i.test(title)) return '공모전/자격증'
  // Require explicit activity labels. A vulnerability name or programming
  // topic alone does not imply bounty work or a development project.
  if (/bug\s*[-_]?\s*bounty|bugbbounty|버그\s*바운티/i.test(title)) return 'BugbBounty'
  if (/\[\s*개발\s*\]|\[\s*development\s*\]|프로젝트\s*개발|개발\s*(회고|일지)/i.test(title)) return '개발'
  return '블로그/기술문서'
}

function classifySource(path: string) {
  const parts = decodeURIComponent(path).toLowerCase().split('/').filter(Boolean).slice(1)
  // Honor explicit destination categories; broad study categories such as
  // Secure/Web-Hacking, seKU, Major, and Linux are not activity evidence.
  if (parts.some((part) => /^(개인공부|블로그|기술문서)$/.test(part))) return '블로그/기술문서'
  if (parts.some((part) => /^(bug\s*[-_]?\s*bounty|bugbbounty|버그\s*바운티)$/.test(part))) return 'BugbBounty'
  if (parts.some((part) => /^(개발|development|프로젝트)$/.test(part))) return '개발'
  if (parts.some((part) => /^(공모전|자격증)$/.test(part))) return '공모전/자격증'
  if (/^(dreamhack|ctf|btlo)$/.test(parts[0] ?? '')) return 'CTF/Wargame'
  if (parts.some((part) => /^(논문|컨퍼런스|conference|papers?)$/.test(part))) return '논문/컨퍼런스'
  return undefined
}

function sourceCategories(html: string) {
  const found = new Map<string, { path: string; count: number; category: string }>()
  for (const hit of html.matchAll(/href="(\/category\/[^"?#]+)"[^>]*>([\s\S]{0,300}?)<\/a>/g)) {
    const path = hit[1]
    const count = Number(decode(hit[2]).match(/\((\d+)\)/)?.[1] ?? 0)
    const category = classifySource(path)
    if (count < 1 || count > 1000 || !category) continue
    found.set(path, { path, count, category })
  }
  const categories = [...found.values()]
  // A parent page already includes its child categories. Read it once,
  // including every page, so moves of older posts are reflected as well.
  return categories.filter((item) => !categories.some((parent) =>
    decodeURIComponent(item.path).startsWith(`${decodeURIComponent(parent.path)}/`) && item.category === parent.category
  ))
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
    const categoryPages = await Promise.all(sourceCategories(firstPage).map(async (source) => {
      const pages = await Promise.all(Array.from({ length: Math.ceil(source.count / 10) },
        (_, index) => getPage(index + 1, source.path)))
      return { category: source.category, posts: pages.flatMap(parsePosts) }
    }))
    const mapped = new Map<string, string>()
    for (const page of categoryPages) {
      for (const post of page.posts) {
        mapped.set(post.slug, page.category)
      }
    }
    for (const post of unique) post.category = mapped.get(post.slug) ?? post.category
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
