'use client'

import { useEffect, useState } from 'react'

type Post = { id: string; title: string; href: string; date: string; locked: boolean }
type Category = { name: string; path: string; count: number; posts: Post[] }

const BLOG_URL = ''
const POSTS_PER_CATEGORY = 3

// 이관된 블로그의 카테고리마다 이름 기준으로 색을 고정 배정합니다.
const PALETTE = ['var(--acc)', 'var(--acc2)', 'var(--acc3)', '#8ed8ff', '#64c7d8', '#9bbcff']

function colorFor(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export default function Blog() {
  const [categories, setCategories] = useState<Category[] | null>(null)

  useEffect(() => {
    fetch('/api/blog')
      .then((r) => r.json())
      .then((data: { categories: Category[] }) => setCategories(data.categories ?? []))
      .catch(() => setCategories([]))
  }, [])

  if (categories === null) return (
    <section id="blog" className="blog-section" style={{ padding: '2rem', borderBottom: '1px solid var(--bd)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
        <div className="sec-tag">INTEL LOG</div>
        <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
        <div className="sec-path" style={{ fontSize: '8px', color: 'var(--tx2)', letterSpacing: '.1em' }}>SYS://RECENT_POSTS</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ height: '60px', background: 'var(--bg2)', border: '1px solid var(--bd)', borderLeft: '2px solid var(--bd)', padding: '.8rem 1rem', opacity: 1 - i * 0.2 }}>
            <div style={{ height: '10px', width: `${60 - i * 10}%`, background: 'var(--bd)', marginBottom: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ height: '8px', width: '30%', background: 'var(--bd)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
    </section>
  )

  return (
    <section id="blog" className="blog-section" style={{ padding: '2rem', borderBottom: '1px solid var(--bd)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
        <div className="sec-tag">INTEL LOG</div>
        <div style={{ flex: 1, height: '1px', background: 'var(--bd)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '1px', background: 'var(--acc)' }} />
        </div>
        <div className="sec-path" style={{ fontSize: '8px', color: 'var(--tx2)', letterSpacing: '.1em' }}>SYS://RECENT_POSTS</div>
      </div>

      {categories.length === 0 && (
        <div style={{ fontSize: '13px', color: 'var(--tx2)', letterSpacing: '.1em' }}>
          // 글을 불러오지 못했어요. <a href="/blog" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--acc)' }}>블로그에서 보기 →</a>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {categories.map((c) => {
          const color = colorFor(c.name)
          return (
            <div key={c.path} className="blog-category">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                <div style={{ width: '3px', height: '16px', background: color, flexShrink: 0 }} />
                <a href={`${BLOG_URL}${c.path}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '11px', color, fontWeight: 700, letterSpacing: '.14em', textDecoration: 'none' }}>
                  {c.name.toUpperCase()}
                </a>
                <span style={{ fontSize: '8px', color: 'var(--tx2)', letterSpacing: '.1em' }}>
                  {c.count} POSTS
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '7px' }}>
                {c.posts.slice(0, POSTS_PER_CATEGORY).map((p) => (
                  <a key={p.id} className="blog-post-card" href={p.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        background: 'var(--bg2)',
                        border: '1px solid var(--bd)',
                        borderLeft: `2px solid ${color}`,
                        padding: '.8rem 1rem',
                        transition: 'background .2s',
                        height: '100%',
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg3)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg2)')}
                    >
                      <div style={{ fontSize: '10px', color: 'var(--tx)', fontFamily: 'sans-serif', lineHeight: 1.45, marginBottom: '8px' }}>
                        {p.locked && <span title="보호글" style={{ marginRight: '4px' }}>🔒</span>}
                        {p.title}
                      </div>
                      <div style={{ fontSize: '8px', color: 'var(--tx2)' }}>{p.date}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
