'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import About from '@/components/About'

export default function ProfileRail() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const show = () => { trigger.current = document.activeElement as HTMLElement; setOpen(true) }
    window.addEventListener('cedrai:open-about', show)
    return () => window.removeEventListener('cedrai:open-about', show)
  }, [])
  useEffect(() => {
    if (!open) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); if (trigger.current?.isConnected) trigger.current.focus() }
  }, [open])

  return (
    <>
      <aside className="profile-rail" aria-label="프로필 요약">
      <div className="profile-rail__inner">
        <div className="profile-rail__eyebrow">PROFILE / 001</div>
        <div className="profile-rail__photo">
          <Image src="/Suguru Geto.jpeg" alt="Cédrai 프로필 이미지" fill sizes="180px" style={{ objectFit: 'cover', objectPosition: 'top' }} />
        </div>
        <div className="profile-rail__name">Cédrai<span>.</span></div>
        <p className="profile-rail__role">Computer Engineering<br />Security learner · CTF</p>
        <div className="profile-rail__line" />
        <p className="profile-rail__bio">디지털 포렌식과 웹 보안을 공부하며, 배운 것을 기록하고 직접 만들어봅니다.</p>
        <button type="button" className="profile-rail__link" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
          ABOUT ME <span>{open ? '×' : '↗'}</span>
        </button>
        <div className="profile-rail__status"><i /> AVAILABLE FOR LEARNING</div>
        </div>
      </aside>
      {open && (
        <div className="about-modal" role="dialog" aria-modal="true" aria-label="About Cédrai">
          <div className="about-modal__backdrop" onClick={() => setOpen(false)} />
          <div className="about-modal__panel">
            <button type="button" className="about-modal__close" onClick={() => setOpen(false)} aria-label="About 닫기">CLOSE ×</button>
            <About />
          </div>
        </div>
      )}
    </>
  )
}
