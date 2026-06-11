import { Checkbox, Group, MultiSelect, Select, Stack, Text } from '@mantine/core'
import { TableRowResult } from './api'
import { ParamRow } from './ParametricTableTab'
import Plot, { PlotSeries } from './Plot'

export interface PlotConfig {
  xVar: string | null
  yVars: string[]
  xLog: boolean
  yLog: boolean
}

export const DEFAULT_PLOT_CONFIG: PlotConfig = {
  xVar: null,
  yVars: [],
  xLog: false,
  yLog: false,
}

/**
 * Value of one variable in one run: the solved value when the run
 * succeeded, otherwise the numeric value typed into the table cell.
 */
function runValue(
  row: ParamRow,
  result: TableRowResult | undefined,
  name: string,
): number | undefined {
  const solved = result?.success ? result.values[name] : undefined
  if (solved !== undefined) return solved
  const raw = (row.values[name] ?? '').trim()
  if (raw === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

/** One overlay series per Y variable, in run order, skipping unusable runs. */
function buildSeries(
  rows: ParamRow[],
  results: TableRowResult[],
  xVar: string,
  yVars: string[],
): PlotSeries[] {
  return yVars.map((yVar) => {
    const x: number[] = []
    const y: number[] = []
    rows.forEach((row, i) => {
      const xValue = runValue(row, results[i], xVar)
      const yValue = runValue(row, results[i], yVar)
      if (xValue !== undefined && yValue !== undefined) {
        x.push(xValue)
        y.push(yValue)
      }
    })
    return { name: yVar, x, y }
  })
}

interface Props {
  tableVars: string[]
  rows: ParamRow[]
  results: TableRowResult[]
  config: PlotConfig
  onConfigChange: (config: PlotConfig) => void
}

function PlotBody({
  tableVars,
  rows,
  results,
  config,
}: Readonly<Omit<Props, 'onConfigChange'>>) {
  if (tableVars.length === 0 || results.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No table data to plot yet. Configure columns in the Parametric Table
        tab, run Check Table, then Solve Table — the runs become the plot
        data.
      </Text>
    )
  }
  if (config.xVar === null || config.yVars.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Choose an X-axis variable and at least one Y-axis variable to plot
        the table runs.
      </Text>
    )
  }
  return (
    <Plot
      series={buildSeries(rows, results, config.xVar, config.yVars)}
      xLabel={config.xVar}
      yLabel={config.yVars.join(', ')}
      xLog={config.xLog}
      yLog={config.yLog}
    />
  )
}

export default function PlotTab({
  tableVars,
  rows,
  results,
  config,
  onConfigChange,
}: Readonly<Props>) {
  return (
    <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
      <Group gap="md" align="flex-end">
        <Select
          label="X-Axis"
          size="xs"
          w={160}
          data={tableVars}
          value={config.xVar}
          onChange={(xVar) => onConfigChange({ ...config, xVar })}
          placeholder="variable"
          searchable
        />
        <MultiSelect
          label="Y-Axis (overlay multiple)"
          size="xs"
          w={280}
          data={tableVars}
          value={config.yVars}
          onChange={(yVars) => onConfigChange({ ...config, yVars })}
          placeholder="variables"
          searchable
        />
        <Checkbox
          label="Log X"
          size="xs"
          checked={config.xLog}
          onChange={(e) =>
            onConfigChange({ ...config, xLog: e.currentTarget.checked })
          }
        />
        <Checkbox
          label="Log Y"
          size="xs"
          checked={config.yLog}
          onChange={(e) =>
            onConfigChange({ ...config, yLog: e.currentTarget.checked })
          }
        />
      </Group>

      <div style={{ flex: 1, minHeight: 0 }}>
        <PlotBody
          tableVars={tableVars}
          rows={rows}
          results={results}
          config={config}
        />
      </div>
    </Stack>
  )
}
