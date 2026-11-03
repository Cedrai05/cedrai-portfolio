'use client'
import { useEffect, useRef, useState } from 'react'
import type { BlogTable } from '@/lib/blog-table'

type Props = {
  initial: BlogTable
  existing: boolean
  onApply: (table: BlogTable) => void
  onDelete: () => void
  onClose: () => void
}

export default function BlogTableEditor({ initial, existing, onApply, onDelete, onClose }: Props) {
  const [table, setTable] = useState(initial)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    element?.querySelector('input')?.focus()
    return () => { if (element?.open) element.close() }
  }, [])

  function updateHeader(index: number, value: string) {
    setTable(current => ({ ...current, headers: current.headers.map((header, column) => column === index ? value : header) }))
  }
  function updateCell(row: number, column: number, value: string) {
    setTable(current => ({ ...current, rows: current.rows.map((cells, index) => index === row ? cells.map((cell, position) => position === column ? value : cell) : cells) }))
  }
  function addColumn() {
    setTable(current => ({ headers: [...current.headers, ''], align: [...current.align, null], rows: current.rows.map(row => [...row, '']) }))
  }
  function removeColumn(column: number) {
    setTable(current => current.headers.length === 1 ? current : {
      headers: current.headers.filter((_, index) => index !== column),
      align: current.align.filter((_, index) => index !== column),
      rows: current.rows.map(row => row.filter((_, index) => index !== column)),
    })
  }
  function addRow() {
    setTable(current => ({ ...current, rows: [...current.rows, current.headers.map(() => '')] }))
  }
  function removeRow(row: number) {
    setTable(current => current.rows.length === 1 ? current : { ...current, rows: current.rows.filter((_, index) => index !== row) })
  }

  return <dialog ref={dialog} className="blog-table-dialog" onClose={() => { if (!dialog.current?.open) onClose() }} aria-labelledby="blog-table-title">
    <div className="blog-table-dialog__heading">
      <div><p className="small-label">TABLE / EDIT</p><h2 id="blog-table-title">표 편집</h2></div>
      <button type="button" className="blog-table-dialog__close" onClick={() => dialog.current?.close()} aria-label="표 편집 닫기">×</button>
    </div>
    <p className="blog-table-dialog__help">셀을 직접 수정하고 ＋ 버튼으로 행·열을 추가하세요. × 버튼으로 삭제할 수 있습니다.</p>
    <div className="blog-table-dialog__scroll">
      <table className="blog-table-dialog__grid">
        <thead>
          <tr className="blog-table-dialog__column-actions">
            <th scope="col" className="blog-table-dialog__index">열</th>
            {table.headers.map((_, column) => <th scope="col" key={column}>
              <button type="button" onClick={() => removeColumn(column)} disabled={table.headers.length === 1} aria-label={`${column + 1}열 삭제`} title={`${column + 1}열 삭제`}>× 열 삭제</button>
            </th>)}
            <th scope="col"><button type="button" onClick={addColumn} aria-label="열 추가">＋ 열 추가</button></th>
          </tr>
          <tr>
            <th scope="col" className="blog-table-dialog__index">제목</th>
            {table.headers.map((header, column) => <th scope="col" key={column}>
              <input value={header} onChange={event => updateHeader(column, event.target.value)} aria-label={`${column + 1}열 제목`} placeholder={`열 ${column + 1}`} />
            </th>)}
            <th aria-hidden="true" />
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => <tr key={rowIndex}>
            <th scope="row" className="blog-table-dialog__index">{rowIndex + 1}</th>
            {row.map((value, column) => <td key={column}><input value={value} onChange={event => updateCell(rowIndex, column, event.target.value)} aria-label={`${rowIndex + 1}행 ${column + 1}열`} /></td>)}
            <td><button type="button" className="blog-table-dialog__remove-row" onClick={() => removeRow(rowIndex)} disabled={table.rows.length === 1} aria-label={`${rowIndex + 1}행 삭제`} title={`${rowIndex + 1}행 삭제`}>×</button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <button type="button" className="blog-table-dialog__add-row" onClick={addRow}>＋ 행 추가</button>
    <div className="blog-table-dialog__footer">
      {existing && <button type="button" className="blog-table-dialog__delete" onClick={onDelete}>표 삭제</button>}
      <button type="button" onClick={() => dialog.current?.close()}>취소</button>
      <button type="button" className="blog-table-dialog__apply" onClick={() => onApply(table)}>본문에 적용</button>
    </div>
  </dialog>
}
