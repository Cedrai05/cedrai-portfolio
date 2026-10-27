'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
const phrases = ['Computer Engineering', 'CTF', 'Forensic', 'Web Hacking', 'Reversing', 'Security', 'Python']
export default function BlogHero() {
  const [typed, setTyped] = useState('')
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let timer: ReturnType<typeof setTimeout> | undefined
    let index = 0, character = 0, deleting = false
    function stop() { clearTimeout(timer) }
    function tick() {
      if (document.hidden || motion.matches) return
      const phrase = phrases[index]
      character += deleting ? -1 : 1
      setTyped(phrase.slice(0,character))
      let delay = deleting ? 55 : 100
      if (!deleting && character === phrase.length) { deleting = true; delay = 2200 }
      else if (deleting && character === 0) { deleting = false; index = (index+1)%phrases.length; delay = 400 }
      timer = setTimeout(tick,delay)
    }
    function start() { stop(); if (motion.matches) setTyped(phrases[0]); else if (!document.hidden) timer = setTimeout(tick,600) }
    function visibility() { if (document.hidden) stop(); else start() }
    start()
    document.addEventListener('visibilitychange',visibility)
    motion.addEventListener('change',start)
    return () => { stop(); document.removeEventListener('visibilitychange',visibility); motion.removeEventListener('change',start) }
  },[])
  return <section className="hero">
    <div className="blog-hero-grid">
      <div className="hero-content">
        <p className="eyebrow">HANDLE: <strong>CÉDRAI</strong> // KONKUK UNIV. GLOCAL · COMPUTER ENGINEERING</p>
        <h1 aria-label="Field Notes."><span className="glitch" data-text="Field" aria-hidden="true">Field</span>{' '}<span className="glitch hero-title-accent" data-text="Notes." aria-hidden="true">Notes<span className="period">.</span></span></h1>
        <div className="hero-typing"><span className="visually-hidden">{phrases.join(' · ')}</span><span aria-hidden="true">{typed}</span><span className="typed-cursor" aria-hidden="true" /></div>
        <p className="hero-description">배운 것을 기록하고, 풀어낸 과정을 남깁니다.<br />개발과 보안 사이에서 쌓아가는 <em>나만의 아카이브.</em></p>
        <div className="hero-cta"><a href="#archive" className="primary-button">./EXPLORE_LOGS <span>↘</span></a><Link href="/" prefetch className="secondary-button">VIEW PORTFOLIO ↗</Link></div>
      </div>
      <div className="hero-graphic" aria-hidden="true"><div className="scanner-ring" /><div className="scanner-ring scanner-ring-two" /><div className="scanner-ring scanner-ring-three" /><div className="scanner-ring scanner-ring-four" /><div className="scanner-sweep" /><div className="scanner-cross scanner-horizontal" /><div className="scanner-cross scanner-vertical" /><div className="scanner-core" /><span className="scanner-caption">SCANNING...</span></div>
    </div>
  </section>
}
