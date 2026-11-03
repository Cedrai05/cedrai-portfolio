import { marked } from 'marked'

export type TableAlignment = 'left' | 'center' | 'right' | null
export type BlogTable = { headers: string[]; rows: string[][]; align: TableAlignment[] }
export type BlogTableBlock = BlogTable & { start: number; end: number }

export function findBlogTable(source: string, position: number): BlogTableBlock | null {
  let start = 0
  for (const token of marked.lexer(source, { gfm: true })) {
    const end = start + token.raw.length
    if (token.type === 'table' && position >= start && position <= end) {
      return {
        start,
        end,
        headers: token.header.map((cell: { text: string }) => cell.text),
        rows: token.rows.map((row: { text: string }[]) => row.map(cell => cell.text)),
        align: token.align as TableAlignment[],
      }
    }
    start = end
  }
  return null
}

export function serializeBlogTable(table: BlogTable): string {
  const cell = (value: string) => value.replace(/\s*[\r\n]+\s*/g, ' ').trim().replace(/\|/g, '\\|')
  const line = (values: string[]) => `| ${values.map(cell).join(' | ')} |`
  const divider = table.headers.map((_, index) => {
    switch (table.align[index]) {
      case 'left': return ':---'
      case 'center': return ':---:'
      case 'right': return '---:'
      default: return '---'
    }
  })
  return [line(table.headers), line(divider), ...table.rows.map(row => line(table.headers.map((_, index) => row[index] ?? '')))].join('\n')
}
