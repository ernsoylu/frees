// Story 10.12: Embedded Plotly chart widget.
//
// Renders a PlotSpec on the diagram canvas using the project's full Plotly
// engine (the same buildFigure + data hook the Plots window uses), so a diagram
// can compose live X-Y charts, property diagrams, and psychrometric charts
// alongside the schematic, controls, and gauges. When an active table run is
// supplied, a synced vertical marker is drawn on X-Y figures.

import { useMemo } from 'react'
import type { PlotlyFigure } from 'plotly.js-dist-min'
import { Center, Loader, Text } from '@mantine/core'
import PlotlyChart from '../plots/PlotlyChart'
import { buildFigure, useDiagramData, FigureInputs } from '../plots/PlotCard'
import { PlotSpec } from '../plots/types'

/** Figure inputs supplied by the diagram; diagram/psychart are fetched here. */
export type EmbedInputs = Omit<FigureInputs, 'diagram' | 'psychart' | 'theme'>

export default function EmbeddedPlot({
  spec,
  inputs,
  activeX,
}: Readonly<{
  spec: PlotSpec
  inputs: EmbedInputs
  activeX?: number | null
}>) {
  const { diagram, psychart, loading, error } = useDiagramData(spec)

  const figure = useMemo<PlotlyFigure | null>(() => {
    const f = buildFigure(spec, { ...inputs, diagram, psychart, theme: 'dark' })
    if (f && activeX != null && Number.isFinite(activeX) && spec.kind === 'xy') {
      const shapes = Array.isArray(f.layout.shapes) ? f.layout.shapes.slice() : []
      shapes.push({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: activeX,
        x1: activeX,
        y0: 0,
        y1: 1,
        line: { color: '#4dabf7', width: 1, dash: 'dot' },
      })
      f.layout = { ...f.layout, shapes }
    }
    return f
  }, [spec, inputs, diagram, psychart, activeX])

  if (loading) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    )
  }
  if (error) {
    return (
      <Center h="100%" p="xs">
        <Text size="xs" c="red.5" ta="center">
          {error}
        </Text>
      </Center>
    )
  }
  if (!figure) {
    return (
      <Center h="100%" p="xs">
        <Text size="xs" c="dimmed" ta="center">
          {spec.kind === 'xy'
            ? 'Pick X and Y variables for this chart.'
            : 'Solve a parametric table to populate this plot.'}
        </Text>
      </Center>
    )
  }
  return <PlotlyChart figure={figure} minHeight={0} />
}
