'use client'

const LINKS = [
  { icon: 'GH', label: 'GITHUB', value: '/Cedrai05',            href: 'https://github.com/Cedrai05'    },
  { icon: 'TI', label: 'BLOG',   value: 'rinhye05.tistory.com', href: 'https://rinhye05.tistory.com/' },
  { icon: '@',  label: 'EMAIL',  value: 'flsrin715@gmail.com',  href: 'mailto:flsrin715@gmail.com'    },
]

export default function Contact({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <section id="contact" style={{ padding: '2rem', borderBottom: '1px solid var(--bd)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem' }}>
        <div className="sec-tag">CONNECT</div>
        <div style={{ flex: 1, height: '1px', background: 'var(--bd)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '1px', background: 'var(--acc)' }} />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--tx2)', letterSpacing: '.1em' }}>SYS://CONTACT</div>
      </div>

      {fullPage && (
        <div className="contact-intro">
          <h1>Let&apos;s connect<span>.</span></h1>
          <p>궁금한 점이나 함께 해보고 싶은 프로젝트가 있다면 편하게 연락해주세요.</p>
        </div>
      )}
      <div className="contact-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {LINKS.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div
              className="hud-corner"
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '.6rem 1rem', transition: 'border-color .2s', cursor: 'pointer' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--acc)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--bd)')}
            >
              <span style={{ fontSize: '14px', color: 'var(--acc)', fontWeight: 700 }}>{l.icon}</span>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--tx2)', letterSpacing: '.12em' }}>{l.label}</div>
                <div style={{ fontSize: '14px', color: 'var(--tx)' }}>{l.value}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
