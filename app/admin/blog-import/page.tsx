'use client'
import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'

export default function BlogImport() {
  const { ready, isAdmin } = useAuth()
  const [files, setFiles] = useState<File[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  async function run() {
    setBusy(true)
    let done = 0
    try {
      const completed = new Set<string>(JSON.parse(sessionStorage.getItem('native-blog-import-completed') || '[]'))
      done = files.filter(file => completed.has(`${file.name}:${file.size}`)).length
      const pending = files.filter(file => !completed.has(`${file.name}:${file.size}`))
      for (const file of pending) {
        const form = new FormData()
        form.append('file', file)
        const response = await fetch('/api/native-blog/upload', { method: 'POST', body: form })
        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          throw new Error(`${file.name}: ${result.error || '업로드 실패'}`)
        }
        completed.add(`${file.name}:${file.size}`)
        sessionStorage.setItem('native-blog-import-completed', JSON.stringify([...completed]))
        setStatus(`${++done}/${files.length} 완료`)
      }
      const response = await fetch('/api/native-blog/import-status', { cache: 'no-store' })
      const stored = await response.json()
      if (!response.ok) throw new Error('저장 결과 확인 실패')
      setStatus(`${done}/${files.length} 완료 · 저장 확인: 글 ${stored.posts.length}개, 첨부파일 ${stored.assets.length}개`)

    } catch (error) { setStatus(`${done}/${files.length} · ${(error as Error).message}`) }
    finally { setBusy(false) }
  }
  return <><main style={{ padding: '120px 30px', maxWidth: 900, margin: 'auto' }}>
    <h1>블로그 글 이관</h1>
    <p>기존 글과 첨부파일을 암호화된 GitHub 저장소로 옮기는 이관 도구입니다. 파일 하나당 4MB까지 업로드할 수 있습니다.</p>
    {!ready ? <p>로그인 확인 중…</p> : !isAdmin ? <p>상단 LOGIN에서 관리자 로그인을 해 주세요.</p> : <>
      <label>이관 파일 선택 <input type="file" multiple disabled={busy} onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
      <p>{files.length}개 선택</p><button disabled={busy || !files.length} onClick={run}>{busy ? '이관 중…' : '비공개 저장소로 이관'}</button>
    </>}
    <p role="status" aria-live="polite">{status}</p>
  </main></>
}
