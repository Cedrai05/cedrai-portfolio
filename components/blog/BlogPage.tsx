'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Nav from '@/components/Nav'
import BlogHero from './BlogHero'
import BlogArticle from './BlogArticle'
import { BLOG_CATEGORIES, BLOG_POSTS, BLOG_TOPICS, dateText, postHref, topicFor, type BlogPost } from '@/lib/blog-catalog'

type Filters = { category: string; topic: string; query: string }
type Snapshot = Filters & { scrollY: number }
const defaults: Filters = { category:'전체',topic:'전체',query:'' }
const archiveKey = 'cedrai-blog-archive'
export default function BlogPage({slug,publicContent}:{slug?:string;publicContent:string|null}) {
  const [filters,setFilters] = useState<Filters>(defaults)
  const [ready,setReady] = useState(false)
  const pending = useRef<Snapshot|null>(null)
  const latest = useRef(filters)
  const search = useRef<HTMLInputElement>(null)
  latest.current = filters
  const post = BLOG_POSTS.find(post => post.slug === slug)
  const saveArchive = useCallback(() => {
    if (slug || pending.current) return
    const snapshot = {...latest.current,scrollY:window.scrollY}
    history.replaceState({...history.state,cedraiArchive:snapshot},'')
    try { sessionStorage.setItem(archiveKey,JSON.stringify(snapshot)) } catch { /* Optional persistence. */ }
  },[slug])
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration='manual'
    if (!slug) {
      try {
        const saved = history.state?.cedraiArchive || (location.hash === '#archive' && JSON.parse(sessionStorage.getItem(archiveKey)||'null'))
        if (saved) {
          const category = ['전체',...BLOG_CATEGORIES].includes(saved.category) ? saved.category : '전체'
          const topic = typeof saved.topic==='string' ? saved.topic : '전체'
          const query = typeof saved.query==='string' ? saved.query : ''
          pending.current={category,topic,query,scrollY:Number.isFinite(saved.scrollY)?Math.max(0,saved.scrollY):0}
          setFilters({category,topic,query})
        }
      } catch { /* Filtering works without storage. */ }
    }
    setReady(true)
    const onPageShow = (event:PageTransitionEvent) => {
      if (!slug && event.persisted) {
        const saved = history.state?.cedraiArchive
        if (saved) requestAnimationFrame(()=>window.scrollTo({top:saved.scrollY,behavior:'instant'}))
      }
    }
    window.addEventListener('pagehide',saveArchive)
    window.addEventListener('pageshow',onPageShow)
    return () => { window.removeEventListener('pagehide',saveArchive); window.removeEventListener('pageshow',onPageShow) }
  },[slug,saveArchive])
  useEffect(() => {
    if (slug || !ready) return
    let active=true
    const saved=pending.current
    if (saved) {
      document.fonts.ready.then(()=>requestAnimationFrame(()=>{
        if (!active || pending.current!==saved) return
        pending.current=null
        window.scrollTo({top:saved.scrollY,behavior:'instant'})
      }))
    } else saveArchive()
    return ()=>{active=false}
  },[filters,ready,slug,saveArchive])
  useEffect(()=>{
    if (slug) return
    function keydown(event:KeyboardEvent) {
      const target = event.target as HTMLElement
      if (event.key==='/' && !target.closest('input,textarea,select,[contenteditable="true"]')) { event.preventDefault(); search.current?.focus() }
      if (event.key==='Escape' && document.activeElement===search.current) search.current?.blur()
    }
    document.addEventListener('keydown',keydown)
    return ()=>document.removeEventListener('keydown',keydown)
  },[slug])
  function update(changes:Partial<Filters>) { pending.current=null; setFilters(current=>({...current,...changes})) }
  const available = BLOG_POSTS.filter(post => filters.category==='전체' || post.category===filters.category)
  const counts = new Map<string,number>()
  for (const post of available) { const topic=topicFor(post); if(topic) counts.set(topic,(counts.get(topic)||0)+1) }
  const configured=BLOG_TOPICS[filters.category]
  const topics=['전체',...(configured || [...new Set(Object.values(BLOG_TOPICS).flat())].filter(topic=>counts.has(topic)))]
  const query=filters.query.trim().toLocaleLowerCase('ko')
  const matches=available.filter(post => (filters.topic==='전체'||topicFor(post)===filters.topic) && (!query || [post.title,post.summary,post.category,topicFor(post),post.sourceCategory,...post.tags].join(' ').toLocaleLowerCase('ko').includes(query))).sort((a:BlogPost,b:BlogPost)=>{
    if(configured) {
      const rank=(post:BlogPost)=>{const index=configured.indexOf(topicFor(post));return index===-1?configured.length:index}
      const difference=rank(a)-rank(b)
      if(difference)return difference
    }
    return b.date.localeCompare(a.date)||b.slug.localeCompare(a.slug,'en',{numeric:true})
  })
  return <div className="blog-page">
    <a className="skip-link" href="#blog-main">본문으로 건너뛰기</a>
    <Nav variant="blog" onBlogNavigate={saveArchive} />
    <main id="blog-main">
      {slug ? post ? <BlogArticle post={post} initialContent={publicContent} /> : <article className="article-view"><a className="article-back" href="/blog#archive">← BACK TO ARCHIVE</a><h1>기록을 찾을 수 없습니다.</h1><p className="article-summary">주소를 확인하거나 아카이브로 돌아가 주세요.</p></article> : <div id="home-view">
        <BlogHero />
        <section className="archive-section" id="archive">
          <div className="section-kicker"><span className="kicker-pill">ARCHIVE</span><span className="kicker-line" /><span>SYS://ALL_ENTRIES</span></div>
          <div className="section-heading"><div><p className="small-label">01 / INDEX</p><h2>Explore the logs<span>.</span></h2><p>관심 분야별로 정리한 생각과 실험의 기록입니다.</p></div><span className="entry-total" id="entry-total">{BLOG_POSTS.length} ENTRIES</span></div>
          <div className="archive-toolbar"><div id="category-filters" className="category-filters" role="group" aria-label="카테고리 필터">{['전체',...BLOG_CATEGORIES].map(category=><button key={category} type="button" aria-pressed={filters.category===category} onClick={()=>update({category,topic:'전체'})}>{category}</button>)}</div><label className="search-box"><span>⌕</span><input ref={search} id="search-input" type="search" placeholder="기록 검색..." aria-label="기록 검색" autoComplete="off" value={filters.query} onChange={event=>update({query:event.target.value})}/><kbd>/</kbd></label></div>
          {(configured||counts.size>0)&&<div className="topic-toolbar" id="topic-toolbar"><span className="topic-label">주제</span><div id="topic-filters" className="topic-filters" role="group" aria-label="주제 필터">{topics.map(topic=><button type="button" key={topic} aria-pressed={filters.topic===topic} onClick={()=>update({topic})}>{topic} <span>{topic==='전체'?available.length:counts.get(topic)||0}</span></button>)}</div></div>}
          <div className="result-line"><span id="result-label">{[filters.category==='전체'?'ALL ENTRIES':filters.category.toUpperCase(),filters.topic==='전체'?'':filters.topic].filter(Boolean).join(' / ')}</span><span id="result-count">{String(matches.length).padStart(2,'0')} RESULTS</span></div>
          <div id="post-list" className="post-list">{matches.map((post,index)=><a key={post.slug} className="post-row" href={postHref(post.slug)} onClick={saveArchive} aria-label={`${post.title} ${post.protected?'보호글 열기':'읽기'}`}><span className="post-number">{String(index+1).padStart(2,'0')}</span><div className="post-content"><span className="post-category">↳ {post.category.toUpperCase()}{topicFor(post)?` / ${topicFor(post)}`:''}{post.protected&&<span className="protected-mark"> / PROTECTED</span>}</span><h3>{post.title}</h3>{post.summary&&<p>{post.summary}</p>}</div><div className="post-meta"><span>{dateText(post.date)}</span><span>{post.readTime}</span></div><span className="post-arrow">{post.protected?'🔒':'↗'}</span></a>)}</div>
          {!matches.length&&<div className="empty-state" id="empty-state"><span>NO SIGNAL FOUND</span><h3>일치하는 기록이 없습니다.</h3><p>검색어나 카테고리, 주제를 바꿔보세요.</p><button type="button" onClick={()=>{update(defaults);search.current?.focus()}}>필터 초기화 ↗</button></div>}
        </section>
        <section className="connect-section"><div><p className="small-label">02 / CONNECT</p><h2>More than notes<span>.</span></h2><p>프로젝트와 활동의 전체 기록은 포트폴리오에서 확인할 수 있습니다.</p></div><a href="/">OPEN PORTFOLIO <span>↗</span></a></section>
      </div>}
    </main>
    <footer className="site-footer"><span>© 2026 Cédrai — FIELD NOTES</span><div><a href="https://github.com/Cedrai05" target="_blank" rel="noopener noreferrer">GITHUB ↗</a><a href="/">PORTFOLIO ↗</a></div><span>BREAK → UNDERSTAND → BUILD</span></footer>
  </div>
}
