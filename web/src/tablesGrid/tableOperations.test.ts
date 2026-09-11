import { describe, expect, it } from 'vitest'
import {
  evaluateRowExpression,
  filterTableRows,
  formatCellValue,
  functionTableToParamTable,
  groupTableSummary,
  joinTables,
  rollingTableStatistics,
  transformTableColumn,
} from './tableOperations'
import { FunctionTableSpec, ParamTableSpec, newParamRow } from '../tables'
import { extractMeasuredSeries } from '../ParameterFitModal'

function createTestTable(
  name: string,
  vars: string[],
  data: Record<string, string>[],
  columnUnits?: Record<string, string>,
): ParamTableSpec {
  return {
    id: `table-${name}`,
    kind: 'parametric',
    name,
    vars,
    rows: data.map((d) => ({ id: newParamRow().id, values: d })),
    results: [],
    stats: null,
    checkResult: null,
    checkMessage: '',
    source: 'gui',
    columnUnits,
  }
}

describe('tableOperations - evaluateRowExpression', () => {
  it('evaluates basic arithmetic, operator precedence and powers', () => {
    const vars = { x: 3, y: 4 }
    expect(evaluateRowExpression('x + y * 2', vars)).toBe(11)
    expect(evaluateRowExpression('(x + y) * 2', vars)).toBe(14)
    expect(evaluateRowExpression('x ^ 2 + y ^ 2', vars)).toBe(25)
    expect(evaluateRowExpression('10 % 3', vars)).toBe(1)
  })

  it('evaluates math functions', () => {
    const vars = { a: 9, b: -4, angle: 0 }
    expect(evaluateRowExpression('sqrt(a)', vars)).toBe(3)
    expect(evaluateRowExpression('abs(b)', vars)).toBe(4)
    expect(evaluateRowExpression('cos(angle)', vars)).toBe(1)
    expect(evaluateRowExpression('sin(angle)', vars)).toBe(0)
    expect(evaluateRowExpression('max(a, b)', vars)).toBe(9)
    expect(evaluateRowExpression('min(a, b)', vars)).toBe(-4)
  })

  it('evaluates logical expressions and comparisons', () => {
    const vars = { temp: 25, pressure: 101.3 }
    expect(evaluateRowExpression('temp > 20 && pressure >= 100', vars)).toBe(1)
    expect(evaluateRowExpression('temp > 30 || pressure < 50', vars)).toBe(0)
    expect(evaluateRowExpression('!(temp == 25)', vars)).toBe(0)
  })

  it('formats cell numbers properly', () => {
    expect(formatCellValue(12.34)).toBe('12.34')
    expect(formatCellValue(null)).toBe('')
    expect(formatCellValue(Number.NaN)).toBe('')
  })
})

describe('tableOperations - filterTableRows', () => {
  const table = createTestTable(
    'measurements',
    ['time', 'temp', 'flag'],
    [
      { time: '0', temp: '20.5', flag: '1' },
      { time: '1', temp: '25.0', flag: '1' },
      { time: '2', temp: '32.1', flag: '0' },
      { time: '3', temp: '28.4', flag: '1' },
      { time: '4', temp: '', flag: '1' }, // missing
    ],
    { time: 's', temp: 'degC' },
  )

  it('filters rows by simple comparison operator', () => {
    const { table: filtered, provenance } = filterTableRows(table, {
      condition: { column: 'temp', operator: '>', value: 25.0 },
    })
    expect(filtered.rows.length).toBe(2)
    expect(filtered.rows.map((r) => r.values.time)).toEqual(['2', '3'])
    expect(provenance.sourceRowCount).toBe(5)
    expect(provenance.resultRowCount).toBe(2)
    expect(provenance.rejectedRowCount).toBe(3)
    expect(filtered.columnUnits).toEqual({ time: 's', temp: 'degC' })
  })

  it('filters rows with between operator', () => {
    const { table: filtered } = filterTableRows(table, {
      condition: { column: 'temp', operator: 'between', value: 20.0, value2: 26.0 },
    })
    expect(filtered.rows.length).toBe(2)
    expect(filtered.rows.map((r) => r.values.time)).toEqual(['0', '1'])
  })

  it('filters rows with predicate custom expression', () => {
    const { table: filtered } = filterTableRows(table, {
      condition: { operator: '>', customExpression: 'temp > 22 && flag == 1' },
    })
    expect(filtered.rows.length).toBe(2)
    expect(filtered.rows.map((r) => r.values.time)).toEqual(['1', '3'])
  })

  it('handles missing/NaN values according to missingPolicy', () => {
    const { table: dropped } = filterTableRows(table, {
      condition: { column: 'temp', operator: '<', value: 100 },
      missingPolicy: 'drop',
    })
    expect(dropped.rows.length).toBe(4)

    const { table: kept } = filterTableRows(table, {
      condition: { column: 'temp', operator: '<', value: 100 },
      missingPolicy: 'keep',
    })
    expect(kept.rows.length).toBe(5)
  })
})

describe('tableOperations - transformTableColumn', () => {
  const table = createTestTable(
    'sensors',
    ['x', 'y'],
    [
      { x: '3', y: '4' },
      { x: '6', y: '8' },
      { x: '5', y: '12' },
    ],
    { x: 'm', y: 'm' },
  )

  it('computes a new column with mathematical expression and assigns unit', () => {
    const { table: transformed, provenance } = transformTableColumn(table, {
      targetColumn: 'hypot',
      expression: 'sqrt(x^2 + y^2)',
      unit: 'm',
    })

    expect(transformed.vars).toEqual(['x', 'y', 'hypot'])
    expect(transformed.rows.map((r) => r.values.hypot)).toEqual(['5', '10', '13'])
    expect(transformed.columnUnits).toEqual({ x: 'm', y: 'm', hypot: 'm' })
    expect(provenance.operation).toBe('transform')
  })

  it('replaces an existing column in-place if specified', () => {
    const { table: transformed } = transformTableColumn(table, {
      targetColumn: 'x',
      expression: 'x * 100',
      unit: 'cm',
    })

    expect(transformed.vars).toEqual(['x', 'y'])
    expect(transformed.rows.map((r) => r.values.x)).toEqual(['300', '600', '500'])
    expect(transformed.columnUnits?.x).toBe('cm')
  })
})

describe('tableOperations - groupTableSummary', () => {
  const table = createTestTable(
    'runs',
    ['fluid', 'temp', 'pressure'],
    [
      { fluid: 'Water', temp: '20', pressure: '100' },
      { fluid: 'Water', temp: '30', pressure: '150' },
      { fluid: 'Water', temp: '40', pressure: '200' },
      { fluid: 'Air', temp: '10', pressure: '101' },
      { fluid: 'Air', temp: '50', pressure: '101' },
    ],
    { temp: 'degC', pressure: 'kPa' },
  )

  it('groups by column and computes multiple statistical aggregations', () => {
    const { table: summary, provenance } = groupTableSummary(table, {
      groupColumns: ['fluid'],
      aggregations: [
        { column: 'temp', op: 'mean' },
        { column: 'temp', op: 'min' },
        { column: 'temp', op: 'max' },
        { column: 'pressure', op: 'median' },
        { column: 'pressure', op: 'count' },
      ],
    })

    expect(summary.rows.length).toBe(2)
    const waterRow = summary.rows.find((r) => r.values.fluid === 'Water')!
    expect(waterRow.values.temp_mean).toBe('30')
    expect(waterRow.values.temp_min).toBe('20')
    expect(waterRow.values.temp_max).toBe('40')
    expect(waterRow.values.pressure_median).toBe('150')
    expect(waterRow.values.pressure_count).toBe('3')

    const airRow = summary.rows.find((r) => r.values.fluid === 'Air')!
    expect(airRow.values.temp_mean).toBe('30')
    expect(airRow.values.pressure_count).toBe('2')

    expect(summary.columnUnits?.temp_mean).toBe('degC')
    expect(summary.columnUnits?.pressure_median).toBe('kPa')
    expect(provenance.sourceRowCount).toBe(5)
    expect(provenance.resultRowCount).toBe(2)
  })
})

describe('tableOperations - rollingTableStatistics', () => {
  const table = createTestTable(
    'timeseries',
    ['t', 'signal'],
    [
      { t: '1', signal: '10' },
      { t: '2', signal: '20' },
      { t: '3', signal: '30' },
      { t: '4', signal: '40' },
      { t: '5', signal: '50' },
    ],
    { signal: 'V' },
  )

  it('computes trailing moving average, std, and median', () => {
    const { table: rolling, provenance } = rollingTableStatistics(table, {
      column: 'signal',
      windowSize: 3,
      operations: ['mean', 'median', 'std'],
    })

    expect(rolling.vars).toContain('signal_roll_mean_3')
    expect(rolling.vars).toContain('signal_roll_median_3')
    expect(rolling.vars).toContain('signal_roll_std_3')

    // At t=1: window=[10] -> mean=10, median=10
    expect(rolling.rows[0].values.signal_roll_mean_3).toBe('10')
    expect(rolling.rows[0].values.signal_roll_median_3).toBe('10')

    // At t=2: window=[10, 20] -> mean=15, median=15
    expect(rolling.rows[1].values.signal_roll_mean_3).toBe('15')

    // At t=3: window=[10, 20, 30] -> mean=20, median=20
    expect(rolling.rows[2].values.signal_roll_mean_3).toBe('20')
    expect(rolling.rows[2].values.signal_roll_median_3).toBe('20')

    // At t=4: window=[20, 30, 40] -> mean=30, median=30
    expect(rolling.rows[3].values.signal_roll_mean_3).toBe('30')

    expect(rolling.columnUnits?.signal_roll_mean_3).toBe('V')
    expect(provenance.operation).toBe('rolling')
  })
})

describe('tableOperations - joinTables', () => {
  const tableA = createTestTable(
    'sensorA',
    ['id', 'temp'],
    [
      { id: '1', temp: '20.0' },
      { id: '2', temp: '25.0' },
      { id: '3', temp: '30.0' },
    ],
    { temp: 'degC' },
  )

  const tableB = createTestTable(
    'sensorB',
    ['id', 'press', 'temp'],
    [
      { id: '2', press: '101.3', temp: '25.1' },
      { id: '3', press: '102.5', temp: '30.2' },
      { id: '4', press: '99.8', temp: '18.0' },
    ],
    { press: 'kPa', temp: 'degC' },
  )

  it('performs exact inner join and renames overlapping columns with _B', () => {
    const { table: joined, provenance } = joinTables(tableA, tableB, {
      type: 'inner',
      keyA: 'id',
      keyB: 'id',
      mode: 'exact',
    })

    expect(joined.vars).toEqual(['id', 'temp', 'press', 'temp_B'])
    expect(joined.rows.length).toBe(2)
    expect(joined.rows.map((r) => r.values.id)).toEqual(['2', '3'])
    expect(joined.rows[0].values.temp).toBe('25.0')
    expect(joined.rows[0].values.temp_B).toBe('25.1')
    expect(joined.rows[0].values.press).toBe('101.3')

    expect(joined.columnUnits?.temp).toBe('degC')
    expect(joined.columnUnits?.temp_B).toBe('degC')
    expect(joined.columnUnits?.press).toBe('kPa')
    expect(provenance.operation).toBe('join')
  })

  it('performs exact left join retaining unmatched left rows', () => {
    const { table: joined } = joinTables(tableA, tableB, {
      type: 'left',
      keyA: 'id',
      keyB: 'id',
      mode: 'exact',
    })

    expect(joined.rows.length).toBe(3)
    expect(joined.rows.map((r) => r.values.id)).toEqual(['1', '2', '3'])
    expect(joined.rows[0].values.press).toBe('')
  })

  it('performs temporal alignment via linear interpolation over continuous time', () => {
    const timeGridA = createTestTable(
      'timeA',
      ['time', 'speed'],
      [
        { time: '0.0', speed: '0' },
        { time: '1.0', speed: '10' },
        { time: '2.0', speed: '20' },
        { time: '3.0', speed: '30' },
      ],
      { time: 's', speed: 'm/s' },
    )

    // Table B sampled at different timestamps
    const timeGridB = createTestTable(
      'timeB',
      ['t', 'voltage'],
      [
        { t: '0.0', voltage: '100' },
        { t: '2.0', voltage: '200' },
        { t: '4.0', voltage: '400' },
      ],
      { t: 's', voltage: 'V' },
    )

    const { table: aligned } = joinTables(timeGridA, timeGridB, {
      type: 'left',
      keyA: 'time',
      keyB: 't',
      mode: 'interpolate',
      extrapolationPolicy: 'clamp',
    })

    expect(aligned.rows.length).toBe(4)
    expect(aligned.vars).toEqual(['time', 'speed', 'voltage'])
    // At t=0: voltage=100
    expect(aligned.rows[0].values.voltage).toBe('100')
    // At t=1: midpoint between t=0 (100) and t=2 (200) -> voltage=150
    expect(aligned.rows[1].values.voltage).toBe('150')
    // At t=2: voltage=200
    expect(aligned.rows[2].values.voltage).toBe('200')
    // At t=3: midpoint between t=2 (200) and t=4 (400) -> voltage=300
    expect(aligned.rows[3].values.voltage).toBe('300')

    expect(aligned.columnUnits?.voltage).toBe('V')
  })
})

describe('tableOperations - functionTableToParamTable & extractMeasuredSeries', () => {
  it('converts a 1D function table to a parametric table', () => {
    const fnTable: FunctionTableSpec = {
      id: 'fn-1',
      name: 'cal_curve',
      kind: 'function',
      argName: 'time',
      argUnit: 's',
      paramName: '',
      xLog: false,
      yLog: false,
      columns: [''],
      outputUnit: 'V',
      is1D: true,
      rows: [
        { x: '0', ys: ['1.5'] },
        { x: '1', ys: ['2.5'] },
        { x: '2', ys: ['3.5'] },
      ],
    }

    const param = functionTableToParamTable(fnTable)
    expect(param.kind).toBe('parametric')
    expect(param.name).toBe('cal_curve')
    expect(param.vars).toEqual(['time', 'y'])
    expect(param.rows.length).toBe(3)
    expect(param.rows[0].values.time).toBe('0')
    expect(param.rows[0].values.y).toBe('1.5')
    expect(param.columnUnits?.time).toBe('s')
    expect(param.columnUnits?.y).toBe('V')

    // Extract measured series
    const series = extractMeasuredSeries(fnTable)
    expect(series.t).toEqual([0, 1, 2])
    expect(series.v).toEqual([1.5, 2.5, 3.5])
  })

  it('extracts measured series from a multi-column parametric table with custom column mapping', () => {
    const table = createTestTable(
      'measurements',
      ['timestamp', 'temp', 'pressure'],
      [
        { timestamp: '0.0', temp: '20.5', pressure: '101.3' },
        { timestamp: '0.5', temp: '25.0', pressure: '102.1' },
        { timestamp: '1.0', temp: '30.2', pressure: '103.0' },
      ],
      { timestamp: 's', temp: 'degC', pressure: 'kPa' },
    )

    const series = extractMeasuredSeries(table, 'timestamp', 'temp')
    expect(series.t).toEqual([0, 0.5, 1.0])
    expect(series.v).toEqual([20.5, 25.0, 30.2])

    const seriesP = extractMeasuredSeries(table, 'timestamp', 'pressure')
    expect(seriesP.t).toEqual([0, 0.5, 1.0])
    expect(seriesP.v).toEqual([101.3, 102.1, 103.0])
  })
})
