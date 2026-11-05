'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

const chapters = [
  { href: '/', label: 'THE MAP', number: '00' },
  { href: '/about', label: 'THE SEEKER', number: '01' },
  { href: '/projects', label: 'FIELDWORK', number: '02' },
  { href: '/blog', label: 'FIELD NOTES', number: '03' },
  { href: '/schedule', label: 'THE ALMANAC', number: '04' },
  { href: '/now', label: 'NOW', number: '05' },
  { href: '/contact', label: 'SEND AN OWL', number: '06' },
]
const houses = [
  { id: 'slytherin', label: 'SLYTHERIN', mark: 'S' },
  { id: 'gryffindor', label: 'GRYFFINDOR', mark: 'G' },
  { id: 'ravenclaw', label: 'RAVENCLAW', mark: 'R' },
  { id: 'hufflepuff', label: 'HUFFLEPUFF', mark: 'H' },
]

export default function ArchiveNav() {
  const pathname = usePathname()
  const { isAdmin, isMember, login, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [houseOpen, setHouseOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [house, setHouse] = useState('slytherin')
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setHouse(document.documentElement.dataset.house || 'slytherin')
    const open = () => setLoginOpen(true)
    window.addEventListener('cedrai:open-login', open)
    return () => window.removeEventListener('cedrai:open-login', open)
  }, [])
  useEffect(() => { setMenuOpen(false); setHouseOpen(false); setLoginOpen(false) }, [pathname])
  useEffect(() => {
    if (!menuOpen && !houseOpen && !loginOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); setHouseOpen(false); setLoginOpen(false) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, houseOpen, loginOpen])

  const chooseHouse = (next: string) => {
    document.documentElement.dataset.house = next
    try { localStorage.setItem('cedrai-house', next) } catch { /* Optional preference. */ }
    setHouse(next); setHouseOpen(false)
  }
  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    const message = await login(id, password)
    setBusy(false)
    if (message) { setError(message); return }
    setLoginOpen(false); setId(''); setPassword(''); setError('')
  }

  return <>
    <header className="archive-site-header">
      <a className="archive-site-brand" href="/"><span className="archive-site-brand__seal">C</span><span>CÉDRAI<small>THE HIDDEN ARCHIVE</small></span></a>
      <nav className="archive-site-links" aria-label="아카이브 챕터">
        {chapters.map(chapter => <a key={chapter.number} href={chapter.href}><span>{chapter.number}</span>{chapter.label}</a>)}
      </nav>
      <div className="archive-site-actions">
        <button type="button" className="archive-site-house" onClick={() => { setHouseOpen(value => !value); setMenuOpen(false) }} aria-expanded={houseOpen} aria-label="기숙사 선택"><span>✦</span> {houses.find(item => item.id === house)?.label}</button>
        {isAdmin || isMember ? <button type="button" className="archive-site-login" onClick={logout}>LOG OUT</button> : <button type="button" className="archive-site-login" onClick={() => setLoginOpen(true)}>SIGN IN</button>}
        <button type="button" className="archive-site-menu-button" onClick={() => { setMenuOpen(value => !value); setHouseOpen(false) }} aria-label="챕터 목록" aria-expanded={menuOpen}>☰</button>
      </div>
    </header>
    {houseOpen && <div className="archive-house-menu" role="group" aria-label="기숙사 선택">{houses.map(item => <button key={item.id} type="button" onClick={() => chooseHouse(item.id)} aria-pressed={house === item.id}><span>{item.mark}</span><strong>{item.label}</strong></button>)}</div>}
    {menuOpen && <nav className="archive-mobile-menu" aria-label="아카이브 챕터">{chapters.map(chapter => <a key={chapter.number} href={chapter.href} onClick={() => setMenuOpen(false)}><span>{chapter.number} /</span>{chapter.label} <b>↗</b></a>)}<Link href="/projects/records" onClick={() => setMenuOpen(false)}>PROJECT RECORDS ↗</Link><Link href="/blog/entries" onClick={() => setMenuOpen(false)}>FULL BLOG ↗</Link><Link href="/schedule/entries" onClick={() => setMenuOpen(false)}>FULL SCHEDULE ↗</Link></nav>}
    {loginOpen && !isAdmin && !isMember && <div className="archive-auth-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setLoginOpen(false) }}><div className="archive-auth-panel" role="dialog" aria-modal="true" aria-label="아카이브 로그인"><button type="button" className="archive-auth-close" onClick={() => setLoginOpen(false)} aria-label="닫기">×</button><span>✦ &nbsp; THE SEALED DESK</span><h2>Enter the archive</h2><p>개인 서재의 문을 엽니다.</p><form onSubmit={submitLogin}><label htmlFor="archive-account-id">ACCOUNT ID</label><input id="archive-account-id" value={id} onChange={event => setId(event.target.value)} autoComplete="username" required /><label htmlFor="archive-account-password">PASSWORD</label><input id="archive-account-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />{error && <p role="alert">{error}</p>}<button type="submit" disabled={busy}>{busy ? 'OPENING…' : 'CAST ALOHOMORA ↗'}</button></form></div></div>}
  </>
}
