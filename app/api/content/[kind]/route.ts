import { NextResponse, type NextRequest } from 'next/server'
import { readToken, SESSION_COOKIE } from '@/lib/session'
import { isGithubConfigured, readFile, writeFile } from '@/lib/github'
import { CONTENT, isContentKind } from '@/lib/content'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ kind: string }> }

function requireAdmin(request: NextRequest) {
  if (!process.env.ADMIN_SESSION_SECRET || !process.env.ADMIN_ID) return null
  const id = readToken(request.cookies.get(SESSION_COOKIE)?.value)
  return id === process.env.ADMIN_ID ? id : null
}

/** 인증 · 종류 · GitHub 설정을 한 번에 확인합니다. */
function guard(request: NextRequest, kind: string, requireAuth = false) {
  if (!isContentKind(kind)) {
    return { error: NextResponse.json({ error: '알 수 없는 콘텐츠 종류예요.' }, { status: 404 }) }
  }
  if (requireAuth) {
    const adminId = requireAdmin(request)
    if (!adminId) {
      return { error: NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 }) }
    }
    if (!isGithubConfigured()) {
      return { error: NextResponse.json({ error: 'GITHUB_TOKEN / GITHUB_REPO 환경변수가 설정되지 않았어요.' }, { status: 503 }) }
    }
    return { adminId, def: CONTENT[kind] }
  }
  return { def: CONTENT[kind] }
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { kind } = await params
  const g = guard(request, kind)
  if (g.error) return g.error

  if (!isGithubConfigured()) {
    return NextResponse.json({ items: g.def.fallback, sha: '' })
  }

  try {
    const { content, sha } = await readFile(g.def.path)
    // 레포에 파일이 아직 없으면 번들된 내용을 보여줍니다. 그래야 첫 저장 때
    // 기존 항목이 빈 배열로 덮어써지지 않아요.
    const items = content ? g.def.sanitize(JSON.parse(content)) : g.def.fallback
    return NextResponse.json({ items, sha })
  } catch (e) {
    return NextResponse.json({ items: g.def.fallback, sha: '' })
  }
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { kind } = await params
  const g = guard(request, kind, true)
  if (g.error) return g.error

  let items: unknown
  let sha: string
  try {
    const body = await request.json()
    items = g.def.sanitize(body?.items)
    sha = typeof body?.sha === 'string' ? body.sha : ''
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  try {
    const json = JSON.stringify(items, null, 2) + '\n'
    const result = await writeFile(g.def.path, json, sha, `chore: update ${g.def.label} (by ${g.adminId})`)
    return NextResponse.json({ items, sha: result.sha, commit: result.commit })
  } catch (e) {
    const status = (e as { status?: number }).status ?? 502
    return NextResponse.json({ error: (e as Error).message }, { status })
  }
}
