'use client'
import { useState } from 'react'
import Nav from '@/components/Nav'
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
      for (const file of files) {
        const kind = /^tistory-[1-9][0-9]*\.json$/.test(file.name) ? 'posts' : /^[a-f0-9]{64}\.[a-z0-9]{1,10}$/.test(file.name) ? 'assets' : null
        if (!kind) throw new Error(`지원하지 않는 파일: ${file.name}`)
        setStatus(`${done}/${files.length} 이관 중…`)
        await upload(`blog-native/v1/${kind}/${file.name}`, file, { access: 'private', handleUploadUrl: '/api/native-blog/upload', multipart: file.size > 4 * 1024 * 1024 })
        setStatus(`${++done}/${files.length} 완료`)
      }
    } catch (error) { setStatus(`${done}/${files.length} · ${(error as Error).message}`) }
    finally { setBusy(false) }
  }
  return <><Nav /><main style={{ padding: '120px 30px', maxWidth: 900, margin: 'auto' }}>
    <h1>블로그 글 이관</h1>
    <p>기존 글과 첨부파일을 비공개 저장소로 옮기는 이관 도구입니다.</p>
    {!ready ? <p>로그인 확인 중…</p> : !isAdmin ? <p>상단 LOGIN에서 관리자 로그인을 해 주세요.</p> : <>
      <label>이관 파일 선택 <input type="file" multiple disabled={busy} onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
      <p>{files.length}개 선택</p><button disabled={busy || !files.length} onClick={run}>{busy ? '이관 중…' : '비공개 저장소로 이관'}</button>
    </>}
    <p role="status" aria-live="polite">{status}</p>
  </main></>
}
