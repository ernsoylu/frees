import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Group, Loader, Menu, Text } from '@mantine/core'
import type { PlotlyFigure } from 'plotly.js-basic-dist-min'
import {
  DiagramResponse,
  PsychartResponse,
  TableRowResult,
  getPropertyDiagram,
  getPsychrometricChart,
} from '../api'
import { ParamRow } from '../ParametricTableTab'
import { PlotSpec } from './types'
import { StateTable } from './stateTable'
import {
  PlotTheme,
  XYSeries,
  buildPropertyFigure,
  buildPsychroFigure,
  buildXYFigure,
} from './figure'
import { EXPORT_FORMATS, exportPlot } from './exportPlot'
import PlotlyChart from './PlotlyChart'

interface Props {
  spec: PlotSpec
  states: StateTable
  cyclePath?: Record<string, number>[]
  tableRows: ParamRow[]
  tableResults: TableRowResult[]
  onConfigure: () => void
  onRemove: () => void
  leftSection?: React.ReactNode
  rightSection?: React.ReactNode
  hideHeader?: boolean
  exportTrigger?: { format: string; timestamp: number } | null
}

/** Value of one variable in one run: solved value or the typed input. */
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

function buildXYSeries(
  rows: ParamRow[],
  results: TableRowResult[],
  xVar: string,
  yVars: string[],
): XYSeries[] {
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

export function useDiagramData(spec: PlotSpec) {
  const [diagram, setDiagram] = useState<DiagramResponse | null>(null)
  const [psychart, setPsychart] = useState<PsychartResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { kind } = spec
  const { fluid, diagram: diagramType } = spec.property
  const { pressureKPa, tMinC, tMaxC } = spec.psychro

  useEffect(() => {
    if (kind === 'xy') return
    let cancelled = false
    setLoading(true)
    setError(null)
    const request =
      kind === 'property'
        ? getPropertyDiagram(fluid, diagramType).then((d) => {
            if (!cancelled) setDiagram(d)
          })
        : getPsychrometricChart(
            pressureKPa * 1000,
            tMinC + 273.15,
            tMaxC + 273.15,
          ).then((c) => {
            if (!cancelled) setPsychart(c)
          })
    request
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e instanceof Error ? e.message : e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [kind, fluid, diagramType, pressureKPa, tMinC, tMaxC])

  return { diagram, psychart, loading, error }
}

export function buildFigure(
  spec: PlotSpec,
  states: StateTable,
  cyclePath: Record<string, number>[] | undefined,
  tableRows: ParamRow[],
  tableResults: TableRowResult[],
  diagram: DiagramResponse | null,
  psychart: PsychartResponse | null,
  theme: PlotTheme,
): PlotlyFigure | null {
  if (spec.kind === 'property' && diagram) {
    return buildPropertyFigure(diagram, spec.property, spec.format, states, theme, cyclePath)
  }
  if (spec.kind === 'psychro' && psychart) {
    return buildPsychroFigure(psychart, spec.psychro, spec.format, states, theme, cyclePath)
  }
  if (spec.kind === 'xy' && spec.xy.xVar && spec.xy.yVars.length > 0) {
    const series = buildXYSeries(tableRows, tableResults, spec.xy.xVar, spec.xy.yVars)
    return buildXYFigure(
      series,
      spec.format,
      spec.xy.xVar,
      spec.xy.yVars.join(', '),
      theme,
    )
  }
  return null
}

export default function PlotCard({
  spec,
  states,
  cyclePath,
  tableRows,
  tableResults,
  onConfigure,
  onRemove,
  leftSection,
  rightSection,
  hideHeader = false,
  exportTrigger = null,
}: Readonly<Props>) {
  const { diagram, psychart, loading, error } = useDiagramData(spec)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [publicationStyle, setPublicationStyle] = useState(true)

  useEffect(() => {
    if (exportTrigger) {
      void onExport(exportTrigger.format as any)
    }
  }, [exportTrigger])

  const figure = useMemo(
    () => buildFigure(spec, states, cyclePath, tableRows, tableResults, diagram, psychart, 'dark'),
    [spec, states, cyclePath, tableRows, tableResults, diagram, psychart],
  )

  async function onExport(format: (typeof EXPORT_FORMATS)[number]['value']) {
    const theme: PlotTheme = publicationStyle ? 'light' : 'dark'
    const exportFigure = buildFigure(
      spec,
      states,
      cyclePath,
      tableRows,
      tableResults,
      diagram,
      psychart,
      theme,
    )
    if (!exportFigure) return
    setExporting(true)
    setExportError(null)
    try {
      await exportPlot(exportFigure, format, spec.name.replace(/\s+/g, '_'))
    } catch (e) {
      setExportError(String(e instanceof Error ? e.message : e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      {!hideHeader && (
        <Group justify="space-between" mb="xs" wrap="nowrap" align="center">
          <Group gap="xs" style={{ flex: 1 }} wrap="nowrap">
            {leftSection}
            <Button variant="default" size="xs" onClick={onConfigure}>
              Configure
            </Button>
            <Menu shadow="md">
              <Menu.Target>
                <Button variant="default" size="xs" loading={exporting}>
                  Export
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                {EXPORT_FORMATS.map((f) => (
                  <Menu.Item key={f.value} onClick={() => void onExport(f.value)}>
                    {f.label}
                  </Menu.Item>
                ))}
                <Menu.Divider />
                <Menu.Item
                  onClick={() => setPublicationStyle((v) => !v)}
                  rightSection={publicationStyle ? '✓' : undefined}
                >
                  Publication style (white)
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Button variant="subtle" color="red" size="xs" onClick={onRemove}>
              Remove
            </Button>
            {rightSection}
          </Group>
        </Group>
      )}

      {error && (
        <Alert color="red" mb="xs">
          {error}
        </Alert>
      )}
      {exportError && (
        <Alert color="orange" mb="xs" withCloseButton onClose={() => setExportError(null)}>
          Export failed: {exportError}
        </Alert>
      )}
      {loading && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            Computing property curves…
          </Text>
        </Group>
      )}
      {!loading && !error && figure === null && (
        <Text size="sm" c="dimmed">
          {spec.kind === 'xy'
            ? 'Choose an X variable and at least one Y variable in Configure, then solve the parametric table.'
            : 'No data yet.'}
        </Text>
      )}
      {figure !== null && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <PlotlyChart figure={figure} />
        </div>
      )}
    </>
  )
}
