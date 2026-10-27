'use client'

import { useEffect, useState } from 'react'
import { upload as uploadBlob } from '@vercel/blob/client'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { safeFileName } from '@/lib/file-name'

type Session = { title: string; tools?: string; learning?: string[]; assignments: string[] }
type PrivateFile = { name: string; size: number; uploadedAt: string }
type SessionFiles = { reports: PrivateFile[]; practice: PrivateFile[] }

const CURRICULUM: Session[] = [
  { title: '디지털 포렌식 개론 & 트리아지 전략', learning: ['디지털 증거의 5대 원칙', '휘발성 순위', '포렌식 아티팩트의 분류', '침해사고 발생 시 분석 순서 수립 방법'], assignments: ['시나리오 기반 트리아지 계획서 작성: 사내 PC 랜섬웨어 감염 의심 상황에서 증거 훼손을 최소화하기 위한 수집·분석 순서도와 이유를 A4 1~2장으로 정리', '아티팩트 맵핑 매트릭스 제작: 방문 웹사이트, USB 연결 흔적, 실행된 악성코드, 삭제된 문서를 찾기 위해 확인할 파일과 로그를 표로 정리'] },
  { title: '바이너리 기초, 파일 구조 및 파일 시그니처', tools: 'HxD (Hex Editor) · TrID · file', learning: ['파일 헤더(Magic Number)와 푸터(Footer)의 개념', '빅 엔디언과 리틀 엔디언의 차이', '확장자 변조 및 파일 손상 원리'], assignments: ['훼손된 파일 3종 복구', '복구 과정을 상세하게 기록한 보고서 제출'] },
  { title: '디스크 이미징 & 무결성 검증', tools: 'FTK Imager · HashCalc', learning: ['물리 드라이브와 논리 드라이브 덤프의 차이', 'Raw/dd, E01 이미지 포맷과 E01 메타데이터 구조', 'MD5, SHA-256 해시를 활용한 무결성 검증'], assignments: ['연습용 USB 또는 가상 VHD를 물리·논리 이미지(E01, raw)로 각각 덤프하고, 원본과 덤프의 해시값을 비교한 무결성 일치 확인서 작성', 'E01 내부의 케이스 정보, 수집자 이름, 수집 일시를 확인하고 추출'] },
  { title: '파일시스템 분석 & 파일 카빙', tools: 'Autopsy', learning: ['FAT32와 NTFS의 차이(MFT, $LogFile)', '파일 삭제 메커니즘', 'RAM Slack, File Slack, Unallocated Space의 개념'], assignments: ['디스크 이미지에서 삭제된 PDF·DOCX 파일 복원', '파일 슬랙 영역에 은닉된 텍스트 플래그 추출', '복구 파일의 원본 경로, 파일 크기, MFT 레코드 번호를 포함한 보고서 제출'] },
  { title: '윈도우 실행 흔적 아티팩트', tools: 'Eric Zimmerman Tools (PECmd, AmcacheParser) · WinPrefetchView', learning: ['Prefetch의 실행 횟수, 최초·최종 실행 시간, 참조 DLL 목록', 'Shimcache와 Amcache를 이용한 실행 흔적 및 SHA-1 해시 추적', 'Jump Lists와 LNK 파일을 이용한 최근 파일·경로 추적'], assignments: ['윈도우 아티팩트 덤프에서 특정 시간대에 실행된 악성 프로그램을 식별하고 최초·최종 실행 시간, 실행 횟수, 실행 경로를 표로 제출'] },
  { title: '윈도우 사용자 행위 & 이벤트 로그 분석', tools: 'EvtxECmd · Registry Explorer · USBDeview · Shellbags Explorer', learning: ['Security.evtx 핵심 Event ID: 4624, 4625, 4688', 'SYSTEM, SOFTWARE 레지스트리와 setupapi.dev.log를 이용한 USB 흔적 추적', 'Shellbags를 이용한 삭제된 폴더 탐색 경로 재구성'], assignments: ['원격 접속, USB 연결, 특정 폴더 열람·유출 시나리오를 분석하고 로그온 시간, USB 시리얼·연결 시간, 열람 폴더를 시간순 타임라인으로 작성'] },
  { title: '디스크 & 아티팩트 복합 문제', assignments: ['E01 디스크 이미지와 윈도우 아티팩트 모음 분석', '손상된 파티션에서 특정 확장자 파일 카빙', '실행 후 삭제된 악성코드의 원본 파일명과 최종 실행 시각 확인', '외부 USB로 반출된 파일의 SHA-256 해시값 확인', '단계별 툴 스크린샷과 풀이 로직을 포함한 상세 Writeup 제출'] },
  { title: '메모리 포렌식', tools: 'Volatility 3 · MemProcFS', learning: ['RAM 덤프 수집 원리와 메모리 포렌식의 중요성', 'windows.pslist, windows.pstree를 이용한 프로세스 트리 분석', 'windows.malfind를 이용한 코드 인젝션·은닉 프로세스 탐지', 'windows.netscan을 이용한 메모리 내 네트워크 연결 확인'], assignments: ['raw 메모리 덤프에서 부모 프로세스가 비정상적인 의심 프로세스 식별', 'malfind로 인젝션 메모리 영역을 덤프하고 C&C 서버의 IP와 Port 제출'] },
  { title: '네트워크 포렌식', tools: 'Wireshark · NetworkMiner · tshark', learning: ['PCAP 기본 구조와 프로토콜별 계층 분석', 'TCP Stream Follow를 통한 세션 재구성', 'HTTP, FTP, DNS 기반 데이터 추출 및 패킷 카빙'], assignments: ['대용량 PCAP에서 다운로드된 악성 파일 또는 압축 파일을 추출하고 해시값 제출', 'DNS 쿼리를 분석해 DNS Data Exfiltration 의심 도메인 식별'] },
  { title: '침해사고 대응(IR) 실무 보고서', assignments: ['디스크 이미지, 메모리 덤프, 네트워크 PCAP이 포함된 통합 시나리오 분석', '사건 개요 및 요약 작성', '최초 침투 경로를 패킷·로그로 분석', '메모리·Prefetch·레지스트리에서 악성 행위와 실행 흔적 분석', '디스크 카빙·MFT 결과를 기반으로 피해 규모와 유출 데이터 정리', '종합 타임라인 및 대응 권고안 작성'] },
]

function formatSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function ForensicStudyPage() {
  const { isAdmin, isMember, ready } = useAuth()
  const canDownload = isAdmin || isMember
  const [open, setOpen] = useState(0)
  const [files, setFiles] = useState<Record<string, SessionFiles>>({})
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [storage, setStorage] = useState<'blob' | 'local'>('local')

  const loadFiles = async (sessionId: string) => {
    const res = await fetch(`/api/activities/forensic-study/${sessionId}`)
    if (res.ok) {
      const data = await res.json()
      setFiles((current) => ({ ...current, [sessionId]: data }))
      setStorage(data.storage ?? 'local')
    }
  }
  useEffect(() => { loadFiles('session-01') }, [])

  const upload = async (event: React.FormEvent<HTMLFormElement>, sessionId: string, kind: 'reports' | 'practice') => {
    event.preventDefault()
    const input = event.currentTarget.elements.namedItem('file') as HTMLInputElement
    const files = Array.from(input.files ?? [])
    if (files.length === 0) return setMessage('업로드할 파일을 선택해주세요.')
    setUploading(true); setMessage('')
    let data: { uploaded?: string[]; skipped?: string[]; error?: string } = {}
    if (storage === 'blob') {
      try {
        const uploaded: string[] = []
        for (const file of files) { const name = safeFileName(file.name); await uploadBlob(`forensic-study/${sessionId}/${kind}/${name}`, file, { access: 'private', handleUploadUrl: '/api/uploads/client' }); uploaded.push(name) }
        data = { uploaded }
      } catch (error) { data = { error: error instanceof Error ? error.message : '업로드에 실패했어요.' } }
    } else {
      const body = new FormData(); files.forEach((file) => body.append('file', file)); body.append('kind', kind)
      const res = await fetch(`/api/activities/forensic-study/${sessionId}`, { method: 'POST', body })
      data = await res.json().catch(() => ({}))
      if (!res.ok) data.error ??= '업로드에 실패했어요.'
    }
    setUploading(false)
    if (data.error) return setMessage(data.error)
    event.currentTarget.reset()
    const skipped = Array.isArray(data.skipped) && data.skipped.length > 0 ? ` (중복/제외: ${data.skipped.join(', ')})` : ''
    setMessage(`${data.uploaded?.length ?? 0}개 파일을 업로드했어요.${skipped}`); loadFiles(sessionId)
  }

  const remove = async (sessionId: string, kind: 'reports' | 'practice', name: string) => {
    if (!window.confirm(`'${name}' 파일을 삭제할까요?`)) return
    const res = await fetch(`/api/activities/forensic-study/${sessionId}/${encodeURIComponent(name)}?kind=${kind}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setMessage(res.ok ? `${name} 파일을 삭제했어요.` : (data.error ?? '삭제에 실패했어요.'))
    if (res.ok) loadFiles(sessionId)
  }

  const toggleSession = (index: number) => {
    const next = open === index ? -1 : index
    setOpen(next)
    if (next >= 0) loadFiles(`session-${String(next + 1).padStart(2, '0')}`)
  }

  const fileSection = (sessionId: string, kind: 'reports' | 'practice', label: string) => {
    const list = files[sessionId]?.[kind] ?? []
    return <div className="session-files__section">
      <div className="session-files__title">{label}</div>
      {isAdmin && <form onSubmit={(event) => upload(event, sessionId, kind)} className="session-files__upload"><input name="file" type="file" multiple accept=".zip,.7z,.rar,.pdf,.doc,.docx,.txt,.md,.raw,.pcap,.e01,.dd,.img" aria-label={`${label} 업로드`} /><button className="btn-secondary" disabled={uploading}>{uploading ? '...' : 'UPLOAD FILES'}</button></form>}
      <div className="session-files__list">{list.length === 0 ? <span className="session-files__empty">// 준비된 파일 없음</span> : list.map((file) => canDownload ? <div key={file.name} className="session-file-row"><a href={`/api/activities/forensic-study/${sessionId}/${encodeURIComponent(file.name)}?kind=${kind}`} className="session-file">↘ {file.name}<small>{formatSize(file.size)}</small></a>{isAdmin && <button className="file-delete" onClick={() => remove(sessionId, kind, file.name)} aria-label={`${file.name} 삭제`}>×</button>}</div> : <span key={file.name} className="session-file session-file--locked">⌁ {file.name}<small>LOGIN REQUIRED</small></span>)}</div>
    </div>
  }

  return (
    <main className="page-main">

      <section className="study-page">
        <div className="study-page__head"><div className="sec-tag sec-tag-red">SECURITY STUDY / FORENSICS</div><div className="study-page__path">STUDY://FORENSICS</div></div>
        <h1>Forensic Study<span>.</span></h1>
        <p className="study-page__intro">10차시 커리큘럼과 매주 실습 자료를 정리하는 공간입니다.</p>

        <div className="curriculum-list">
          {CURRICULUM.map((session, index) => (
            <article key={session.title} className={`curriculum-card ${open === index ? 'is-open' : ''}`}>
              <button className="curriculum-card__toggle" onClick={() => toggleSession(index)} aria-expanded={open === index}>
                <span className="curriculum-card__number">{String(index + 1).padStart(2, '0')}</span>
                <span className="curriculum-card__title">{session.title}</span>
                <span className="curriculum-card__arrow">{open === index ? '−' : '+'}</span>
              </button>
              {open === index && <div className="curriculum-card__body">
                {session.tools && <div className="curriculum-tools"><b>TOOLS</b>{session.tools}</div>}
                {session.learning && <div className="curriculum-block"><h3>LEARNING</h3><ul>{session.learning.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                <div className="curriculum-block"><h3>ASSIGNMENTS</h3><ul>{session.assignments.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div className="session-files">{fileSection(`session-${String(index + 1).padStart(2, '0')}`, 'reports', 'REPORT FILES')}{fileSection(`session-${String(index + 1).padStart(2, '0')}`, 'practice', 'PRACTICE FILES')}</div>
              </div>}
            </article>
          ))}
        </div>

        {message && <div className="private-files__message">{message}</div>}
      </section>
      <Footer />
    </main>
  )
}
