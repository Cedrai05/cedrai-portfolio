import Projects from '@/components/Projects'
import Footer from '@/components/Footer'
import Link from 'next/link'

const fieldwork = [
  { kind: 'FORENSICS', title: 'Digital Forensics Study', description: '디지털 증거와 아티팩트를 공부한 기록', href: '/activities/forensic-study' },
  { kind: 'CTF', title: 'KU CTF 2025', description: '웹 문제 제작과 풀이 기록', href: '/activities/competitions/ku-ctf' },
  { kind: 'CTF', title: 'MSG CTF 2025', description: '대회 운영과 문제 제작 기록', href: '/activities/competitions/msg-ctf' },
  { kind: 'CTF', title: 'Club Union CTF', description: '동아리 연합 CTF 기록', href: '/activities/competitions/club-union-ctf' },
  { kind: 'CTF', title: 'Hacktheon 2026', description: '핵테온 대회 기록', href: '/activities/competitions/hacktheon' },
  { kind: 'COMPETITION', title: 'Chungcheong Cyber', description: '충청권 사이버보안 경진대회', href: '/activities/competitions/chungcheong-cyber' },
  { kind: 'COMMUNITY', title: 'seKUrity Rookie', description: '신입부원 활동과 파일', href: '/club/sekurity/rookie' },
]

export default function ProjectsPage() {
  return (
    <main className="page-main">
      <section className="archive-fieldwork-index" aria-label="활동 기록">
        <div className="archive-fieldwork-list">{fieldwork.map((item, index) => <Link href={item.href} key={item.href}><span>{String(index + 1).padStart(2, '0')} / {item.kind}</span><strong>{item.title}</strong><small>{item.description}</small><b>↗</b></Link>)}</div>
      </section>
      <Projects />
      <Footer />
    </main>
  )
}
