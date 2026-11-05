'use client'

import { useEffect, useState } from 'react'
import { EVENT_COLORS, SCHEDULE_DATA, type ScheduleData } from '@/lib/data'
import { useEditable } from '@/lib/use-editable'
import Notice from '@/components/Notice'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDay(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
function pad(n: number) { return String(n).padStart(2, '0') }
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`
}
function parseDate(value: string) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function addDays(value: string, count: number) {
  const date = parseDate(value)
  date.setDate(date.getDate() + count)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function Schedule() {
  const { isAdmin, items: scheduleData, saving, notice, setNotice, commit } = useEditable<ScheduleData>('schedule', SCHEDULE_DATA)

  const today = new Date()
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected,  setSelected]  = useState(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()))
  const [showEventForm, setShowEventForm] = useState(false)
  const [showTodoForm, setShowTodoForm] = useState(false)
  const [eventEditId, setEventEditId] = useState<string | null>(null)
  const [todoEditId, setTodoEditId] = useState<string | null>(null)
  const [eventForm, setEventForm] = useState({ startDate: selected, endDate: selected, title: '', description: '', color: EVENT_COLORS[0] })
  const [todoForm, setTodoForm] = useState({ startDate: selected, endDate: selected, content: '', done: false })

  useEffect(() => {
    setEventForm(prev => ({ ...prev, startDate: selected, endDate: prev.endDate || selected }))
    setTodoForm(prev => ({ ...prev, startDate: selected, endDate: prev.endDate || selected }))
  }, [selected])

  const events = [...scheduleData.events].sort((a, b) => a.date.localeCompare(b.date))
  const todos = [...scheduleData.todos].sort((a, b) => a.date.localeCompare(b.date))
  const eventDates = new Set(events.map(e => e.date))
  const todoDates  = new Set(todos.map(t => t.date))

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay    = getFirstDay(viewYear, viewMonth)
  const cells       = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const selectedEvents = events.filter(e => e.date === selected)
  const selectedTodos  = todos.filter(t => t.date === selected)

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }

  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT']

  const addEvent = async () => {
    const title = eventForm.title.trim()
    if (!title) {
      setNotice({ kind: 'err', text: '일정 제목을 입력해주세요.' })
      return
    }

    const start = eventForm.startDate
    const end = eventForm.endDate
    const startDate = parseDate(start)
    const endDate = parseDate(end)
    if (endDate < startDate) {
      setNotice({ kind: 'err', text: '종료 날짜는 시작 날짜보다 늦어야 해요.' })
      return
    }

    const dates: string[] = []
    let cursor = start
    while (cursor <= end) {
      dates.push(cursor)
      cursor = addDays(cursor, 1)
    }

    const nextEvents = dates.map((date, index) => ({
      id: `event-${Date.now()}-${index}`,
      title,
      date,
      description: eventForm.description.trim(),
      color: eventForm.color,
    }))

    if (eventEditId) {
      const next: ScheduleData = {
        ...scheduleData,
        events: scheduleData.events.map(e => e.id === eventEditId ? {
          ...e,
          title,
          date: start,
          description: eventForm.description.trim(),
          color: eventForm.color,
        } : e),
      }
      if (await commit(next)) {
        setEventForm({ startDate: selected, endDate: selected, title: '', description: '', color: EVENT_COLORS[0] })
        setEventEditId(null)
        setShowEventForm(false)
      }
      return
    }

    const next: ScheduleData = {
      ...scheduleData,
      events: [...scheduleData.events, ...nextEvents],
    }

    if (await commit(next)) {
      setEventForm({ startDate: selected, endDate: selected, title: '', description: '', color: EVENT_COLORS[0] })
      setShowEventForm(false)
    }
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('이 일정을 삭제할까요?')) return
    await commit({ ...scheduleData, events: scheduleData.events.filter(e => e.id !== id) })
  }

  const startEditEvent = (event: typeof scheduleData.events[number]) => {
    setEventEditId(event.id)
    setEventForm({ startDate: event.date, endDate: event.date, title: event.title, description: event.description, color: event.color })
    setShowEventForm(true)
    setShowTodoForm(false)
    setNotice(null)
  }

  const addTodo = async () => {
    const content = todoForm.content.trim()
    if (!content) {
      setNotice({ kind: 'err', text: '할 일 내용을 입력해주세요.' })
      return
    }

    const start = todoForm.startDate
    const end = todoForm.endDate
    const startDate = parseDate(start)
    const endDate = parseDate(end)
    if (endDate < startDate) {
      setNotice({ kind: 'err', text: '종료 날짜는 시작 날짜보다 늦어야 해요.' })
      return
    }

    const dates: string[] = []
    let cursor = start
    while (cursor <= end) {
      dates.push(cursor)
      cursor = addDays(cursor, 1)
    }

    const nextTodos = dates.map((date, index) => ({
      id: `todo-${Date.now()}-${index}`,
      date,
      content,
      done: todoForm.done,
    }))

    if (todoEditId) {
      const next: ScheduleData = {
        ...scheduleData,
        todos: scheduleData.todos.map(t => t.id === todoEditId ? {
          ...t,
          date: start,
          content,
          done: todoForm.done,
        } : t),
      }
      if (await commit(next)) {
        setTodoForm({ startDate: selected, endDate: selected, content: '', done: false })
        setTodoEditId(null)
        setShowTodoForm(false)
      }
      return
    }

    const next: ScheduleData = {
      ...scheduleData,
      todos: [...scheduleData.todos, ...nextTodos],
    }

    if (await commit(next)) {
      setTodoForm({ startDate: selected, endDate: selected, content: '', done: false })
      setShowTodoForm(false)
    }
  }

  const deleteTodo = async (id: string) => {
    if (!confirm('이 투두를 삭제할까요?')) return
    await commit({ ...scheduleData, todos: scheduleData.todos.filter(t => t.id !== id) })
  }

  const toggleTodo = async (id: string) => {
    await commit({
      ...scheduleData,
      todos: scheduleData.todos.map(t => t.id === id ? { ...t, done: !t.done } : t),
    })
  }

  const startEditTodo = (todo: typeof scheduleData.todos[number]) => {
    setTodoEditId(todo.id)
    setTodoForm({ startDate: todo.date, endDate: todo.date, content: todo.content, done: todo.done })
    setShowTodoForm(true)
    setShowEventForm(false)
    setNotice(null)
  }

  return (
    <section id="schedule" style={{ padding: '2rem', borderBottom: '1px solid var(--bd)' }}>
      <div className="sec-head" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
        <div className="sec-tag sec-tag-red">SCHEDULE</div>
        <div className="sec-rule" style={{ flex: 1, height: '1px', background: 'var(--bd)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '1px', background: 'var(--acc2)' }} />
        </div>
        <div className="sec-path" style={{ fontSize: '12px', color: 'var(--tx2)', letterSpacing: '.1em' }}>SYS://SCHEDULE</div>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <button onClick={() => { setShowEventForm(v => !v); setShowTodoForm(false) }} className="btn-primary" style={{ fontSize: '11px', padding: '4px 10px' }}>
            {showEventForm ? 'CANCEL EVENT' : '+ ADD EVENT'}
          </button>
          <button onClick={() => { setShowTodoForm(v => !v); setShowEventForm(false) }} className="btn-secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
            {showTodoForm ? 'CANCEL TODO' : '+ ADD TODO'}
          </button>
        </div>
      )}

      {isAdmin && <Notice notice={notice} />}

      {isAdmin && showEventForm && (
        <div className="hud-corner" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--acc)', letterSpacing: '.14em' }}>[ NEW EVENT ]</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--tx2)' }}>
              시작 날짜
              <input type="date" value={eventForm.startDate} onChange={e => setEventForm({ ...eventForm, startDate: e.target.value })} style={{ marginTop: '4px', background: 'var(--bg3)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '8px 10px', width: '100%' }} />
            </label>
            <label style={{ fontSize: '12px', color: 'var(--tx2)' }}>
              종료 날짜
              <input type="date" value={eventForm.endDate} onChange={e => setEventForm({ ...eventForm, endDate: e.target.value })} style={{ marginTop: '4px', background: 'var(--bg3)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '8px 10px', width: '100%' }} />
            </label>
          </div>
          <input value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="제목" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '8px 10px' }} />
          <textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder="설명" rows={3} style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '8px 10px', resize: 'vertical' }} />
          <select value={eventForm.color} onChange={e => setEventForm({ ...eventForm, color: e.target.value })} style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '8px 10px' }}>
            {EVENT_COLORS.map(color => <option key={color} value={color} style={{ color: 'var(--bg)' }}>{color}</option>)}
          </select>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            {eventEditId ? (
              <button onClick={() => { setEventEditId(null); setShowEventForm(false); setEventForm({ startDate: selected, endDate: selected, title: '', description: '', color: EVENT_COLORS[0] }) }} className="btn-secondary" style={{ fontSize: '12px' }}>CANCEL EDIT</button>
            ) : (
              <button onClick={() => setShowEventForm(false)} className="btn-secondary" style={{ fontSize: '12px' }}>CANCEL</button>
            )}
            <button onClick={addEvent} disabled={saving} className="btn-primary" style={{ fontSize: '12px' }}>{saving ? 'COMMITTING...' : eventEditId ? './UPDATE' : './SAVE'}</button>
          </div>
        </div>
      )}

      {isAdmin && showTodoForm && (
        <div className="hud-corner" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--acc3)', letterSpacing: '.14em' }}>[ NEW TODO ]</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--tx2)' }}>
              시작 날짜
              <input type="date" value={todoForm.startDate} onChange={e => setTodoForm({ ...todoForm, startDate: e.target.value })} style={{ marginTop: '4px', background: 'var(--bg3)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '8px 10px', width: '100%' }} />
            </label>
            <label style={{ fontSize: '12px', color: 'var(--tx2)' }}>
              종료 날짜
              <input type="date" value={todoForm.endDate} onChange={e => setTodoForm({ ...todoForm, endDate: e.target.value })} style={{ marginTop: '4px', background: 'var(--bg3)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '8px 10px', width: '100%' }} />
            </label>
          </div>
          <input value={todoForm.content} onChange={e => setTodoForm({ ...todoForm, content: e.target.value })} placeholder="할 일" style={{ background: 'var(--bg3)', border: '1px solid var(--bd)', color: 'var(--tx)', padding: '8px 10px' }} />
          <label style={{ fontSize: '13px', color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={todoForm.done} onChange={e => setTodoForm({ ...todoForm, done: e.target.checked })} />
            완료됨
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            {todoEditId ? (
              <button onClick={() => { setTodoEditId(null); setShowTodoForm(false); setTodoForm({ startDate: selected, endDate: selected, content: '', done: false }) }} className="btn-secondary" style={{ fontSize: '12px' }}>CANCEL EDIT</button>
            ) : (
              <button onClick={() => setShowTodoForm(false)} className="btn-secondary" style={{ fontSize: '12px' }}>CANCEL</button>
            )}
            <button onClick={addTodo} disabled={saving} className="btn-primary" style={{ fontSize: '12px' }}>{saving ? 'COMMITTING...' : todoEditId ? './UPDATE' : './SAVE'}</button>
          </div>
        </div>
      )}

      <div className="split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* 왼쪽: 캘린더 */}
        <div className="hud-corner" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--acc)', cursor: 'pointer', fontSize: '20px' }}>‹</button>
            <span style={{ fontSize: '15px', color: 'var(--txw)', fontWeight: 700, letterSpacing: '.1em' }}>
              {viewYear} {MONTHS[viewMonth]}
            </span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--acc)', cursor: 'pointer', fontSize: '20px' }}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: i === 0 || i === 6 ? 'var(--acc2)' : 'var(--tx2)', padding: '4px 0', letterSpacing: '.04em' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />
              const dateStr = toDateStr(viewYear, viewMonth, day)
              const isToday = dateStr === toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
              const isSel   = dateStr === selected
              const hasEv   = eventDates.has(dateStr)
              const hasTodo = todoDates.has(dateStr)
              const col     = i % 7
              return (
                <div key={day} onClick={() => setSelected(dateStr)}
                  style={{
                    textAlign: 'center', padding: '7px 2px', cursor: 'pointer', position: 'relative',
                    background: isSel ? 'var(--acc)' : isToday ? 'color-mix(in srgb, var(--acc) 15%, transparent)' : 'transparent',
                    border: isSel ? '1px solid var(--acc)' : '1px solid transparent',
                    borderRadius: '2px',
                    color: isSel ? 'var(--bg)' : col === 0 || col === 6 ? 'var(--acc2)' : 'var(--tx)',
                    fontSize: '13px', fontWeight: isToday ? 700 : 400,
                    transition: 'background .15s',
                  }}
                >
                  {day}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '2px', minHeight: '5px' }}>
                    {hasEv  && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSel ? 'var(--bg)' : 'var(--acc2)' }} />}
                    {hasTodo && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: isSel ? 'var(--bg)' : 'var(--acc3)' }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 오른쪽: 선택된 날 상세 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div style={{ fontSize: '14px', color: 'var(--acc)', letterSpacing: '.12em', fontWeight: 700 }}>
            {selected} {DAYS[new Date(selected + 'T00:00:00').getDay()]}
          </div>

          {/* 이벤트 */}
          <div className="hud-corner" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1rem' }}>
            <div style={{ fontSize: '12px', color: 'var(--acc2)', letterSpacing: '.14em', marginBottom: '.8rem' }}>[ EVENTS ]</div>

            {selectedEvents.length === 0 && (
              <div style={{ fontSize: '13px', color: 'var(--tx2)' }}>// 이벤트 없음</div>
            )}
            {selectedEvents.map(e => (
              <div key={e.id} style={{ borderLeft: `2px solid ${e.color}`, paddingLeft: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '14px', color: 'var(--txw)', fontWeight: 700 }}>{e.title}</div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => startEditEvent(e)} style={{ background: 'none', border: '1px solid var(--bd)', color: 'var(--tx2)', cursor: 'pointer', fontSize: '11px', padding: '2px 8px', fontFamily: 'inherit' }}>EDIT</button>
                      <button onClick={() => deleteEvent(e.id)} style={{ background: 'none', border: 'none', color: 'var(--acc4)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                    </div>
                  )}
                </div>
                {e.description && <div style={{ fontSize: '12px', color: 'var(--tx2)', marginTop: '2px' }}>{e.description}</div>}
              </div>
            ))}
          </div>

          {/* 투두 */}
          <div className="hud-corner" style={{ background: 'var(--bg2)', border: '1px solid var(--bd)', padding: '1rem' }}>
            <div style={{ fontSize: '12px', color: 'var(--acc3)', letterSpacing: '.14em', marginBottom: '.8rem' }}>[ TODO ]</div>

            {selectedTodos.length === 0 && (
              <div style={{ fontSize: '13px', color: 'var(--tx2)' }}>// 투두 없음</div>
            )}
            {selectedTodos.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <button
                    type="button"
                    onClick={() => toggleTodo(t.id)}
                    disabled={!isAdmin || saving}
                    aria-label={`${t.content} ${t.done ? '미완료로 표시' : '완료로 표시'}`}
                    style={{ width: '18px', height: '18px', border: `1px solid ${t.done ? 'var(--acc2)' : 'var(--bd)'}`, background: t.done ? 'var(--acc2)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, cursor: isAdmin && !saving ? 'pointer' : 'default' }}
                  >
                    {t.done && <span style={{ fontSize: '11px', color: 'var(--bg)', fontWeight: 700 }}>✓</span>}
                  </button>
                  <span style={{ fontSize: '14px', color: t.done ? 'var(--tx2)' : 'var(--tx)', textDecoration: t.done ? 'line-through' : 'none', flex: 1, fontFamily: 'sans-serif' }}>{t.content}</span>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => startEditTodo(t)} style={{ background: 'none', border: '1px solid var(--bd)', color: 'var(--tx2)', cursor: 'pointer', fontSize: '11px', padding: '2px 8px', fontFamily: 'inherit' }}>EDIT</button>
                    <button onClick={() => deleteTodo(t.id)} style={{ background: 'none', border: 'none', color: 'var(--acc4)', cursor: 'pointer', fontSize: '13px' }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
