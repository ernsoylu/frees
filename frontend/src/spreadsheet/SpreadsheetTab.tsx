import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataSheetGrid, keyColumn, textColumn } from 'react-datasheet-grid'
import type { Column } from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
import './theme.css'
import { type SpreadsheetSpec, emptySpreadsheetData } from './types'
import { Button, Group, Modal, TextInput, Switch, ActionIcon, Tooltip } from '@mantine/core'
import { IconTablePlus, IconLink, IconDownload, IconPlus, IconX } from '@tabler/icons-react'
import { ParamTableSpec } from '../tables'
import { newParamRow } from '../ParametricTableTab'

interface Props {
  singleSpreadsheetId: string
  spreadsheets: SpreadsheetSpec[]
  onSpreadsheetsChange: (specs: SpreadsheetSpec[]) => void
  onCreateTable?: (table: ParamTableSpec) => void
}

// react-datasheet-grid renders an array of plain row objects keyed by column id.
// The rest of frees (App auto-sync, ssheetResolver, bindings, CSV export, linked
// tables) speaks the legacy FortuneSheet `celldata` shape — `{ r, c, v: { v, m, …style } }`.
// We keep `celldata` as the canonical *stored* format and convert it to/from DSG rows
// here, so swapping the grid library touched only this file.

type GridRow = Record<string, string | null>
// DSG's Selection type isn't exported; mirror its shape (col/row are 0-based indices).
type GridSelection = { min: { col: number; row: number }; max: { col: number; row: number } }

// A free-form grid always shows at least this many rows/cols; it grows past the
// furthest populated cell so there's room to type beyond existing data.
const COL_MIN = 16
const ROW_MIN = 200
const COL_BUFFER = 4
const ROW_BUFFER = 20

function colName(c: number): string {
  let s = ''
  let t = c
  while (t >= 0) {
    s = String.fromCharCode(65 + (t % 26)) + s
    t = Math.floor(t / 26) - 1
  }
  return s
}

function colIndex(name: string): number {
  let c = 0
  for (let i = 0; i < name.length; i++) c = c * 26 + (name.charCodeAt(i) - 64)
  return c - 1
}

function sheetDims(cells: any[]): { rows: number; cols: number } {
  let maxR = -1
  let maxC = -1
  for (const cd of cells) {
    if (cd.r > maxR) maxR = cd.r
    if (cd.c > maxC) maxC = cd.c
  }
  return {
    rows: Math.max(ROW_MIN, maxR + 1 + ROW_BUFFER),
    cols: Math.max(COL_MIN, maxC + 1 + COL_BUFFER),
  }
}

function celldataToRows(cells: any[], nRows: number): GridRow[] {
  const rows: GridRow[] = Array.from({ length: nRows }, () => ({}))
  for (const cd of cells) {
    if (cd.r < 0 || cd.r >= nRows) continue
    const disp = cd.v?.m ?? cd.v?.v ?? ''
    rows[cd.r][colName(cd.c)] = disp === null || disp === undefined ? '' : String(disp)
  }
  return rows
}

// Rebuild celldata from edited DSG rows, preserving any style metadata that lived on
// the previous cell (bold headers from the Variable Inspector export, etc.).
function rowsToCelldata(rows: GridRow[], prevCells: any[]): any[] {
  const prev = new Map<string, any>()
  for (const cd of prevCells) prev.set(`${cd.r}:${cd.c}`, cd)

  const out: any[] = []
  rows.forEach((row, r) => {
    for (const colKey of Object.keys(row)) {
      const raw = row[colKey]
      if (raw === '' || raw === null || raw === undefined) continue
      const c = colIndex(colKey)
      const trimmed = String(raw).trim()
      const num = Number(trimmed)
      const isNum = trimmed !== '' && !Number.isNaN(num)
      const prevV = prev.get(`${r}:${c}`)?.v
      const style = prevV && typeof prevV === 'object' ? { ...prevV } : {}
      delete style.v
      delete style.m
      out.push({ r, c, v: { ...style, v: isNum ? num : String(raw), m: String(raw) } })
    }
  })
  return out
}

export default function SpreadsheetTab({ singleSpreadsheetId, spreadsheets, onSpreadsheetsChange, onCreateTable }: Props) {
  const spec = spreadsheets.find((s) => s.id === singleSpreadsheetId)
  const [activeSheet, setActiveSheet] = useState(0)
  const [selection, setSelection] = useState<GridSelection | null>(null)
  const [showBindModal, setShowBindModal] = useState(false)
  const [bindVarName, setBindVarName] = useState('')
  const [bindType, setBindType] = useState<'input' | 'result'>('input')

  // DSG (react-window under the hood) needs an explicit pixel height.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [gridHeight, setGridHeight] = useState(400)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setGridHeight(el.clientHeight))
    ro.observe(el)
    setGridHeight(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  const sheets = useMemo(
    () => (!spec || !spec.sheets || spec.sheets.length === 0 ? emptySpreadsheetData() : spec.sheets) as any[],
    [spec]
  )
  const activeIndex = Math.min(activeSheet, sheets.length - 1)
  const activeCells: any[] = sheets[activeIndex]?.celldata ?? []

  const { rows, columns } = useMemo(() => {
    const { rows: nRows, cols: nCols } = sheetDims(activeCells)
    const gridRows = celldataToRows(activeCells, nRows)
    const cols: Column<GridRow, any, any>[] = Array.from({ length: nCols }, (_, c) => {
      const id = colName(c)
      return { ...keyColumn<GridRow, string>(id, textColumn), id, title: id, minWidth: 70, basis: 90 }
    })
    return { rows: gridRows, columns: cols }
  }, [activeCells])

  const writeSheetCells = useCallback(
    (sheetIdx: number, newCells: any[]) => {
      onSpreadsheetsChange(
        spreadsheets.map((s) => {
          if (s.id !== singleSpreadsheetId) return s
          const newSheets = (s.sheets as any[]).map((sh, i) =>
            i === sheetIdx ? { ...sh, celldata: newCells } : sh
          )
          return { ...s, sheets: newSheets }
        })
      )
    },
    [spreadsheets, singleSpreadsheetId, onSpreadsheetsChange]
  )

  const handleChange = useCallback(
    (newRows: GridRow[]) => {
      writeSheetCells(activeIndex, rowsToCelldata(newRows, activeCells))
    },
    [writeSheetCells, activeIndex, activeCells]
  )

  if (!spec) {
    return (
      <div style={{ padding: 20, color: 'var(--mantine-color-dimmed)' }}>
        Spreadsheet not found.
      </div>
    )
  }

  const cellAt = (r: number, c: number): string => rows[r]?.[colName(c)] ?? ''

  const addSheet = () => {
    const n = sheets.length
    const newSheet = {
      name: `Sheet${n + 1}`,
      id: crypto.randomUUID(),
      status: 0,
      order: n,
      celldata: [],
      config: {},
    }
    onSpreadsheetsChange(
      spreadsheets.map((s) =>
        s.id === singleSpreadsheetId ? { ...s, sheets: [...(s.sheets as any[]), newSheet] } : s
      )
    )
    setActiveSheet(n)
    setSelection(null)
  }

  const deleteSheet = (idx: number) => {
    if (sheets.length <= 1) return
    onSpreadsheetsChange(
      spreadsheets.map((s) =>
        s.id === singleSpreadsheetId
          ? { ...s, sheets: (s.sheets as any[]).filter((_, i) => i !== idx) }
          : s
      )
    )
    setActiveSheet((a) => Math.max(0, a >= idx ? a - 1 : a))
    setSelection(null)
  }

  const handleCreateTable = () => {
    if (!selection) return
    const startRow = selection.min.row
    const endRow = selection.max.row
    const startCol = selection.min.col
    const endCol = selection.max.col
    if (startRow >= endRow) return // Need at least header + 1 row

    const vars: string[] = []
    for (let c = startCol; c <= endCol; c++) {
      vars.push(cellAt(startRow, c) || `Var${c - startCol + 1}`)
    }

    const tableRows = []
    for (let r = startRow + 1; r <= endRow; r++) {
      const paramRow = newParamRow()
      for (let c = startCol; c <= endCol; c++) {
        const val = cellAt(r, c)
        if (val !== '') paramRow.values[vars[c - startCol]] = val
      }
      tableRows.push(paramRow)
    }

    const newTable: ParamTableSpec = {
      id: crypto.randomUUID(),
      kind: 'parametric',
      name: `Table from ${spec.name}`,
      vars,
      rows: tableRows,
      results: [],
      stats: null,
      checkResult: null,
      checkMessage: '',
      source: 'gui'
    }

    onCreateTable?.(newTable)
  }

  const handleBindVariable = (type: 'input' | 'result') => {
    if (!selection) return
    setBindType(type)
    setShowBindModal(true)
  }

  const confirmBind = () => {
    if (!selection) return
    const name = sheets[activeIndex]?.name || 'Sheet1'
    const a1 = `${colName(selection.min.col)}${selection.min.row + 1}`
    const refStr = `${name}!${a1}`

    const key = bindType === 'input' ? 'bindings' : 'resultBindings'
    onSpreadsheetsChange(
      spreadsheets.map((s) => (s.id === singleSpreadsheetId ? { ...s, [key]: { ...s[key], [bindVarName]: refStr } } : s))
    )
    setShowBindModal(false)
    setBindVarName('')
  }

  const handleExportCSV = () => {
    const sheet = sheets[activeIndex]
    if (!sheet || !sheet.celldata) return

    let maxR = 0
    let maxC = 0
    for (const cell of sheet.celldata) {
      if (cell.r > maxR) maxR = cell.r
      if (cell.c > maxC) maxC = cell.c
    }

    const csvRows: string[][] = Array.from({ length: maxR + 1 }, () => Array(maxC + 1).fill(''))
    for (const cell of sheet.celldata) {
      if (cell.v?.m !== undefined) {
        let val = String(cell.v.m).replace(/"/g, '""')
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val}"`
        }
        csvRows[cell.r][cell.c] = val
      }
    }

    const csvStr = csvRows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csvStr], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${spec.name || 'spreadsheet'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Group p="xs" gap="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Button size="xs" variant="light" leftSection={<IconTablePlus size={14} />} onClick={handleCreateTable} disabled={!onCreateTable || !selection}>
          Create Table from Selection
        </Button>
        <Button size="xs" variant="light" leftSection={<IconLink size={14} />} color="orange" onClick={() => handleBindVariable('input')} disabled={!selection}>
          Bind as Input
        </Button>
        <Button size="xs" variant="light" leftSection={<IconLink size={14} />} color="teal" onClick={() => handleBindVariable('result')} disabled={!selection}>
          Bind as Result
        </Button>
        <Button size="xs" variant="light" leftSection={<IconDownload size={14} />} color="blue" onClick={handleExportCSV}>
          Export CSV
        </Button>
        <Switch
          label="Auto-sync Results"
          size="sm"
          checked={spec.autoSync || false}
          onChange={(e) => {
            const val = e.currentTarget.checked
            onSpreadsheetsChange(spreadsheets.map((s) => (s.id === spec.id ? { ...s, autoSync: val } : s)))
          }}
        />
      </Group>

      <div ref={wrapRef} style={{ flex: 1, minHeight: 0 }} className="frees-dsg">
        <DataSheetGrid<GridRow>
          value={rows}
          onChange={handleChange}
          columns={columns}
          height={gridHeight}
          lockRows
          onSelectionChange={({ selection: sel }) => setSelection(sel)}
        />
      </div>

      <Group gap={2} px="xs" py={4} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        {sheets.map((sh, i) => (
          <Group key={sh.id ?? i} gap={2} wrap="nowrap">
            <Button
              size="compact-xs"
              variant={i === activeIndex ? 'filled' : 'subtle'}
              color="gray"
              onClick={() => {
                setActiveSheet(i)
                setSelection(null)
              }}
            >
              {sh.name || `Sheet${i + 1}`}
            </Button>
            {i === activeIndex && sheets.length > 1 && (
              <Tooltip label="Delete sheet" withArrow>
                <ActionIcon size="xs" variant="subtle" color="red" onClick={() => deleteSheet(i)}>
                  <IconX size={12} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        ))}
        <Tooltip label="Add sheet" withArrow>
          <ActionIcon size="sm" variant="subtle" onClick={addSheet} ml={4}>
            <IconPlus size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Modal opened={showBindModal} onClose={() => setShowBindModal(false)} title={`Bind Cell as ${bindType === 'input' ? 'Input' : 'Result'}`} size="sm">
        <TextInput
          label="Variable Name"
          placeholder="e.g. T_in"
          value={bindVarName}
          onChange={(e) => setBindVarName(e.currentTarget.value)}
          data-autofocus
        />
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setShowBindModal(false)}>Cancel</Button>
          <Button onClick={confirmBind} disabled={!bindVarName.trim()}>Bind</Button>
        </Group>
      </Modal>
    </div>
  )
}
