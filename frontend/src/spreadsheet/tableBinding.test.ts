import { describe, expect, it } from 'vitest'
import { FunctionTableSpec, toFunctionTableDtos } from '../tables'
import {
  boundColumnCount,
  isErrorValue,
  protectedRangesFor,
  RegionRead,
  sheetEditsToSpec,
  specToSheetData,
  TABLE_MAX_ROWS,
} from './tableBinding'

function spec1D(over: Partial<FunctionTableSpec> = {}): FunctionTableSpec {
  return {
    id: 't1',
    kind: 'function',
    name: 'eff',
    argName: 'Re',
    paramName: '',
    xLog: false,
    yLog: false,
    columns: [''],
    rows: [
      { x: '1', ys: ['10'] },
      { x: '2', ys: ['20'] },
    ],
    is1D: true,
    ...over,
  }
}

function spec2D(over: Partial<FunctionTableSpec> = {}): FunctionTableSpec {
  return {
    id: 't2',
    kind: 'function',
    name: 'fanCurve',
    argName: 'V',
    paramName: 'rpm',
    xLog: false,
    yLog: false,
    columns: ['1000', '2000'],
    rows: [
      { x: '0', ys: ['100', '200'] },
      { x: '1', ys: ['80', '160'] },
    ],
    is1D: false,
    ...over,
  }
}

/** Region matrices as the facade would return them for a given sheet. */
function readOf(sheet: { celldata: { r: number; c: number; v: { v: unknown; f?: string } }[] }): RegionRead {
  let maxR = 0
  let maxC = 0
  for (const cd of sheet.celldata) {
    if (cd.r > maxR) maxR = cd.r
    if (cd.c > maxC) maxC = cd.c
  }
  const values: (string | number | null)[][] = Array.from({ length: maxR + 1 }, () =>
    Array(maxC + 1).fill(null),
  )
  const formulas: string[][] = Array.from({ length: maxR + 1 }, () => Array(maxC + 1).fill(''))
  for (const cd of sheet.celldata) {
    values[cd.r][cd.c] = cd.v.v as string | number
    if (cd.v.f) formulas[cd.r][cd.c] = cd.v.f
  }
  return { values, formulas }
}

describe('specToSheetData', () => {
  it('lays out header + data anchored at A1', () => {
    const sheet = specToSheetData(spec2D())
    const at = (r: number, c: number) => sheet.celldata.find((cd) => cd.r === r && cd.c === c)?.v
    expect(at(0, 0)?.v).toBe('V')
    expect(at(0, 1)?.v).toBe(1000) // param header, numeric
    expect(at(0, 2)?.v).toBe(2000)
    expect(at(1, 0)?.v).toBe(0)
    expect(at(2, 2)?.v).toBe(160)
    expect(sheet.styles?.A1).toContain('bold')
    expect(sheet.id).toBe('t2')
    expect(sheet.name).toBe('fanCurve')
  })

  it('uses a fixed y label for 1-D tables', () => {
    const sheet = specToSheetData(spec1D())
    const b1 = sheet.celldata.find((cd) => cd.r === 0 && cd.c === 1)?.v
    expect(b1?.v).toBe('y')
  })

  it('re-applies the formula overlay as f cells (contract f)', () => {
    const sheet = specToSheetData(spec1D({ formulas: { B2: '=A2*10' } }))
    const b2 = sheet.celldata.find((cd) => cd.r === 1 && cd.c === 1)?.v
    expect(b2?.f).toBe('=A2*10')
  })

  it('emits overlay cells even when the cached value is blank', () => {
    const sheet = specToSheetData(
      spec1D({ rows: [{ x: '1', ys: [''] }], formulas: { B2: '=1/0' } }),
    )
    const b2 = sheet.celldata.find((cd) => cd.r === 1 && cd.c === 1)?.v
    expect(b2?.f).toBe('=1/0')
  })
})

describe('sheetEditsToSpec round-trip', () => {
  it('spec -> sheet -> spec is identity for values and overlay', () => {
    const spec = spec2D({ formulas: { B2: '=C2/2' } })
    const back = sheetEditsToSpec(spec, readOf(specToSheetData(spec)))
    expect(back.spec.rows).toEqual(spec.rows)
    expect(back.spec.columns).toEqual(spec.columns)
    expect(back.spec.formulas).toEqual(spec.formulas)
    expect(back.truncated).toBe(false)
    expect(back.errorCells).toEqual([])
    expect(back.outOfRegion).toBe(false)
  })

  it('maps 2-D header edits back to spec.columns but never changes the column count', () => {
    const spec = spec2D()
    const read = readOf(specToSheetData(spec))
    read.values[0][2] = 3000
    const back = sheetEditsToSpec(spec, read)
    expect(back.spec.columns).toEqual(['1000', '3000'])
    expect(back.spec.columns.length).toBe(spec.columns.length)
  })

  it('keeps blank/invalid-cell omission in step with toFunctionTableDtos', () => {
    const spec = spec1D()
    const read = readOf(specToSheetData(spec))
    read.values[2][1] = 'garbage' // non-numeric y
    const back = sheetEditsToSpec(spec, read)
    const dtos = toFunctionTableDtos([back.spec])
    expect(dtos[0].curves[0].points).toEqual([[1, 10]]) // row 2 omitted
  })

  it('ignores content outside the bound columns (spatial filter) and flags it', () => {
    const spec = spec1D()
    const read = readOf(specToSheetData(spec))
    read.values[1].push('stray') // column C on a 2-column table
    read.formulas[1].push('')
    const back = sheetEditsToSpec(spec, read)
    expect(back.spec.rows).toEqual(spec.rows)
    expect(back.outOfRegion).toBe(true)
  })

  it('truncates at the row cap (contract a)', () => {
    const spec = spec1D()
    const values: (string | number | null)[][] = [['Re', 'y']]
    for (let i = 0; i < TABLE_MAX_ROWS + 100; i++) values.push([i, i * 2])
    const formulas = values.map((row) => row.map(() => ''))
    const back = sheetEditsToSpec(spec, { values, formulas })
    expect(back.truncated).toBe(true)
    expect(back.spec.rows.length).toBe(TABLE_MAX_ROWS)
  })

  it('sanitizes formula error strings to omitted values, keeping the overlay (contract f)', () => {
    const spec = spec1D()
    const read = readOf(specToSheetData(spec))
    read.values[1][1] = '#REF!'
    read.formulas[1][1] = '=Gone!A1'
    const back = sheetEditsToSpec(spec, read)
    expect(back.errorCells).toEqual(['B2'])
    expect(back.spec.rows[0].ys[0]).toBe('')
    expect(back.spec.formulas?.B2).toBe('=Gone!A1')
    const dtos = toFunctionTableDtos([back.spec])
    expect(dtos[0].curves[0].points).toEqual([[2, 20]])
  })

  it('drops the overlay entry when a formula is replaced by a literal', () => {
    const spec = spec1D({ formulas: { B2: '=A2*10' } })
    const read = readOf(specToSheetData(spec))
    read.formulas[1][1] = ''
    read.values[1][1] = 42
    const back = sheetEditsToSpec(spec, read)
    expect(back.spec.formulas).toBeUndefined()
    expect(back.spec.rows[0].ys[0]).toBe('42')
  })

  it('never mutates code-sourced specs (mapper defense in depth)', () => {
    const spec = spec1D({ source: 'code' })
    const read = readOf(specToSheetData(spec))
    read.values[1][1] = 999999
    const back = sheetEditsToSpec(spec, read)
    expect(back.spec).toBe(spec)
  })

  it('captures rows typed below the current data (region growth)', () => {
    const spec = spec1D()
    const read = readOf(specToSheetData(spec))
    read.values.push([3, 30])
    read.formulas.push(['', ''])
    const back = sheetEditsToSpec(spec, read)
    expect(back.spec.rows.length).toBe(3)
    expect(back.spec.rows[2]).toEqual({ x: '3', ys: ['30'] })
  })
})

describe('protection map', () => {
  it('protects only schema header cells on GUI tables', () => {
    expect(protectedRangesFor(spec1D())).toEqual(['A1:B1'])
    expect(protectedRangesFor(spec2D())).toEqual(['A1:A1'])
  })
  it('protects the whole region on code tables', () => {
    const ranges = protectedRangesFor(spec2D({ source: 'code' }))
    expect(ranges).toHaveLength(1)
    expect(ranges[0].startsWith('A1:C')).toBe(true)
  })
})

describe('error literal detection', () => {
  it.each(['#REF!', '#DIV/0!', '#VALUE!', '#NAME?', '#N/A', '#NUM!'])('flags %s', (s) => {
    expect(isErrorValue(s)).toBe(true)
  })
  it('does not flag ordinary strings or numbers', () => {
    expect(isErrorValue('#hashtag')).toBe(false)
    expect(isErrorValue('REF')).toBe(false)
    expect(isErrorValue(42)).toBe(false)
  })
})

describe('boundColumnCount', () => {
  it('is x plus one per curve', () => {
    expect(boundColumnCount(spec1D())).toBe(2)
    expect(boundColumnCount(spec2D())).toBe(3)
  })
})
