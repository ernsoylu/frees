import { useMemo } from 'react'
import { Workbook } from '@fortune-sheet/react'
import '@fortune-sheet/react/dist/index.css'
import { type SpreadsheetSpec, emptySpreadsheetData } from './types'

interface Props {
  singleSpreadsheetId: string
  spreadsheets: SpreadsheetSpec[]
  onSpreadsheetsChange: (specs: SpreadsheetSpec[]) => void
}

export default function SpreadsheetTab({ singleSpreadsheetId, spreadsheets, onSpreadsheetsChange }: Props) {
  const spec = spreadsheets.find((s) => s.id === singleSpreadsheetId)
  
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

  return (
    <div style={{ height: '100%', width: '100%' }} className="fortune-sheet-container">
      <Workbook
        data={data}
        onChange={handleChange as any}
        showToolbar={true}
        showFormulaBar={true}
        showSheetTabs={true}
        lang="en"
      />
    </div>
  )
}
