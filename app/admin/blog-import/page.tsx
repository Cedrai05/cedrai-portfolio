'use client'
import { useState } from 'react'
import { upload } from '@vercel/blob/client'
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
      let cursor = 0
      done = files.filter(file => completed.has(`${file.name}:${file.size}`)).length
      const pending = files.filter(file => !completed.has(`${file.name}:${file.size}`))
      async function worker() {
        while (cursor < pending.length) {
          const file = pending[cursor++]
          const kind = /^tistory-[1-9][0-9]*\.json$/.test(file.name) ? 'posts' : /^[a-f0-9]{64}\.[a-z0-9]{1,10}$/.test(file.name) ? 'assets' : null
          if (!kind) throw new Error(`지원하지 않는 파일: ${file.name}`)
          await upload(`blog-native/v1/${kind}/${file.name}`, file, { access: 'private', handleUploadUrl: '/api/native-blog/upload', multipart: file.size > 4 * 1024 * 1024 })
          completed.add(`${file.name}:${file.size}`)
          sessionStorage.setItem('native-blog-import-completed', JSON.stringify([...completed]))
          setStatus(`${++done}/${files.length} 완료`)
        }
      }
      const results = await Promise.allSettled(Array.from({ length: Math.min(6, pending.length) }, worker))
      const failure = results.find(result => result.status === 'rejected')
      if (failure?.status === 'rejected') throw failure.reason
      const response = await fetch('/api/native-blog/import-status', { cache: 'no-store' })
      const stored = await response.json()
      if (!response.ok) throw new Error('저장 결과 확인 실패')
      setStatus(`${done}/${files.length} 완료 · 저장 확인: 글 ${stored.posts.length}개, 첨부파일 ${stored.assets.length}개`)

    } catch (error) { setStatus(`${done}/${files.length} · ${(error as Error).message}`) }
    finally { setBusy(false) }
  }
  return <><main style={{ padding: '120px 30px', maxWidth: 900, margin: 'auto' }}>
    <h1>블로그 글 이관</h1>
    <p>기존 글과 첨부파일을 비공개 저장소로 옮기는 이관 도구입니다.</p>
    {!ready ? <p>로그인 확인 중…</p> : !isAdmin ? <p>상단 LOGIN에서 관리자 로그인을 해 주세요.</p> : <>
      <label>이관 파일 선택 <input type="file" multiple disabled={busy} onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
      <p>{files.length}개 선택</p><button disabled={busy || !files.length} onClick={run}>{busy ? '이관 중…' : '비공개 저장소로 이관'}</button>
    </>}
    <p role="status" aria-live="polite">{status}</p>
  </main></>
}
