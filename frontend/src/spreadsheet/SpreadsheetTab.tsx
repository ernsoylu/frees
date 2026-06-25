import { useCallback, useEffect, useRef, useState } from 'react'
import { Spreadsheet, Worksheet } from '@jspreadsheet-ce/react'
import 'jsuites/dist/jsuites.css'
import 'jspreadsheet-ce/dist/jspreadsheet.css'
import 'material-icons/iconfont/material-icons.css' // toolbar glyphs (self-hosted, no CDN)
import './theme.css'
import { type SpreadsheetSpec, emptySpreadsheetData } from './types'
import { Button, Group, Modal, TextInput, Switch, Text, Select } from '@mantine/core'
import { IconTablePlus, IconLink, IconDownload } from '@tabler/icons-react'
import { ParamTableSpec } from '../tables'
import { newParamRow } from '../ParametricTableTab'

interface Props {
  singleSpreadsheetId: string
  spreadsheets: SpreadsheetSpec[]
  onSpreadsheetsChange: (specs: SpreadsheetSpec[]) => void
  onCreateTable?: (table: ParamTableSpec) => void
  availableVariables?: string[]
}

// jspreadsheet speaks a 2D `data` array plus a separate `style` map (CSS strings
// keyed by A1). The rest of frees (App auto-sync, ssheetResolver, bindings, CSV,
// linked tables) speaks the legacy `celldata` shape `{ r, c, v: { v, m, f? } }`.
// We keep `celldata` as the canonical *stored* format and convert here, so the
// grid library stays isolated to this file. Formulas live in `v.f`, the computed
// value in `v.v` (what the resolver/bindings read), the display string in `v.m`.

const MIN_ROWS = 40
const MIN_COLS = 12

function colName(c: number): string {
  let s = ''
  let t = c
  while (t >= 0) {
    s = String.fromCharCode(65 + (t % 26)) + s
    t = Math.floor(t / 26) - 1
  }
  return s
}

function celldataToMatrix(cells: any[], minRows: number, minCols: number): any[][] {
  let maxR = minRows - 1
  let maxC = minCols - 1
  for (const cd of cells) {
    if (cd.r > maxR) maxR = cd.r
    if (cd.c > maxC) maxC = cd.c
  }
  const m: any[][] = Array.from({ length: maxR + 1 }, () => Array(maxC + 1).fill(''))
  for (const cd of cells) {
    const v = cd.v ?? {}
    m[cd.r][cd.c] = v.f ?? v.m ?? v.v ?? ''
  }
  return m
}

// jspreadsheet's getStyle() returns an entry for EVERY cell — most just the
// per-cell default it stamps on the whole grid. Keep only cells with real
// formatting so the persisted style map (and .frees file) stays lean.
function pruneStyles(styles: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k in styles) {
    const meaningful = (styles[k] || '')
      .replace(/text-align:\s*center;?/gi, '')
      .replace(/overflow:\s*hidden;?/gi, '')
      .replace(/[\s;]+/g, '')
    if (meaningful.length > 0) out[k] = styles[k]
  }
  return out
}

// raw = getData(false) (formulas preserved); proc = getData(true) (computed values).
function matrixToCelldata(raw: any[][], proc: any[][]): any[] {
  const out: any[] = []
  for (let r = 0; r < raw.length; r++) {
    const row = raw[r]
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      const rv = row[c]
      if (rv === '' || rv === null || rv === undefined) continue
      const rawStr = String(rv)
      const isFormula = rawStr.startsWith('=')
      const pv = proc[r]?.[c]
      const procStr = pv === null || pv === undefined ? rawStr : String(pv)
      const num = Number(procStr)
      const computed = procStr.trim() !== '' && !Number.isNaN(num) ? num : procStr
      const cell: any = { r, c, v: { v: computed, m: procStr } }
      if (isFormula) cell.v.f = rawStr
      out.push(cell)
    }
  }
  return out
}

export default function SpreadsheetTab({ singleSpreadsheetId, spreadsheets, onSpreadsheetsChange, onCreateTable, availableVariables = [] }: Props) {
  const spec = spreadsheets.find((s) => s.id === singleSpreadsheetId)
  const ssRef = useRef<any>(null)
  const [showBindModal, setShowBindModal] = useState(false)
  const [bindVarName, setBindVarName] = useState('')
  const [bindType, setBindType] = useState<'input' | 'result'>('input')
  const [hasSelection, setHasSelection] = useState(false)
  const [selectedCell, setSelectedCell] = useState<string>('')

  // Last selection reported by jspreadsheet's onselection — kept in a ref so the
  // Mantine toolbar buttons (which live outside the grid) can act on it even after
  // the grid blurs.
  const selRef = useRef<{ ws: number; x1: number; y1: number; x2: number; y2: number } | null>(null)
  const activeWsRef = useRef(0)

  // jspreadsheet is imperative: it initializes from these props once and is then
  // driven through the ref. Capture the initial worksheet config a single time so
  // React never re-mounts the grid out from under the user.
  const initialRef = useRef<any[] | null>(null)
  if (!initialRef.current) {
    const sheets = (!spec || !spec.sheets || spec.sheets.length === 0
      ? emptySpreadsheetData()
      : spec.sheets) as any[]
    initialRef.current = sheets.map((sh, i) => ({
      worksheetName: sh.name || `Sheet${i + 1}`,
      data: celldataToMatrix(sh.celldata ?? [], MIN_ROWS, MIN_COLS),
      style: sh.styles ?? {},
      minDimensions: [MIN_COLS, MIN_ROWS],
    }))
  }

  // Reference to the exact sheets array we last wrote, so the external-update
  // effect can tell our own writes apart from App's auto-sync / linked-table writes.
  const selfWriteRef = useRef<unknown[] | null>(null)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const syncOut = useCallback(() => {
    const insts = ssRef.current
    if (!insts || !insts.length) return
    const prevSheets = (spec?.sheets ?? []) as any[]
    const newSheets = insts.map((ws: any, i: number) => {
      const raw = ws.getData(false)
      const proc = ws.getData(true)
      const styles = pruneStyles(ws.getStyle() || {})
      const prev = prevSheets[i] ?? {}
      return {
        name: ws.options?.worksheetName || prev.name || `Sheet${i + 1}`,
        id: prev.id ?? crypto.randomUUID(),
        status: i === activeWsRef.current ? 1 : 0,
        order: i,
        celldata: matrixToCelldata(raw, proc),
        styles,
        config: prev.config ?? {},
      }
    })
    selfWriteRef.current = newSheets
    onSpreadsheetsChange(
      spreadsheets.map((s) => (s.id === singleSpreadsheetId ? { ...s, sheets: newSheets } : s))
    )
  }, [spec, spreadsheets, singleSpreadsheetId, onSpreadsheetsChange])

  const scheduleSync = useCallback(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(syncOut, 300)
  }, [syncOut])

  // Flush any pending edits when the window unmounts (dock close / tab switch).
  useEffect(() => {
    return () => {
      if (syncTimer.current) {
        clearTimeout(syncTimer.current)
        syncOut()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push external celldata changes (auto-sync results, linked-table sync) into the
  // live grid. Skips our own writes by reference identity.
  useEffect(() => {
    const insts = ssRef.current
    if (!insts || !spec) return
    if (spec.sheets === selfWriteRef.current) return
    ;(spec.sheets as any[]).forEach((sh, i) => {
      const ws = insts[i]
      if (!ws) return
      const target = celldataToMatrix(sh.celldata ?? [], 0, 0)
      const current = ws.getData(false)
      for (let r = 0; r < target.length; r++) {
        for (let c = 0; c < target[r].length; c++) {
          const tv = target[r][c]
          const cv = current[r]?.[c]
          if (String(tv ?? '') !== String(cv ?? '')) {
            ws.setValueFromCoords(c, r, tv, true)
          }
        }
      }
    })
  }, [spec])

  if (!spec) {
    return (
      <div style={{ padding: 20, color: 'var(--mantine-color-dimmed)' }}>
        Spreadsheet not found.
      </div>
    )
  }

  const onselection = (instance: any, x1: number, y1: number, x2: number, y2: number) => {
    const insts = ssRef.current
    const idx = insts ? insts.indexOf(instance) : 0
    const ws = idx >= 0 ? idx : 0
    activeWsRef.current = ws
    selRef.current = { ws, x1, y1, x2, y2 }
    setHasSelection(true)
    setSelectedCell(`${sheetNameAt(ws)}!${colName(x1)}${y1 + 1}`)
    scheduleSync() // capture any formatting applied just before moving the selection
  }

  const sheetNameAt = (i: number): string =>
    (spec.sheets as any[])[i]?.name || ssRef.current?.[i]?.options?.worksheetName || `Sheet${i + 1}`

  const handleCreateTable = () => {
    const sel = selRef.current
    const ws = ssRef.current?.[sel?.ws ?? 0]
    if (!sel || !ws) return
    const startRow = sel.y1
    const endRow = sel.y2
    const startCol = sel.x1
    const endCol = sel.x2
    if (startRow >= endRow) return // need header + at least one row

    const vars: string[] = []
    for (let c = startCol; c <= endCol; c++) {
      vars.push(String(ws.getValueFromCoords(c, startRow, true) || `Var${c - startCol + 1}`))
    }

    const rows = []
    for (let r = startRow + 1; r <= endRow; r++) {
      const paramRow = newParamRow()
      for (let c = startCol; c <= endCol; c++) {
        const val = ws.getValueFromCoords(c, r, true)
        if (val !== '' && val !== null && val !== undefined) {
          paramRow.values[vars[c - startCol]] = String(val)
        }
      }
      rows.push(paramRow)
    }

    const newTable: ParamTableSpec = {
      id: crypto.randomUUID(),
      kind: 'parametric',
      name: `Table from ${spec.name}`,
      vars,
      rows,
      results: [],
      stats: null,
      checkResult: null,
      checkMessage: '',
      source: 'gui'
    }
    onCreateTable?.(newTable)
  }

  const handleBindVariable = (type: 'input' | 'result') => {
    if (!selRef.current) return
    setBindType(type)
    setShowBindModal(true)
  }

  const confirmBind = () => {
    const sel = selRef.current
    if (!sel) return
    const refStr = `${sheetNameAt(sel.ws)}!${colName(sel.x1)}${sel.y1 + 1}`
    const key = bindType === 'input' ? 'bindings' : 'resultBindings'
    onSpreadsheetsChange(
      spreadsheets.map((s) => (s.id === singleSpreadsheetId ? { ...s, [key]: { ...s[key], [bindVarName]: refStr } } : s))
    )
    setShowBindModal(false)
    setBindVarName('')
  }

  const handleExportCSV = () => {
    const ws = ssRef.current?.[activeWsRef.current]
    if (!ws) return
    const data: any[][] = ws.getData(true)
    const csvStr = data
      .map((row) =>
        row
          .map((cell) => {
            let val = String(cell ?? '').replace(/"/g, '""')
            if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`
            return val
          })
          .join(',')
      )
      .join('\n')
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
        <Button size="xs" variant="light" leftSection={<IconTablePlus size={14} />} onClick={handleCreateTable} disabled={!onCreateTable || !hasSelection}>
          Create Table from Selection
        </Button>
        <Button size="xs" variant="light" leftSection={<IconLink size={14} />} color="orange" onClick={() => handleBindVariable('input')} disabled={!hasSelection}>
          Bind as Input
        </Button>
        {availableVariables.length > 0 && (
          <Button size="xs" variant="light" leftSection={<IconLink size={14} />} color="teal" onClick={() => handleBindVariable('result')} disabled={!hasSelection}>
            Bind as Result
          </Button>
        )}
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

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }} className="frees-jss">
        <Spreadsheet
          ref={ssRef}
          tabs
          toolbar
          onafterchanges={scheduleSync}
          onselection={onselection}
        >
          {initialRef.current.map((cfg, i) => (
            <Worksheet key={i} {...cfg} />
          ))}
        </Spreadsheet>
      </div>

      <Modal opened={showBindModal} onClose={() => setShowBindModal(false)} title={`Bind Cell as ${bindType === 'input' ? 'Input' : 'Result'}`} size="sm">
        <Text size="sm" mb="xs" c="dimmed">
          Selected Cell: <strong>{selectedCell}</strong>
        </Text>
        {bindType === 'input' ? (
          <TextInput
            label="Variable Name"
            placeholder="e.g. T_in"
            value={bindVarName}
            onChange={(e) => setBindVarName(e.currentTarget.value)}
            data-autofocus
          />
        ) : (
          <Select
            label="Variable Name"
            placeholder="Select a variable"
            data={availableVariables}
            value={bindVarName}
            onChange={(val) => setBindVarName(val ?? '')}
            searchable
            clearable
            data-autofocus
          />
        )}
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={() => setShowBindModal(false)}>Cancel</Button>
          <Button onClick={confirmBind} disabled={!bindVarName.trim()}>Bind</Button>
        </Group>
      </Modal>
    </div>
  )
}
