'use client'

import { useEffect, useRef, useState } from 'react'

const PHRASES = [
  'Computer Engineering',
  'CTF',
  'Forensic',
  'Web Hacking',
  'Reversing',
  'Security',
  'Python',
]

function useTyping(phrases: string[]) {
  const [text, setText] = useState('')
  const state = useRef({ phraseIdx: 0, charIdx: 0, deleting: false })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const { phraseIdx, charIdx, deleting } = state.current
      const cur = phrases[phraseIdx]

      if (!deleting) {
        const next = charIdx + 1
        state.current.charIdx = next
        setText(cur.slice(0, next))
        if (next === cur.length) {
          state.current.deleting = true
          timer = setTimeout(tick, 2200)
        } else {
          timer = setTimeout(tick, 100)
        }
      } else {
        const next = charIdx - 1
        state.current.charIdx = next
        setText(cur.slice(0, next))
        if (next === 0) {
          state.current.deleting = false
          state.current.phraseIdx = (phraseIdx + 1) % phrases.length
          timer = setTimeout(tick, 400)
        } else {
          timer = setTimeout(tick, 55)
        }
      }
    }

    timer = setTimeout(tick, 600)
    return () => clearTimeout(timer)
  }, [phrases])

  return text
}

function Scanner() {
  return (
    <div
      className="scanner-wrap"
      style={{ width: '150px', height: '150px', position: 'relative', flexShrink: 0, alignSelf: 'center' }}
    >
      {[0, 18, 36, 54].map((inset) => (
        <div key={inset} style={{ position: 'absolute', inset: `${inset}px`, borderRadius: '50%', border: `1px solid rgba(0,229,255,${inset === 0 ? 0.12 : inset === 18 ? 0.08 : inset === 36 ? 0.16 : 0.1})` }} />
      ))}
      <div className="scanner-sweep" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'var(--acc)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '12px', right: '12px', height: '1px', background: 'rgba(0,229,255,.1)', transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: '12px', bottom: '12px', width: '1px', background: 'rgba(0,229,255,.1)', transform: 'translateX(-50%)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', width: '5px', height: '5px', borderRadius: '50%', background: 'var(--acc)', transform: 'translate(-50%,-50%)' }} />
      <div style={{ position: 'absolute', bottom: '-18px', left: 0, right: 0, textAlign: 'center', fontSize: '7px', color: 'var(--tx2)', letterSpacing: '.18em' }}>SCANNING...</div>
    </div>
  )
}

export default function Hero() {
  const typed = useTyping(PHRASES)

  return (
    <section id="about" className="scanlines" style={{ padding: '3rem 2rem 2.5rem', borderBottom: '1px solid var(--bd)', overflow: 'hidden' }}>
      <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: '2rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--tx2)', letterSpacing: '.14em', marginBottom: '.6rem' }}>
            HANDLE: <span style={{ color: 'var(--acc)' }}>CÉDRAI</span> // KONKUK UNIV. GLOCAL · COMPUTER ENGINEERING
          </div>

          <h1 className="glitch" data-text="Cédrai" style={{ fontSize: '52px', fontWeight: 700, color: 'var(--txw)', lineHeight: 1, marginBottom: '.4rem', letterSpacing: '.02em' }}>
            Cédrai
          </h1>

          <div className="typed-cursor" style={{ fontSize: '13px', color: 'var(--acc)', minHeight: '22px', marginBottom: '.9rem', letterSpacing: '.04em' }}>
            {typed}
          </div>

          <p style={{ fontSize: '14px', color: 'var(--tx)', lineHeight: 1.85, marginBottom: '1.2rem', fontFamily: 'sans-serif' }}>
            현재 컴퓨터공학과에 재학중이며 보안 공부중입니다.<br />
            CTF · 포렌식 · 웹해킹 · 리버싱 · AI
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="#projects"><button className="btn-primary">./VIEW_PROJECTS</button></a>
            <a href="#contact"><button className="btn-secondary">CAT RESUME.PDF</button></a>
          </div>

        </div>

        <Scanner />
      </div>
    </section>
  )
}
