'use client'

import Image from 'next/image'

const ABOUT = {
  intro: [
    '건국대학교 글로컬캠퍼스 컴퓨터공학과에 재학 중입니다.',
    '보안에 관심이 많고 디지털 포렌식 수사관이 되고싶어서 공부중입니다.',
    '현재 보안 소모임 seKUrity에 소속되어있습니다.',
  ],
  education: [
    { label: 'UNIVERSITY', value: 'Konkuk Univ. GLOCAL' },
    { label: 'MAJOR',      value: 'Computer Engineering' },
    { label: 'STATUS',     value: 'Enrolled' },
    { label: 'LOCATION',   value: 'Chungju, Korea' },
  ],
  certs: [] as { name: string; date: string; status: string }[],
  activities: [
    { label: 'CTF PLATFORM', value: 'Dreamhack' },
    { label: 'BLOG',         value: 'cedrai05.github.io' },
    { label: 'GITHUB',       value: 'github.com/Cedrai05' },
  ],
  clubs: [
    { name: 'seKUrity', role: '신입부원', period: '25.03 – 25.08' },
    { name: 'seKUrity', role: '기존부원', period: '25.09 – 현재' },
    { name: 'seKUrity', role: '홍보', period: '26.09 – 현재' },
    { name: 'seKUrity', role: '포렌식 스터디장', period: '26.09 – 현재' },
  ],
}

export default function About() {
  return (
    <section id="about-detail" style={{ padding: '2rem', borderBottom: '1px solid var(--bd)' }}>
      <div className="sec-head" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.8rem' }}>
        <div className="sec-tag">ABOUT</div>
        <div className="sec-rule" style={{ flex: 1, height: '1px', background: 'var(--bd)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '1px', background: 'var(--acc)' }} />
        </div>
        <div className="sec-path" style={{ fontSize: '12px', color: 'var(--tx2)', letterSpacing: '.1em' }}>SYS://PROFILE</div>
      </div>

      <div className="split-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>

        {/* 자기소개 + 사진 */}
        <div className="hud-corner intro-card" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1.2rem', display: 'flex', gap: '1.4rem', alignItems: 'stretch' }}>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '120px', height: '120px', border: '1px solid var(--acc)', overflow: 'hidden', position: 'relative' }}>
              <Image src="/Suguru Geto.jpeg" alt="profile" fill style={{ objectFit: 'cover', objectPosition: 'top' }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--acc)', letterSpacing: '.1em', textAlign: 'center' }}>CÉDRAI</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--acc)', letterSpacing: '.18em', marginBottom: '.8rem' }}>[ INTRODUCTION ]</div>
            {ABOUT.intro.map((line, i) => (
              <p key={i} style={{ fontSize: '14px', color: 'var(--tx)', fontFamily: 'sans-serif', lineHeight: 1.85, marginBottom: '.3rem' }}>{line}</p>
            ))}
          </div>
        </div>

        {/* 학교/전공 */}
        <div className="hud-corner" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1.2rem' }}>
          <div style={{ fontSize: '12px', color: 'var(--acc)', letterSpacing: '.18em', marginBottom: '.9rem' }}>[ EDUCATION ]</div>
          {ABOUT.education.map((item) => (
            <div key={item.label} className="kv-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '.55rem', paddingBottom: '.55rem', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ fontSize: '12px', color: 'var(--tx2)', letterSpacing: '.12em' }}>{item.label}</span>
              <span style={{ fontSize: '13px', color: 'var(--txw)', fontFamily: 'sans-serif' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* 자격증 */}
        <div className="hud-corner hud-corner-red" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1.2rem' }}>
          <div style={{ fontSize: '12px', color: 'var(--acc2)', letterSpacing: '.18em', marginBottom: '.9rem' }}>[ CERTIFICATIONS ]</div>
          {ABOUT.certs.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--tx2)', letterSpacing: '.1em' }}>// 준비 중</div>
          ) : (
            ABOUT.certs.map((c) => (
              <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.6rem' }}>
                <span style={{ fontSize: '10px', color: 'var(--tx)', fontFamily: 'sans-serif' }}>{c.name}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '8px', color: 'var(--tx2)' }}>{c.date}</span>
                  <span style={{ fontSize: '7px', color: 'var(--acc)', border: '1px solid var(--acc)', padding: '1px 5px' }}>{c.status}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 활동 */}
        <div className="hud-corner" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1.2rem' }}>
          <div style={{ fontSize: '12px', color: 'var(--acc)', letterSpacing: '.18em', marginBottom: '.9rem' }}>[ ACTIVITY ]</div>
          {ABOUT.activities.map((item) => (
            <div key={item.label} className="kv-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '.55rem', paddingBottom: '.55rem', borderBottom: '1px solid var(--bd)' }}>
              <span style={{ fontSize: '12px', color: 'var(--tx2)', letterSpacing: '.12em' }}>{item.label}</span>
              <span style={{ fontSize: '13px', color: 'var(--txw)', fontFamily: 'sans-serif' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* 동아리 */}
        <div className="hud-corner hud-corner-red" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1.2rem', gridColumn: '1 / -1' }}>
          <div style={{ fontSize: '12px', color: 'var(--acc2)', letterSpacing: '.18em', marginBottom: '.9rem' }}>[ CLUBS & ACTIVITIES ]</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ABOUT.clubs.map((c, i) => (
              <div key={i} className="hud-corner club-card" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', padding: '.7rem 1rem', minWidth: '180px' }}>
                <div style={{ fontSize: '14px', color: 'var(--txw)', fontWeight: 700, marginBottom: '4px' }}>{c.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--acc2)', marginBottom: '3px' }}>{c.role}</div>
                <div style={{ fontSize: '11px', color: 'var(--tx2)' }}>{c.period}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
