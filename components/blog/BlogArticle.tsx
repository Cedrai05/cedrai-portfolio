'use client'
import Link from 'next/link'
import { useEffect,useRef,useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { dateText,prepareBlogContent,type BlogPost } from '@/lib/blog-catalog'
type Article={content:string;assets:string[]}
export default function BlogArticle({post,initialContent}:{post:BlogPost;initialContent:string|null}) {
  const {ready,isAdmin,isMember}=useAuth()
  const allowed=!post.protected||isAdmin||isMember
  const [article,setArticle]=useState<Article|null>(initialContent?{content:initialContent,assets:[]}:null)
  const [status,setStatus]=useState('')
  const [retry,setRetry]=useState(0)
  const body=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    if(!allowed){setArticle(null);setStatus('');return}
    if(!ready||initialContent)return
    const controller=new AbortController()
    setStatus('본문을 불러오는 중…')
    fetch(`/api/native-blog/posts/${encodeURIComponent(post.slug)}`,{cache:'no-store',signal:controller.signal}).then(async response=>{
      const data=await response.json()
      if(!response.ok)throw new Error(data.error||'본문을 불러오지 못했습니다.')
      if(typeof data.content!=='string'||!Array.isArray(data.assets))throw new Error('본문을 불러오지 못했습니다.')
      setArticle({content:prepareBlogContent(data.content),assets:data.assets});setStatus('')
    }).catch(error=>{if(!controller.signal.aborted)setStatus(error.message)})
    return()=>controller.abort()
  },[allowed,ready,post.slug,initialContent,retry])
  useEffect(()=>{
    if(!article||!allowed||!body.current)return
    const controller=new AbortController(),urls=new Set<string>()
    const nodes=[...body.current.querySelectorAll<HTMLElement>('[data-native-src],[data-native-href]')]
    const names=[...new Set(nodes.map(node=>node.dataset.nativeSrc||node.dataset.nativeHref!))]
    let cursor=0,failed=0
    async function worker(){
      while(cursor<names.length&&!controller.signal.aborted){
        const name=names[cursor++]
        try{
          if(!article!.assets.includes(name))throw new Error('Unknown asset')
          const response=await fetch(`/api/native-blog/assets?${new URLSearchParams({slug:post.slug,name})}`,{cache:'no-store',signal:controller.signal,referrerPolicy:'no-referrer'})
          if(!response.ok)throw new Error('Asset unavailable')
          const blob=await response.blob();if(controller.signal.aborted)return
          const url=URL.createObjectURL(blob);urls.add(url)
          for(const node of nodes){if(node.dataset.nativeSrc===name)node.setAttribute('src',url);if(node.dataset.nativeHref===name)node.setAttribute('href',url)}
        }catch{if(!controller.signal.aborted)failed++}
      }
    }
    Promise.all(Array.from({length:Math.min(6,names.length)},worker)).then(()=>{if(failed&&!controller.signal.aborted)setStatus('일부 첨부파일을 불러오지 못했습니다. 다시 열기를 눌러 주세요.')})
    return()=>{controller.abort();for(const url of urls)URL.revokeObjectURL(url)}
  },[article,allowed,post.slug])
  const visible=allowed?article:null
  return <article id="article-view" className="article-view">
    <Link className="article-back" href="/blog#archive" scroll={false}>← BACK TO ARCHIVE</Link><div className="article-category">↳ {post.category.toUpperCase()}</div><h1>{post.title}</h1>
    <div className="article-meta"><span>{dateText(post.date)}</span><span>{post.protected?'MEMBERS ONLY':post.readTime}</span></div>
    {visible?<div ref={body} className="article-body" dangerouslySetInnerHTML={{__html:visible.content}}/>:post.protected&&!ready?<p className="article-summary">로그인 확인 중…</p>:!allowed?<div className="protected-form"><h2>로그인이 필요한 비밀글입니다.</h2><p>로그인한 사용자만 읽을 수 있습니다.</p><button type="button" onClick={()=>window.dispatchEvent(new Event('cedrai:open-login'))}>로그인</button></div>:null}
    {allowed&&status&&<p className="article-summary" role="status">{status}{!status.includes('불러오는 중')&&<button type="button" className="blog-retry" onClick={()=>{setArticle(null);setRetry(value=>value+1)}}>다시 열기</button>}</p>}
    <div className="article-footer"><Link href="/blog#archive" scroll={false}>← ALL ENTRIES</Link></div>
  </article>
}
