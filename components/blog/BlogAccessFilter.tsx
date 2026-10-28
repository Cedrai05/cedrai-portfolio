'use client'

import { useEffect, useRef, useState } from 'react'

export type AccessFilter = 'all' | 'public' | 'members'
export const accessLabels: Record<AccessFilter, string> = {
  all: '전체 글',
  public: '공개 글',
  members: '멤버 전용',
}

export default function BlogAccessFilter({ value, onChange }: { value: AccessFilter; onChange: (value: AccessFilter) => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function dismiss(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [open])

  return <div className="access-filter" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false)
  }}>
    <button ref={trigger} type="button" className="access-filter__trigger" data-active={value !== 'all'} aria-label={`공개 범위 필터: ${accessLabels[value]}`} title={`공개 범위 필터: ${accessLabels[value]}`} aria-expanded={open} aria-controls="access-filter-options" onClick={() => setOpen(current => !current)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" /></svg>
      {value !== 'all' && <span className="access-filter__dot" />}
    </button>
    {open && <div id="access-filter-options" className="access-filter__panel" role="group" aria-label="공개 범위 필터">
      <span className="access-filter__heading">공개 범위</span>
      {(Object.keys(accessLabels) as AccessFilter[]).map(option => <button type="button" key={option} aria-pressed={value === option} onClick={() => {
        onChange(option)
        setOpen(false)
        trigger.current?.focus()
      }}><span>{accessLabels[option]}</span><span aria-hidden="true">{value === option ? '✓' : ''}</span></button>)}
    </div>}
  </div>
}
