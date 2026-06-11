import { useEffect, useState } from 'react'
import { Button, Group, Stack, Tabs, Text } from '@mantine/core'
import { TableRowResult, VariableResult, getFluids } from './api'
import { ParamRow } from './ParametricTableTab'
import { PlotSpec } from './plots/types'
import { detectStates } from './plots/stateTable'
import PlotCard from './plots/PlotCard'
import PlotConfigModal from './plots/PlotConfigModal'

interface Props {
  plots: PlotSpec[]
  onPlotsChange: (plots: PlotSpec[]) => void
  solvedVariables: VariableResult[]
  tableVars: string[]
  rows: ParamRow[]
  results: TableRowResult[]
}

/**
 * The Plots window: any number of plots (property diagrams, psychrometric
 * charts, X-Y parametric plots), each with its own configuration, format
 * options and export menu.
 */
export default function PlotTab({
  plots,
  onPlotsChange,
  solvedVariables,
  tableVars,
  rows,
  results,
}: Readonly<Props>) {
  const [fluids, setFluids] = useState<string[]>([])
  const [activePlot, setActivePlot] = useState<string | null>(plots[0]?.id ?? null)
  const [editing, setEditing] = useState<PlotSpec | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    void getFluids().then(setFluids)
  }, [])

  const states = detectStates(solvedVariables)

  function addPlot(spec: PlotSpec) {
    onPlotsChange([...plots, spec])
    setActivePlot(spec.id)
    setAdding(false)
  }

  function updatePlot(spec: PlotSpec) {
    onPlotsChange(plots.map((p) => (p.id === spec.id ? spec : p)))
    setEditing(null)
  }

  function removePlot(id: string) {
    const next = plots.filter((p) => p.id !== id)
    onPlotsChange(next)
    if (activePlot === id) {
      setActivePlot(next[0]?.id ?? null)
    }
  }

  const current = plots.find((p) => p.id === activePlot) ?? plots[0] ?? null

  return (
    <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
      <Group justify="space-between">
        <Tabs
          value={current?.id ?? null}
          onChange={(id) => id && setActivePlot(id)}
          variant="pills"
        >
          <Tabs.List>
            {plots.map((p) => (
              <Tabs.Tab key={p.id} value={p.id}>
                {p.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
        <Button size="xs" onClick={() => setAdding(true)}>
          Add Plot
        </Button>
      </Group>

      {(adding || editing) && (
        <PlotConfigModal
          spec={editing}
          fluids={fluids}
          tableVars={tableVars}
          hasStates={states.indices.length > 0}
          onSave={editing ? updatePlot : addPlot}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
        />
      )}

      {current === null && (
        <Text size="sm" c="dimmed">
          No plots yet. Click "Add Plot" to create a property diagram (T-s,
          log P-h, P-v, …), a psychrometric chart, or an X-Y plot of
          parametric table runs.
        </Text>
      )}
      {current !== null && (
        <PlotCard
          key={current.id}
          spec={current}
          states={states}
          tableRows={rows}
          tableResults={results}
          onConfigure={() => setEditing(current)}
          onRemove={() => removePlot(current.id)}
        />
      )}
    </Stack>
  )
}
