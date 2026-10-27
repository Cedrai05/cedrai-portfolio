import Link from 'next/link'

export default function Footer({ variant = 'portfolio' }: { variant?: 'portfolio' | 'blog' } = {}) {
  return (
    <footer
      style={{
        padding: '.8rem 2rem',
        background: 'var(--bg2)',
        borderTop: '1px solid var(--bd)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: '12px', color: 'var(--tx2)', letterSpacing: '.08em' }}>
        © 2026 <span style={{ color: 'var(--acc)' }}>Cédrai</span> — {variant === 'blog' ? 'FIELD NOTES' : 'NEXT.JS + VERCEL'}
      </span>
      {variant === 'blog' && <div className="footer-links"><a href="https://github.com/Cedrai05" target="_blank" rel="noopener noreferrer">GITHUB ↗</a><Link href="/" prefetch>PORTFOLIO ↗</Link></div>}
      <span style={{ fontSize: '12px', color: 'var(--tx2)', letterSpacing: '.08em' }}>
        BREAK → UNDERSTAND → BUILD
      </span>
    </footer>
  )
}
