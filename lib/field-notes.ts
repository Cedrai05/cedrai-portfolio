export const FIELD_NOTES_KEY = 'cedrai-field-notes-v1'
export const FIELD_NOTES_CHANGED = 'cedrai:field-notes-changed'

export type FieldNotes = {
  saved: string[]
  progress: Record<string, number>
  last: string
}

export function readFieldNotes(): FieldNotes {
  const empty: FieldNotes = { saved: [], progress: {}, last: '' }
  if (typeof window === 'undefined') return empty
  try {
    const value = JSON.parse(localStorage.getItem(FIELD_NOTES_KEY) || '{}')
    return {
      saved: Array.isArray(value.saved) ? value.saved.filter((slug: unknown): slug is string => typeof slug === 'string') : [],
      progress: value.progress && typeof value.progress === 'object' && !Array.isArray(value.progress) ? value.progress : {},
      last: typeof value.last === 'string' ? value.last : '',
    }
  } catch {
    return empty
  }
}

export function setFieldNoteSaved(slug: string, saved: boolean): boolean {
  const notes = readFieldNotes()
  notes.saved = saved ? [...new Set([...notes.saved, slug])] : notes.saved.filter(item => item !== slug)
  try {
    localStorage.setItem(FIELD_NOTES_KEY, JSON.stringify(notes))
    window.dispatchEvent(new Event(FIELD_NOTES_CHANGED))
    return true
  } catch {
    return false
  }
}
