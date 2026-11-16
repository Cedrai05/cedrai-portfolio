'use client'

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth-context'
import './files.css'

export default function FilesPage() {
  const { isAdmin } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file || uploading) return
    setError('')
    setLink('')
    setCopied(false)
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/files', { method: 'POST', body })
      if (!response.ok) throw new Error((await response.text()).trim() || `업로드 실패 (${response.status})`)
      const result = await response.json() as { url: string }
      setLink(result.url)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return <main className="files-page">
    <div className="files-page__eyebrow">CÉDRAI / GO FILE SHARE</div>
    <h1>파일 공유 실습</h1>
    <p className="files-page__lead">Go로 만든 업로드 API입니다. 웹 화면과 <code>curl</code>이 같은 서버 기능을 사용합니다.</p>
    <div className="files-page__grid">
      <section className="files-page__card">
        <h2>UPLOAD <span>01</span></h2>
        {isAdmin ? <form onSubmit={submit}>
          <label htmlFor="share-file">공유할 파일</label>
          <input id="share-file" type="file" accept=".png,.jpg,.jpeg,.pdf" required onChange={event => setFile(event.target.files?.[0] ?? null)} />
          <p>PNG · JPEG · PDF / 최대 3 MiB</p>
          <button type="submit" disabled={!file || uploading}>{uploading ? '업로드 중…' : '공유 링크 만들기 ↗'}</button>
        </form> : <div className="files-page__login">
          <p>업로드는 관리자 로그인 후 사용할 수 있습니다. 공유 링크를 받은 사람은 로그인 없이 다운로드할 수 있습니다.</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event('cedrai:open-login'))}>관리자 로그인 ↗</button>
        </div>}
        {error && <p className="files-page__error" role="alert">{error}</p>}
        {link && <div className="files-page__result" role="status">
          <strong>공유 링크</strong>
          <a href={link}>{link}</a>
          <button type="button" onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true) }}>{copied ? '복사됨 ✓' : '링크 복사'}</button>
        </div>}
      </section>
      <section className="files-page__card">
        <h2>CURL <span>02</span></h2>
        <p>터미널에서도 같은 API로 업로드할 수 있습니다. 관리자 계정을 HTTP Basic 인증으로 전달합니다.</p>
        <pre><code>{`curl -u '관리자ID' \\\n  -F 'file=@example.png' \\\n  https://www.cedrai.info/api/files`}</code></pre>
        <p>응답 JSON의 <code>url</code>을 복사해 다운로드합니다.</p>
        <pre><code>{`curl -L -o downloaded.png \\\n  '공유_URL'`}</code></pre>
      </section>
    </div>
    <p className="files-page__note">공유 주소는 파일을 열 수 있는 열쇠입니다. 주소가 공개되면 누구나 다운로드할 수 있습니다.</p>
  </main>
}
