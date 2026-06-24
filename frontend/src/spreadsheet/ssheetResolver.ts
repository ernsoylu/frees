import { SpreadsheetSpec } from './types'

export interface SsheetReference {
  match: string
  spreadsheetName?: string
  sheetName?: string
  range: string
}

function parseCell(ref: string): { r: number; c: number } | null {
  const match = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!match) return null
  const [, colStr, rowStr] = match
  let c = 0
  for (let i = 0; i < colStr.length; i++) {
    c = c * 26 + (colStr.charCodeAt(i) - 64)
  }
  c -= 1 // 0-indexed
  const r = parseInt(rowStr, 10) - 1
  return { r, c }
}

export function parseSsheetReferences(text: string): SsheetReference[] {
  const refs: SsheetReference[] = []
  // Match `ssheet(...)`
  // Simple regex for string literal or just range
  const regex = /ssheet\s*\(\s*(?:(?:'([^']+)'|"([^"]+)")\s*,\s*)?(?:'|")?(?:([^!'"]+)!\s*)?([A-Za-z0-9:]+)(?:'|")?\s*\)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    refs.push({
      match: match[0],
      spreadsheetName: match[1] || match[2],
      sheetName: match[3],
      range: match[4],
    })
  }
  return refs
}

function getCellValue(sheet: any, r: number, c: number): number {
  if (sheet.celldata) {
    const cell = sheet.celldata.find((cd: any) => cd.r === r && cd.c === c)
    if (cell && cell.v && typeof cell.v.v !== 'undefined') {
      const val = Number(cell.v.v)
      return isNaN(val) ? 0 : val
    }
  } else if (sheet.data && sheet.data[r] && sheet.data[r][c]) {
    const val = Number(sheet.data[r][c].v)
    return isNaN(val) ? 0 : val
  }
  return 0
}

export function resolveSsheetValues(
  refs: SsheetReference[],
  spreadsheets: SpreadsheetSpec[]
): Map<string, string> {
  const map = new Map<string, string>()

  for (const ref of refs) {
    let spec: SpreadsheetSpec | undefined
    if (ref.spreadsheetName) {
      spec = spreadsheets.find((s) => s.name.toLowerCase() === ref.spreadsheetName!.toLowerCase())
    } else {
      spec = spreadsheets[0]
    }

    if (!spec || !spec.sheets || spec.sheets.length === 0) {
      map.set(ref.match, '[0]') // fallback
      continue
    }

    let sheet: any = spec.sheets[0]
    if (ref.sheetName) {
      const found = (spec.sheets as any[]).find(
        (sh) => sh.name && sh.name.toLowerCase() === ref.sheetName!.toLowerCase()
      )
      if (found) sheet = found
    }

    const parts = ref.range.split(':')
    if (parts.length === 1) {
      // Scalar
      const cell = parseCell(parts[0])
      if (cell) {
        map.set(ref.match, String(getCellValue(sheet, cell.r, cell.c)))
      } else {
        map.set(ref.match, '0')
      }
    } else if (parts.length === 2) {
      // Range
      const start = parseCell(parts[0])
      const end = parseCell(parts[1])
      if (!start || !end) {
        map.set(ref.match, '[0]')
        continue
      }

      const minR = Math.min(start.r, end.r)
      const maxR = Math.max(start.r, end.r)
      const minC = Math.min(start.c, end.c)
      const maxC = Math.max(start.c, end.c)

      if (minR === maxR) {
        // Row vector
        const vals: number[] = []
        for (let c = minC; c <= maxC; c++) vals.push(getCellValue(sheet, minR, c))
        map.set(ref.match, `[${vals.join(', ')}]`)
      } else if (minC === maxC) {
        // Column vector
        const vals: string[] = []
        for (let r = minR; r <= maxR; r++) vals.push(String(getCellValue(sheet, r, minC)))
        map.set(ref.match, `[${vals.join('; ')}]`)
      } else {
        // Matrix
        const rows: string[] = []
        for (let r = minR; r <= maxR; r++) {
          const rowVals: number[] = []
          for (let c = minC; c <= maxC; c++) {
            rowVals.push(getCellValue(sheet, r, c))
          }
          rows.push(rowVals.join(', '))
        }
        map.set(ref.match, `[${rows.join('; ')}]`)
      }
    }
  }

  return map
}

export function substituteSsheetRefs(text: string, spreadsheets: SpreadsheetSpec[]): string {
  const refs = parseSsheetReferences(text)
  if (refs.length === 0) return text

  const replacements = resolveSsheetValues(refs, spreadsheets)
  let result = text
  // Replace each literal match. Because identical matches yield the same replacement,
  // simple global replacement per unique match is safe.
  const uniqueMatches = Array.from(new Set(refs.map(r => r.match)))
  for (const match of uniqueMatches) {
    const val = replacements.get(match)
    if (val !== undefined) {
      // Escape special characters in match for regex
      const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      result = result.replace(new RegExp(escapedMatch, 'g'), val)
    }
  }
  
  return result
}
