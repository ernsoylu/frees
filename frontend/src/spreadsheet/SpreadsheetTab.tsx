import { useMemo, useRef, useState } from 'react'
import { Workbook } from '@fortune-sheet/react'
import type { WorkbookInstance } from '@fortune-sheet/react/dist/components/Workbook'
import '@fortune-sheet/react/dist/index.css'
import { type SpreadsheetSpec, emptySpreadsheetData } from './types'
import { Button, Group, Modal, TextInput, Switch } from '@mantine/core'
import { IconTablePlus, IconLink } from '@tabler/icons-react'
import { ParamTableSpec } from '../tables'
import { newParamRow } from '../ParametricTableTab'

interface Props {
  singleSpreadsheetId: string
  spreadsheets: SpreadsheetSpec[]
  onSpreadsheetsChange: (specs: SpreadsheetSpec[]) => void
  onCreateTable?: (table: ParamTableSpec) => void
}

export default function SpreadsheetTab({ singleSpreadsheetId, spreadsheets, onSpreadsheetsChange, onCreateTable }: Props) {
  const spec = spreadsheets.find((s) => s.id === singleSpreadsheetId)
  const workbookRef = useRef<WorkbookInstance>(null)
  const [showBindModal, setShowBindModal] = useState(false)
  const [bindVarName, setBindVarName] = useState('')
  const [bindType, setBindType] = useState<'input' | 'result'>('input')
  
  const data = useMemo(() => {
    if (!spec || !spec.sheets || spec.sheets.length === 0) {
      return emptySpreadsheetData()
    }
    return spec.sheets
  }, [spec])

  if (!spec) {
    return (
      <div style={{ padding: 20, color: 'var(--mantine-color-dimmed)' }}>
        Spreadsheet not found.
      </div>
    )
  }

  const handleChange = (newData: unknown[]) => {
    onSpreadsheetsChange(
      spreadsheets.map((s) => (s.id === singleSpreadsheetId ? { ...s, sheets: newData } : s))
    )
  }

  const handleCreateTable = () => {
    const instance = workbookRef.current
    if (!instance) return
    const selection = instance.getSelection()
    if (!selection || selection.length === 0) return

    const { row, column } = selection[0]
    const [startRow, endRow] = row
    const [startCol, endCol] = column

    if (startRow >= endRow) return // Need at least header + 1 row
    
    // Get headers
    const vars: string[] = []
    for (let c = startCol; c <= endCol; c++) {
      const cell = instance.getCellValue(startRow, c)
      vars.push(cell?.v || `Var${c - startCol + 1}`)
    }

    // Get rows
    const rows = []
    for (let r = startRow + 1; r <= endRow; r++) {
      const paramRow = newParamRow()
      for (let c = startCol; c <= endCol; c++) {
        const cell = instance.getCellValue(r, c)
        if (cell && cell.v !== undefined && cell.v !== null) {
          paramRow.values[vars[c - startCol]] = String(cell.v)
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
    const instance = workbookRef.current
    if (!instance) return
    const selection = instance.getSelection()
    if (!selection || selection.length === 0) return

    setBindType(type)
    setShowBindModal(true)
  }

  const confirmBind = () => {
    const instance = workbookRef.current
    if (!instance) return
    const selection = instance.getSelection()
    if (!selection || selection.length === 0) return
    const name = instance.getSheet().name || 'Sheet1'
    const { row, column } = selection[0]
    
    const r = row[0]
    const c = column[0]
    
    let colStr = ''
    let tempC = c
    while (tempC >= 0) {
      colStr = String.fromCharCode(65 + (tempC % 26)) + colStr
      tempC = Math.floor(tempC / 26) - 1
    }
    const a1 = `${colStr}${r + 1}`
    
    const refStr = `${name}!${a1}`

    const key = bindType === 'input' ? 'bindings' : 'resultBindings'
    onSpreadsheetsChange(
      spreadsheets.map((s) => (s.id === singleSpreadsheetId ? { ...s, [key]: { ...s[key], [bindVarName]: refStr } } : s))
    )
    setShowBindModal(false)
    setBindVarName('')
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Group p="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
        <Button size="xs" variant="light" leftSection={<IconTablePlus size={14} />} onClick={handleCreateTable} disabled={!onCreateTable}>
          Create Table from Selection
        </Button>
        <Button size="xs" variant="light" leftSection={<IconLink size={14} />} color="orange" onClick={() => handleBindVariable('input')}>
          Bind as Input
        </Button>
        <Button size="xs" variant="light" leftSection={<IconLink size={14} />} color="teal" onClick={() => handleBindVariable('result')}>
          Bind as Result
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
      <div style={{ flex: 1, minHeight: 0 }} className="fortune-sheet-container">
        <Workbook
          ref={workbookRef}
          data={data as any}
          onChange={handleChange as any}
          showToolbar={true}
          showFormulaBar={true}
          showSheetTabs={true}
          lang="en"
        />
      </div>

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
