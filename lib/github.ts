// 서버 전용 — GitHub Contents API로 data/projects.json 을 읽고 커밋합니다.

const API = process.env.GITHUB_API_BASE || 'https://api.github.com'

function config() {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO           // 'owner/repo'
  if (!token || !repo) return null
  return {
    token,
    repo,
    branch: process.env.GITHUB_BRANCH || 'main',
  }
}

export const isGithubConfigured = () => config() !== null

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'cedrai-portfolio',
  }
}

export type FileState = { content: string; sha: string }

/** 파일의 현재 내용과 sha를 가져옵니다. 없으면 sha가 빈 문자열. */
export async function readFile(path: string): Promise<FileState> {
  const c = config()
  if (!c) throw new Error('GitHub 환경변수가 설정되지 않았습니다.')

  const url = `${API}/repos/${c.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(c.branch)}`
  const res = await fetch(url, { headers: headers(c.token), cache: 'no-store' })

  if (res.status === 404) return { content: '', sha: '' }
  if (!res.ok) throw new Error(`GitHub 읽기 실패 (${res.status}): ${await res.text()}`)

  const data = await res.json()
  let content = data.content ? Buffer.from(data.content, 'base64').toString('utf8') : ''
  if (!content && data.size > 0 && data.sha) {
    const blob = await fetch(`${API}/repos/${c.repo}/git/blobs/${encodeURIComponent(data.sha)}`, { headers: headers(c.token), cache: 'no-store' })
    if (!blob.ok) throw new Error(`GitHub 파일 본문 읽기 실패 (${blob.status})`)
    const detail = await blob.json()
    if (detail.encoding !== 'base64' || typeof detail.content !== 'string') throw new Error('GitHub 파일 형식이 올바르지 않습니다.')
    content = Buffer.from(detail.content, 'base64').toString('utf8')
  }
  return {
    content,
    sha: data.sha ?? '',
  }
}

export async function listFiles(directory: string): Promise<string[]> {
  const c = config()
  if (!c) throw new Error('GitHub 환경변수가 설정되지 않았습니다.')
  const url = `${API}/repos/${c.repo}/contents/${encodeURI(directory.replace(/\/$/,''))}?ref=${encodeURIComponent(c.branch)}`
  const res = await fetch(url, { headers: headers(c.token), cache: 'no-store' })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`GitHub 파일 목록 읽기 실패 (${res.status})`)
  const entries = await res.json()
  if (!Array.isArray(entries)) throw new Error('GitHub 파일 목록 형식이 올바르지 않습니다.')
  return entries.filter((entry: { type?:string; name?:string }) => entry.type === 'file' && typeof entry.name === 'string').map((entry: { name:string }) => entry.name)
}

/**
 * 파일을 커밋합니다. sha가 현재 파일과 다르면 GitHub이 409를 돌려주므로
 * 다른 곳에서 먼저 수정한 내용을 덮어쓰는 사고를 막아줍니다.
 */
export async function writeFile(path: string, content: string, sha: string, message: string) {
  const c = config()
  if (!c) throw new Error('GitHub 환경변수가 설정되지 않았습니다.')

  const url = `${API}/repos/${c.repo}/contents/${encodeURI(path)}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...headers(c.token), 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch: c.branch,
      ...(sha ? { sha } : {}),
    }),
  })

  if (res.status === 409 || res.status === 422) {
    throw Object.assign(new Error('파일이 그 사이에 바뀌었어요. 새로고침 후 다시 저장해주세요.'), { status: 409 })
  }
  if (!res.ok) throw new Error(`GitHub 커밋 실패 (${res.status}): ${await res.text()}`)

  const data = await res.json()
  return { sha: data.content?.sha as string, commit: data.commit?.html_url as string }
}
