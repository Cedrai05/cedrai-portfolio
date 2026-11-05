import Link from 'next/link'

const chapters: Record<string, { number: string; eyebrow: string; title: string; description: string }> = {
  '/about': { number: '01', eyebrow: 'ABOUT / PROFILE', title: 'The Seeker', description: '단서를 따라온 사람의 이야기를 펼쳐봅니다.' },
  '/projects': { number: '02', eyebrow: 'SELECTED WORK', title: 'Fieldwork', description: '공부와 대회에서 발견한 흔적을 모았습니다.' },
  '/blog': { number: '03', eyebrow: 'THE BLOG / JOURNAL', title: 'Field Notes', description: '보안과 디지털 포렌식에서 찾은 단서를 기록합니다.' },
  '/blog/write': { number: '03', eyebrow: 'THE SEALED DESK', title: 'The Writing Desk', description: '새 기록을 아카이브에 남깁니다.' },
  '/schedule': { number: '04', eyebrow: 'THE CALENDAR', title: 'The Almanac', description: '날짜마다 새겨 둔 기록과 할 일을 살펴봅니다.' },
  '/now': { number: '05', eyebrow: 'CURRENT CHAPTER', title: 'At This Moment', description: '요즘의 생각과 일상을 담은 페이지입니다.' },
  '/contact': { number: '06', eyebrow: 'SEND A LETTER', title: 'Send an Owl', description: '함께 이야기하고 싶다면 편지를 보내주세요.' },
}

export default function ArchiveRouteHeader({ pathname }: { pathname: string }) {
  const chapter = chapters[pathname] || (pathname.startsWith('/activities') || pathname.startsWith('/club')
    ? { number: '02', eyebrow: 'FIELD RECORDS', title: 'Fieldwork', description: '공부와 활동의 흔적을 펼쳐봅니다.' }
    : { number: '03', eyebrow: 'THE SEALED DESK', title: 'The Archive', description: '기록의 다음 장을 펼쳐봅니다.' })
  return <div className="archive-route-head"><div className="archive-route-head__top"><span>✦ &nbsp; CHAPTER {chapter.number}</span><Link href="/#home">← ALL CHAPTERS</Link></div><div className="archive-route-head__title"><span>{chapter.eyebrow}</span><h1>{chapter.title}</h1><p>{chapter.description}</p></div></div>
}
