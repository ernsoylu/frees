import { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
} from '@mantine/core'
import type { PlotlyFigure } from 'plotly.js/lib/core'
import PlotlyChart from './plots/PlotlyChart'
import {
  type SensitivityParams,
  type SensitivityResult,
  type SensitivitySobolIndex,
  type SensitivityMorrisEffect,
} from './api'

function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  return a !== 0 && (a < 1e-3 || a >= 1e5) ? v.toExponential(3) : v.toPrecision(5)
}

function buildSensitivityFigure(
  title: string,
  yAxisTitle: string,
  data: PlotlyFigure['data'],
): PlotlyFigure {
  return {
    data,
    layout: {
      barmode: 'group',
      margin: { l: 50, r: 20, t: 30, b: 60 },
      title: { text: title },
      xaxis: { title: { text: 'Parameter' }, tickangle: -25 },
      yaxis: { title: { text: yAxisTitle }, rangemode: 'tozero' },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: 'var(--mantine-color-text)' },
      legend: { orientation: 'h', y: 1.15, x: 0.5, xanchor: 'center' },
    },
  } as unknown as PlotlyFigure
}

/**
 * Global Sensitivity Analysis Modal:
 * Supports Sobol variance decomposition (first-order S1 and total-order ST indices)
 * and Morris elementary effects screening (mu, mu*, sigma).
 */
export default function SensitivityModal({
  opened,
  onClose,
  onRun,
}: Readonly<{
  opened: boolean
  onClose: () => void
  onRun: (params: Omit<SensitivityParams, 'text'>) => Promise<SensitivityResult>
}>) {
  const [method, setMethod] = useState<'sobol' | 'morris'>('sobol')
  const [samples, setSamples] = useState<number>(100)
  const [design, setDesign] = useState<'sobol' | 'lhs' | 'random'>('sobol')
  const [bootstrap, setBootstrap] = useState<number>(200)
  const [trajectories, setTrajectories] = useState<number>(10)
  const [levels, setLevels] = useState<number>(4)
  const [seed, setSeed] = useState<number>(42)

  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SensitivityResult | null>(null)
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      const params: Omit<SensitivityParams, 'text'> = {
        method,
        seed,
        ...(method === 'sobol'
          ? { samples, design, bootstrap }
          : { trajectories, levels }),
      }
      const res = await onRun(params)
      if (res.error) {
        setError(res.error)
      } else {
        setResult(res)
        setSelectedOutput((prev) =>
          prev && res.outputs.some((o) => o.variable === prev)
            ? prev
            : (res.outputs[0]?.variable ?? null),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRunning(false)
    }
  }

  const currentOutput = useMemo(() => {
    if (!result || !selectedOutput) return null
    return result.outputs.find((o) => o.variable === selectedOutput) ?? null
  }, [result, selectedOutput])

  // Sorted Sobol indices (descending total effect)
  const sortedSobolIndices = useMemo<SensitivitySobolIndex[]>(() => {
    if (!currentOutput?.indices) return []
    return [...currentOutput.indices].sort((a, b) => (b.total ?? -1) - (a.total ?? -1))
  }, [currentOutput])

  // Sorted Morris effects (descending muStar)
  const sortedMorrisEffects = useMemo<SensitivityMorrisEffect[]>(() => {
    if (!currentOutput?.effects) return []
    return [...currentOutput.effects].sort((a, b) => (b.muStar ?? -1) - (a.muStar ?? -1))
  }, [currentOutput])

  // Plotly chart figure
  const chartFigure = useMemo<PlotlyFigure | null>(() => {
    if (!result || !currentOutput) return null

    if (result.method === 'sobol' && sortedSobolIndices.length > 0) {
      const sources = sortedSobolIndices.map((i) => i.source)
      const s1 = sortedSobolIndices.map((i) => i.firstOrder ?? 0)
      const s1Err = sortedSobolIndices.map((i) => i.firstOrderStdError ?? undefined)
      const sT = sortedSobolIndices.map((i) => i.total ?? 0)
      const sTErr = sortedSobolIndices.map((i) => i.totalStdError ?? undefined)

      const hasS1Err = s1Err.some((e) => typeof e === 'number' && e > 0)
      const hasSTErr = sTErr.some((e) => typeof e === 'number' && e > 0)

      return buildSensitivityFigure(
        `Sobol Sensitivity: ${currentOutput.variable}`,
        'Variance Share (Index)',
        [
          {
            name: 'First-Order (S₁)',
            type: 'bar',
            x: sources,
            y: s1,
            marker: { color: '#339af0' },
            ...(hasS1Err
              ? {
                  error_y: {
                    type: 'data',
                    array: s1Err,
                    visible: true,
                    color: '#1c7ed6',
                  },
                }
              : {}),
          },
          {
            name: 'Total-Order (Sₜ)',
            type: 'bar',
            x: sources,
            y: sT,
            marker: { color: '#fa5252' },
            ...(hasSTErr
              ? {
                  error_y: {
                    type: 'data',
                    array: sTErr,
                    visible: true,
                    color: '#e03131',
                  },
                }
              : {}),
          },
        ] as unknown as PlotlyFigure['data'],
      )
    }

    if (result.method === 'morris' && sortedMorrisEffects.length > 0) {
      const sources = sortedMorrisEffects.map((e) => e.source)
      const muStar = sortedMorrisEffects.map((e) => e.muStar ?? 0)
      const sigma = sortedMorrisEffects.map((e) => e.sigma ?? 0)

      return buildSensitivityFigure(
        `Morris Screening: ${currentOutput.variable}`,
        'Elementary Effect',
        [
          {
            name: 'Absolute Mean (μ*)',
            type: 'bar',
            x: sources,
            y: muStar,
            marker: { color: '#339af0' },
          },
          {
            name: 'Non-linearity / Interactions (σ)',
            type: 'bar',
            x: sources,
            y: sigma,
            marker: { color: '#f76707' },
          },
        ] as unknown as PlotlyFigure['data'],
      )
    }

    return null
  }, [result, currentOutput, sortedSobolIndices, sortedMorrisEffects])

  const outputOptions = useMemo(() => {
    if (!result) return []
    return result.outputs.map((o) => ({
      value: o.variable,
      label: o.variable,
    }))
  }, [result])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Global Sensitivity Analysis"
      size="xl"
      centered
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Computes global sensitivity indices across the declared parameter ranges.
          Sobol decomposes variance into first-order (direct) and total-order (including interactions)
          contributions. Morris provides efficient screening of primary and interaction effects.
        </Text>

        <Group align="end" gap="sm">
          <Select
            label="Method"
            data={[
              { value: 'sobol', label: "Sobol' Variance Decomposition" },
              { value: 'morris', label: 'Morris Elementary Effects' },
            ]}
            value={method}
            onChange={(val) => setMethod((val as 'sobol' | 'morris') ?? 'sobol')}
            w={230}
          />

          {method === 'sobol' && (
            <>
              <Select
                label="Design"
                data={[
                  { value: 'sobol', label: 'Sobol Quasi-Random' },
                  { value: 'lhs', label: 'Latin Hypercube' },
                  { value: 'random', label: 'Pseudorandom' },
                ]}
                value={design}
                onChange={(val) => setDesign((val as 'sobol' | 'lhs' | 'random') ?? 'sobol')}
                w={180}
              />
              <NumberInput
                label="Base Samples (N)"
                value={samples}
                onChange={(val) => setSamples(Number(val) || 100)}
                min={10}
                max={50000}
                step={50}
                w={140}
              />
              <NumberInput
                label="Bootstrap Replicates"
                value={bootstrap}
                onChange={(val) => setBootstrap(Number(val) || 0)}
                min={0}
                max={2000}
                step={50}
                w={150}
              />
            </>
          )}

          {method === 'morris' && (
            <>
              <NumberInput
                label="Trajectories (r)"
                value={trajectories}
                onChange={(val) => setTrajectories(Number(val) || 10)}
                min={2}
                max={1000}
                step={2}
                w={130}
              />
              <NumberInput
                label="Grid Levels (p)"
                value={levels}
                onChange={(val) => setLevels(Number(val) || 4)}
                min={4}
                max={64}
                step={2}
                w={130}
              />
            </>
          )}

          <NumberInput
            label="Seed"
            value={seed}
            onChange={(val) => setSeed(Number(val) || 42)}
            w={100}
          />

          <Button onClick={run} loading={running}>
            Analyze
          </Button>
        </Group>

        {error && (
          <Alert color="red" title="Sensitivity Analysis Error">
            {error}
          </Alert>
        )}

        {result && (
          <Stack gap="xs">
            <Card withBorder p="xs" radius="sm">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <Badge color="teal" variant="light">
                    {result.method.toUpperCase()}
                  </Badge>
                  {result.diagnostics?.design && (
                    <Badge color="gray" variant="outline">
                      Design: {result.diagnostics.design.toUpperCase()}
                    </Badge>
                  )}
                  {result.diagnostics && (
                    <Text size="xs" c="dimmed">
                      Evaluations: {result.diagnostics.evaluations} | Used: {result.diagnostics.usedRows}
                      {result.diagnostics.droppedRows > 0 &&
                        ` | Dropped: ${result.diagnostics.droppedRows}`}
                    </Text>
                  )}
                </Group>
                {result.diagnostics && (
                  <Badge color={result.diagnostics.complete ? 'green' : 'orange'} variant="dot">
                    {result.diagnostics.complete ? 'Complete' : 'Time limited'}
                  </Badge>
                )}
              </Group>
            </Card>

            {outputOptions.length > 0 && (
              <Group align="center" gap="sm">
                <Text size="sm" fw={500}>
                  Output Variable:
                </Text>
                <Select
                  data={outputOptions}
                  value={selectedOutput}
                  onChange={setSelectedOutput}
                  w={220}
                />
                {currentOutput && (
                  <Text size="xs" c="dimmed">
                    Variance: {fmt(currentOutput.variance)}
                  </Text>
                )}
              </Group>
            )}

            {currentOutput && (
              <Tabs defaultValue="chart">
                <Tabs.List>
                  <Tabs.Tab value="chart">Chart</Tabs.Tab>
                  <Tabs.Tab value="table">Table</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="chart" pt="xs">
                  {chartFigure ? (
                    <PlotlyChart figure={chartFigure} minHeight={340} />
                  ) : (
                    <Text size="sm" c="dimmed" py="xl" ta="center">
                      No sensitivity data available for this variable.
                    </Text>
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="table" pt="xs">
                  <ScrollArea mah={350}>
                    {result.method === 'sobol' ? (
                      <Table withTableBorder striped fz="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Source Parameter</Table.Th>
                            <Table.Th ta="right">First-Order (S₁)</Table.Th>
                            <Table.Th ta="right">S₁ Std Error</Table.Th>
                            <Table.Th ta="right">Total (Sₜ)</Table.Th>
                            <Table.Th ta="right">Sₜ Std Error</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {sortedSobolIndices.map((idx) => (
                            <Table.Tr key={idx.source}>
                              <Table.Td ff="monospace">{idx.source}</Table.Td>
                              <Table.Td ta="right" ff="monospace">
                                {fmt(idx.firstOrder)}
                              </Table.Td>
                              <Table.Td ta="right" ff="monospace" c="dimmed">
                                {fmt(idx.firstOrderStdError)}
                              </Table.Td>
                              <Table.Td ta="right" ff="monospace" fw={600}>
                                {fmt(idx.total)}
                              </Table.Td>
                              <Table.Td ta="right" ff="monospace" c="dimmed">
                                {fmt(idx.totalStdError)}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Table withTableBorder striped fz="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Source Parameter</Table.Th>
                            <Table.Th ta="right">Mean Absolute (μ*)</Table.Th>
                            <Table.Th ta="right">Mean (μ)</Table.Th>
                            <Table.Th ta="right">Std Dev (σ)</Table.Th>
                            <Table.Th ta="right">Samples</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {sortedMorrisEffects.map((eff) => (
                            <Table.Tr key={eff.source}>
                              <Table.Td ff="monospace">{eff.source}</Table.Td>
                              <Table.Td ta="right" ff="monospace" fw={600}>
                                {fmt(eff.muStar)}
                              </Table.Td>
                              <Table.Td ta="right" ff="monospace">
                                {fmt(eff.mu)}
                              </Table.Td>
                              <Table.Td ta="right" ff="monospace">
                                {fmt(eff.sigma)}
                              </Table.Td>
                              <Table.Td ta="right" ff="monospace" c="dimmed">
                                {eff.samples}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  </ScrollArea>
                </Tabs.Panel>
              </Tabs>
            )}
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}
