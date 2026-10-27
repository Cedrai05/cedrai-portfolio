'use client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { dateText, prepareBlogContent, type BlogPost } from '@/lib/blog-catalog'

type Unlock = { content: string; assets: string[]; ticket: string }
export default function BlogArticle({ post, initialContent }: { post: BlogPost; initialContent: string | null }) {
  const [content, setContent] = useState(initialContent)
  const [unlocked, setUnlocked] = useState<Unlock | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const password = useRef<HTMLInputElement>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  useEffect(() => {
    if (!unlocked || !body.current) return
    const controller = new AbortController()
    const urls = new Set<string>()
    const nodes = [...body.current.querySelectorAll<HTMLElement>('[data-native-src], [data-native-href]')]
    const names = [...new Set(nodes.map(node => node.dataset.nativeSrc || node.dataset.nativeHref!))]
    let cursor = 0, failed = 0
    async function worker() {
      while (cursor < names.length && !controller.signal.aborted) {
        const name = names[cursor++]
        try {
          if (!unlocked!.assets.includes(name)) throw new Error('Unknown asset')
          const response = await fetch(`/api/native-blog/assets?${new URLSearchParams({slug:post.slug,name})}`,{ headers:{Authorization:`Bearer ${unlocked!.ticket}`},cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal })
          if (!response.ok) throw new Error('Asset unavailable')
          const blob = await response.blob()
          if (controller.signal.aborted) return
          const url = URL.createObjectURL(blob)
          urls.add(url)
          for (const node of nodes) {
            if (node.dataset.nativeSrc === name) node.setAttribute('src',url)
            if (node.dataset.nativeHref === name) node.setAttribute('href',url)
          }
        } catch { if (!controller.signal.aborted) failed++ }
      }
    }
    Promise.all(Array.from({length:Math.min(6,names.length)},worker)).then(() => {
      if (failed && !controller.signal.aborted) setStatus('일부 첨부파일을 불러오지 못했습니다. 새로고침 후 다시 열어 주세요.')
    })
    return () => { controller.abort(); for (const url of urls) URL.revokeObjectURL(url) }
  },[unlocked,post.slug])

  async function unlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !password.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setStatus('비밀번호 확인 중…')
    try {
      const response = await fetch('/api/native-blog/unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:post.slug,password:password.current.value}),cache:'no-store',signal:controller.signal})
      password.current.value = ''
      const data = await response.json()
      if (!response.ok || typeof data.content !== 'string' || !Array.isArray(data.assets)) throw new Error(data.error || '글을 열지 못했습니다.')
      setStatus(''); setContent(prepareBlogContent(data.content)); setUnlocked(data)
    } catch (error) {
      if (!controller.signal.aborted) { setStatus((error as Error).message || '연결하지 못했습니다. 다시 시도해 주세요.'); password.current?.focus() }
    } finally { if (!controller.signal.aborted) setBusy(false) }
  }
  return <article id="article-view" className="article-view">
    <a className="article-back" href="/blog#archive">← BACK TO ARCHIVE</a>
    <div className="article-category">↳ {post.category.toUpperCase()}</div><h1>{post.title}</h1>
    <div className="article-meta"><span>{dateText(post.date)}</span><span>{post.readTime}</span></div>
    {content ? <><div ref={body} className="article-body" dangerouslySetInnerHTML={{__html:content}} />{status && <p className="article-summary" role="status">{status}</p>}</> : post.protected ? <form className="protected-form" onSubmit={unlock}>
      <p>비밀번호가 설정된 글입니다.</p><label htmlFor="post-password">글 비밀번호</label>
      <div className="protected-form__controls"><input ref={password} id="post-password" type="password" maxLength={256} autoComplete="off" required /><button type="submit" disabled={busy}>글 열기 →</button></div><p role="status" aria-live="polite">{status}</p>
    </form> : <p className="article-summary">본문을 불러오지 못했습니다. 새로고침해 다시 시도해 주세요.</p>}
    <div className="article-footer"><a href="/blog#archive">← ALL ENTRIES</a></div>
  </article>
}
