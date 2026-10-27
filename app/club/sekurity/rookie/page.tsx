'use client'

import { useEffect, useState } from 'react'
import { upload as uploadBlob } from '@vercel/blob/client'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { safeFileName } from '@/lib/file-name'

type PrivateFile = { name: string; size: number; uploadedAt: string }

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function RookiePage() {
  const { isAdmin, isMember, ready } = useAuth()
  const canAccess = isAdmin || isMember
  const [files, setFiles] = useState<PrivateFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [storage, setStorage] = useState<'blob' | 'local'>('local')

  const loadFiles = async () => {
    const res = await fetch('/api/club/sekurity/rookie')
    if (res.ok) { const data = await res.json(); setFiles(data.files ?? []); setStorage(data.storage ?? 'local') }
    setLoading(false)
  }

  useEffect(() => { if (ready) loadFiles() }, [ready, canAccess])

  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('file') as HTMLInputElement
    const files = Array.from(input.files ?? [])
    if (files.length === 0) return setMessage('업로드할 파일을 선택해주세요.')
    setUploading(true); setMessage('')
    let data: { uploaded?: string[]; skipped?: string[]; error?: string } = {}
    if (storage === 'blob') {
      try {
        const uploaded: string[] = []
        for (const file of files) { const name = safeFileName(file.name); await uploadBlob(`sekurity-rookie/${name}`, file, { access: 'private', handleUploadUrl: '/api/uploads/client' }); uploaded.push(name) }
        data = { uploaded }
      } catch (error) { data = { error: error instanceof Error ? error.message : '업로드에 실패했어요.' } }
    } else {
      const body = new FormData(); files.forEach((file) => body.append('file', file))
      const res = await fetch('/api/club/sekurity/rookie', { method: 'POST', body })
      data = await res.json().catch(() => ({}))
      if (!res.ok) data.error ??= '업로드에 실패했어요.'
    }
    setUploading(false)
    if (data.error) return setMessage(data.error)
    event.currentTarget.reset()
    const skipped = Array.isArray(data.skipped) && data.skipped.length > 0 ? ` (중복/제외: ${data.skipped.join(', ')})` : ''
    setMessage(`${data.uploaded?.length ?? 0}개 파일을 업로드했어요.${skipped}`); loadFiles()
  }

  const remove = async (name: string) => {
    if (!window.confirm(`'${name}' 파일을 삭제할까요?`)) return
    const res = await fetch(`/api/club/sekurity/rookie/${encodeURIComponent(name)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setMessage(res.ok ? `${name} 파일을 삭제했어요.` : (data.error ?? '삭제에 실패했어요.'))
    if (res.ok) loadFiles()
  }

  return (
    <main className="page-main">

      <section className="private-club-page">
        <div className="private-club-page__head">
          <div className="sec-tag sec-tag-red">seKUrity / 25.03—25.08</div>
          <div className="private-club-page__path">CLUB://SEKURITY/ROOKIE</div>
        </div>
        <h1>Rookie Member Archive<span>.</span></h1>
        <p className="private-club-page__intro">신입부원 시기에 진행했던 활동과 파일을 모아둔 공간입니다.</p>

        {!ready || loading ? <div className="private-files__empty">// 파일 목록을 불러오는 중...</div> : (
          <>
            <div className="private-files__toolbar">
              <div><strong>{files.length}</strong> FILES AVAILABLE</div>
              {isAdmin && <form onSubmit={upload} className="private-files__upload">
                <input name="file" type="file" multiple aria-label="업로드할 파일" />
                <button className="btn-primary" disabled={uploading}>{uploading ? 'UPLOADING...' : 'UPLOAD FILES'}</button>
              </form>}
            </div>
            {message && <div className="private-files__message">{message}</div>}
            {!canAccess && <div className="private-files__notice">파일 목록은 공개되어 있지만, 다운로드하려면 로그인해주세요.</div>}
            <div className="private-files__list">
              {files.length === 0 ? <div className="private-files__empty">// 아직 업로드된 파일이 없습니다.</div> : files.map((file) => (
                canAccess ? (
                  <div key={file.name} className="private-file-row"><a className="private-file" href={`/api/club/sekurity/rookie/${encodeURIComponent(file.name)}`}>
                    <span className="private-file__icon">↘</span>
                    <span className="private-file__name">{file.name}</span>
                    <span className="private-file__meta">{formatSize(file.size)} · {new Date(file.uploadedAt).toLocaleDateString('ko-KR')}</span>
                  </a>{isAdmin && <button className="file-delete" onClick={() => remove(file.name)} aria-label={`${file.name} 삭제`}>×</button>}</div>
                ) : (
                  <div key={file.name} className="private-file private-file--locked">
                    <span className="private-file__icon">⌁</span>
                    <span className="private-file__name">{file.name}</span>
                    <span className="private-file__meta">LOGIN REQUIRED · {formatSize(file.size)}</span>
                  </div>
                )
              ))}
            </div>
          </>
        )}
      </section>
      <Footer />
    </main>
  )
}
