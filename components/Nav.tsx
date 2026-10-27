'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'

const links = [
  { label: 'HOME',      href: '/'          },
  { label: 'PROJECTS',  href: '/projects'  },
  { label: 'BLOG',      href: '/blog' },
  { label: 'SCHEDULE',  href: '/schedule'  },
  { label: 'NOW',       href: '/now'       },
  { label: 'CONTACT',   href: '/contact'   },
]

function ContactLink({ onClick }: { onClick?: () => void }) {
  const router = useRouter()
  const handleClick = () => {
    onClick?.()
    if (window.location.pathname === '/') {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      router.push('/')
      setTimeout(() => {
        document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }
  return (
    <button onClick={handleClick} style={{ color: 'var(--tx2)', fontSize: '13px', letterSpacing: '.10em', transition: 'color .2s', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
      onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--acc)')}
      onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'var(--tx2)')}
    >CONTACT</button>
  )
}

export default function Nav() {
  const pathname = usePathname()
  const variant = pathname.startsWith('/blog') ? 'blog' : 'portfolio'
  const navigation = variant === 'blog' ? [{label:'BLOG',href:'/blog'}, {label:'GITHUB ↗',href:'https://github.com/Cedrai05'}, {label:'PROJECTS ↗',href:'/projects'}, {label:'PORTFOLIO ↗',href:'/'}] : links
  const breakpoint = 1100
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [adminIdInput, setAdminIdInput] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [dark, setDark] = useState(true)
  useEffect(() => { setDark(document.documentElement.dataset.theme !== 'light') }, [])
  useEffect(() => { setMenuOpen(false); setShowLogin(false) }, [pathname])
  const { isAdmin, isMember, login, logout } = useAuth()
  useEffect(() => {
    const open = () => { setMenuOpen(false); setShowLogin(true) }
    window.addEventListener('cedrai:open-login', open)
    return () => window.removeEventListener('cedrai:open-login', open)
  }, [])

  useEffect(() => {
    if (!menuOpen && !showLogin) return
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); setShowLogin(false) } }
    const outside = (event: MouseEvent) => { if (!(event.target as Element).closest('nav,[data-navigation-menu],.auth-dropdown')) { setMenuOpen(false); setShowLogin(false) } }
    document.addEventListener('keydown', key); document.addEventListener('click', outside)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('click', outside) }
  }, [menuOpen, showLogin])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    try { localStorage.setItem('theme', next ? 'dark' : 'light') } catch { /* Optional persistence. */ }
  }


  const handleLogin = async () => {
    if (loggingIn) return
    setLoggingIn(true)
    const err = await login(adminIdInput, password)
    setLoggingIn(false)
    if (err) { setLoginError(err); return }
    setShowLogin(false); setAdminIdInput(''); setPassword(''); setLoginError('')
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--bd)', color: 'var(--tx)',
    fontFamily: 'inherit', fontSize: '12px', padding: '6px 10px', outline: 'none', width: '100%',
  }

  return (
    <>
      <nav aria-label="주 메뉴" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.2rem', height: '48px', background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', position: 'sticky', top: 0, zIndex: 100 }}>

        {/* 로고 */}
        <Link href={variant === 'blog' ? '/blog' : '/'} aria-label={variant === 'blog' ? 'Cédrai 블로그 홈' : 'Cédrai 포트폴리오 홈'} style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 700, letterSpacing: '.08em', color: 'var(--txw)' }}>
          <span style={{ color: 'var(--acc)' }}>❮</span>Cédrai<span style={{ color: 'var(--acc)' }}>/❯</span>{variant === 'blog' && <span style={{color:'var(--acc)'}}>_LOG</span>}
        </Link>

        {/* 데스크탑 링크 */}
        <div className="nav-desktop" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {navigation.map((l) => (
            <Link key={l.label} href={l.href} prefetch={l.href === '/blog' || l.href === '/' ? true : undefined} aria-current={pathname === l.href ? 'page' : undefined} target={l.href.startsWith('https://') ? '_blank' : undefined} rel={l.href.startsWith('https://') ? 'noopener noreferrer' : undefined} style={{ color: pathname === l.href ? 'var(--acc)' : 'var(--tx2)', fontSize: '12px', textDecoration: 'none', letterSpacing: '.08em', transition: 'color .2s' }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'var(--acc)')}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = pathname === l.href ? 'var(--acc)' : 'var(--tx2)')}
            >{l.label}</Link>
          ))}
        </div>

        {/* 오른쪽 영역 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* SYS ONLINE - 데스크탑만 */}
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--acc2)', letterSpacing: '.1em' }}>
            <div className="scanner-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--acc2)' }} />
            SYS ONLINE
          </div>

          {/* 다크/라이트 토글 */}
          <button aria-label={dark ? '라이트 테마로 전환' : '다크 테마로 전환'} onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--bd)', color: 'var(--tx2)', cursor: 'pointer', fontSize: '12px', padding: '3px 8px', fontFamily: 'inherit', letterSpacing: '.06em' }}>
            {dark ? '☀' : '◑'}
          </button>

          {/* 로그인/어드민 */}
          {isAdmin || isMember ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--acc2)', letterSpacing: '.08em' }}>{isAdmin ? 'ADMIN' : 'MEMBER'}</span>
              <button onClick={logout} style={{ background: 'none', border: '1px solid var(--bd)', color: 'var(--tx2)', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit' }}>LOGOUT</button>
            </div>
          ) : (
            <button onClick={() => setShowLogin(!showLogin)} style={{ background: 'none', border: '1px solid var(--bd)', color: 'var(--tx2)', cursor: 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit' }}>LOGIN</button>
          )}

          {/* 햄버거 - 모바일만 */}
          <button className="nav-mobile" aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: 'none', color: 'var(--acc)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}>
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* 로그인 드롭다운 */}
      {showLogin && !isAdmin && (
        <div className="auth-dropdown" style={{ position: 'fixed', top: '76px', right: '1.2rem', zIndex: 200, background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px', width: '260px' }}>
          <div style={{ fontSize: '11px', color: 'var(--acc2)', letterSpacing: '.14em' }}>[ ACCOUNT LOGIN ]</div>
          <input value={adminIdInput} onChange={e => setAdminIdInput(e.target.value)} placeholder="ID" aria-label="로그인 아이디" autoComplete="username" style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="PASSWORD" aria-label="로그인 비밀번호" type="password" autoComplete="current-password" style={inputStyle}
            onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          {loginError && <div style={{ fontSize: '11px', color: 'var(--acc4)' }}>{loginError}</div>}
          <button onClick={handleLogin} disabled={loggingIn} className="btn-primary" style={{ alignSelf: 'flex-end', fontSize: '11px' }}>
            {loggingIn ? '...' : './LOGIN'}
          </button>
        </div>
      )}

      {/* 모바일 드롭다운 */}
      {menuOpen && (
        <div data-navigation-menu className="nav-mobile" style={{ position: 'fixed', top: 'var(--header-height)', left: 'var(--rail-width)', right: 0, zIndex: 99, background: 'var(--bg2)', borderBottom: '1px solid var(--bd)', display: 'flex', flexDirection: 'column' }}>
          {variant === 'blog' && <button type="button" onClick={() => { setMenuOpen(false); window.dispatchEvent(new Event('cedrai:open-about')) }} style={{padding:'14px 1.2rem',textAlign:'left',color:'var(--tx2)',background:'transparent',border:0,borderBottom:'1px solid var(--bd)'}}>ABOUT</button>}
          {navigation.map((l) => (
            <Link key={l.label} href={l.href} prefetch={l.href === '/blog' || l.href === '/' ? true : undefined} aria-current={pathname === l.href ? 'page' : undefined} target={l.href.startsWith('https://') ? '_blank' : undefined} rel={l.href.startsWith('https://') ? 'noopener noreferrer' : undefined} onClick={() => { setMenuOpen(false);  }}
              style={{ padding: '14px 1.2rem', color: 'var(--tx2)', fontSize: '14px', textDecoration: 'none', letterSpacing: '.10em', borderBottom: '1px solid var(--bd)' }}
            >{l.label}</Link>
          ))}
        </div>
      )}

      <style>{`
        @media (min-width: ${breakpoint + 1}px) { .nav-mobile { display: none !important; } }
        @media (max-width: ${breakpoint}px) { .nav-desktop { display: none !important; } }
      `}</style>
    </>
  )
}
