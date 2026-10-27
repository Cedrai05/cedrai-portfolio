import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BLOG = 'https://rinhye05.tistory.com'
const ALLOW_ORIGIN = 'https://cedrai05.github.io'

function decode(value: string) {
  return value.replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&#x([\da-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, ' ').trim()
}

function categoryParts(path: string) {
  return path.split('/').filter(Boolean).slice(1).map((part) => decodeURIComponent(part))
}

function classifySource(path: string) {
  const parts = categoryParts(path).map((part) => part.toLowerCase())
  // Honor explicit destination categories; broad study categories such as
  // Secure/Web-Hacking, seKU, Major, and Linux are not activity evidence.
  if (parts.some((part) => /^(개인공부|블로그|기술문서)$/.test(part))) return '블로그/기술문서'
  if (parts.some((part) => /^(bug\s*[-_]?\s*bounty|bugbbounty|버그\s*바운티)$/.test(part))) return 'Bug Bounty'
  if (parts.some((part) => /^(개발|development|프로젝트)$/.test(part))) return '개발'
  if (parts.some((part) => /^(공모전|자격증)$/.test(part))) return '공모전/자격증'
  if (/^(dreamhack|ctf|btlo)$/.test(parts[0] ?? '')) return 'CTF/Wargame'
  if (parts.some((part) => /^(논문|컨퍼런스|conference|papers?)$/.test(part))) return '논문/컨퍼런스'
  return undefined
}

function sourceCategories(html: string) {
  const found = new Map<string, { path: string; count: number; category: string; parts: string[] }>()
  for (const hit of html.matchAll(/href="(\/category\/[^"?#]+)"[^>]*>([\s\S]{0,300}?)<\/a>/g)) {
    const path = hit[1]
    const count = Number(decode(hit[2]).match(/\((\d+)\)/)?.[1] ?? 0)
    if (count < 0 || count > 1000) continue
    const parts = categoryParts(path)
    found.set(parts.join(' / '), { path, count, parts, category: classifySource(path) ?? '블로그/기술문서' })
  }
  const categories = [...found.values()]
  // Read children to preserve the original category of each post. A parent
  // page is only needed when it also has posts outside its direct children.
  return categories.filter((item) => {
    const children = categories.filter((child) => child.parts.length === item.parts.length + 1 &&
      item.parts.every((part, index) => child.parts[index] === part))
    return item.count > children.reduce((sum, child) => sum + child.count, 0)
  })
}

type Post = {
  slug: string
  title: string
  category: string
  sourceCategory: string
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
      category: '블로그/기술문서',
      sourceCategory: '',
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
      return { source, posts: pages.flatMap(parsePosts) }
    }))
    const mapped = new Map<string, (typeof categoryPages)[number]['source']>()
    for (const page of categoryPages) {
      for (const post of page.posts) {
        const current = mapped.get(post.slug)
        if (!current || page.source.parts.length > current.parts.length) mapped.set(post.slug, page.source)
      }
    }
    for (const post of unique) {
      const source = mapped.get(post.slug)
      if (source) {
        post.category = source.category
        post.sourceCategory = source.parts.join(' / ')
      }
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
