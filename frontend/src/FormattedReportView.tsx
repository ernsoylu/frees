import React from 'react'
import { Group, List, Stack, Text, Title, Tooltip, Loader, Alert, Paper } from '@mantine/core'
import Latex from './Latex'
import { VariableResult, TableRowResult } from './api'
import { MathWithBadges, getTooltipLabel } from './mathBadges'
import { useDiagramData, buildFigure } from './plots/PlotCard'
import PlotlyChart from './plots/PlotlyChart'
import { detectStates } from './plots/stateTable'
import { PlotSpec } from './plots/types'
import { ParamRow } from './ParametricTableTab'

interface FormattedReportViewProps {
  report: string
  variables?: VariableResult[]
  plots?: PlotSpec[]
  cyclePath?: Record<string, number>[]
  tableRows?: ParamRow[]
  tableResults?: TableRowResult[]
}

interface ParsedPart {
  type: 'text' | 'inline_math' | 'block_math' | 'bold' | 'italic' | 'code'
  value: string
}

const MATH_MARKERS = [
  { tag: '[MATH_INLINE:', type: 'inline_math' },
  { tag: '[MATH_BLOCK:', type: 'block_math' },
] as const

const SPAN_MARKERS = [
  { delim: '**', type: 'bold' },
  { delim: '*', type: 'italic' },
  { delim: '`', type: 'code' },
] as const

/** Scans past a [MATH_...: tag, tracking bracket depth, and returns the content. */
function scanBracketedMath(text: string, start: number, tagLength: number): { value: string; end: number } {
  let depth = 1
  let j = start + tagLength
  while (j < text.length && depth > 0) {
    if (text[j] === '[') {
      depth++
    } else if (text[j] === ']') {
      depth--
    }
    j++
  }
  return { value: text.substring(start + tagLength, j - 1), end: j }
}

function splitReportText(text: string): ParsedPart[] {
  const result: ParsedPart[] = []
  let i = 0
  let lastTextStart = 0

  const flushText = (endIdx: number) => {
    if (endIdx > lastTextStart) {
      result.push({ type: 'text', value: text.substring(lastTextStart, endIdx) })
    }
  }

  while (i < text.length) {
    const math = MATH_MARKERS.find((m) => text.startsWith(m.tag, i))
    if (math) {
      flushText(i)
      const { value, end } = scanBracketedMath(text, i, math.tag.length)
      result.push({ type: math.type, value })
      i = end
      lastTextStart = i
      continue
    }

    const span = SPAN_MARKERS.find((m) => text.startsWith(m.delim, i))
    if (span) {
      const endIdx = text.indexOf(span.delim, i + span.delim.length)
      if (endIdx !== -1) {
        flushText(i)
        result.push({ type: span.type, value: text.substring(i + span.delim.length, endIdx) })
        i = endIdx + span.delim.length
        lastTextStart = i
        continue
      }
    }

    i++
  }

  flushText(text.length)
  return result
}

/**
 * Block-rendered equation with a value tooltip and solved-variable badges.
 * Shared by the formatted report and the plain formatted-equations panel.
 */
/** Content-derived React keys: identical parts get an occurrence suffix. */
function makeKeyFactory() {
  const seen = new Map<string, number>()
  return (kind: string, value: string) => {
    const base = `${kind}:${value}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return `${base}#${n}`
  }
}

function renderInlineContent(text: string, variables?: VariableResult[]): React.ReactNode[] {
  const parts = splitReportText(text)
  const keyFor = makeKeyFactory()
  return parts.map((part) => {
    const key = keyFor(part.type, part.value)
    switch (part.type) {
      case 'inline_math': {
        const tooltip = getTooltipLabel(part.value, variables)
        if (tooltip) {
          return (
            <Tooltip key={key} label={tooltip} withArrow>
              <span style={{ cursor: 'help', borderBottom: '1px dotted var(--mantine-color-teal-4)', display: 'inline-block' }}>
                <Latex math={part.value} />
              </span>
            </Tooltip>
          )
        }
        return <Latex key={key} math={part.value} />
      }
      case 'block_math':
        return (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '12px 0' }}>
            <MathWithBadges math={part.value} variables={variables} />
          </div>
        )
      case 'bold':
        return <strong key={key}>{part.value}</strong>
      case 'italic':
        return <em key={key}>{part.value}</em>
      case 'code':
        return (
          <code
            key={key}
            style={{
              fontFamily: 'var(--mantine-font-family-monospace)',
              backgroundColor: 'var(--mantine-color-default)',
              padding: '2px 4px',
              borderRadius: '4px',
              fontSize: '90%',
            }}
          >
            {part.value}
          </code>
        )
      default:
        return part.value
    }
  })
}

interface ReportGraphProps {
  spec: PlotSpec
  variables?: VariableResult[]
  cyclePath?: Record<string, number>[]
  tableRows?: ParamRow[]
  tableResults?: TableRowResult[]
  caption: string
}

function ReportGraph({
  spec,
  variables = [],
  cyclePath,
  tableRows = [],
  tableResults = [],
  caption,
}: Readonly<ReportGraphProps>) {
  const { diagram, psychart, loading, error } = useDiagramData(spec)
  const states = detectStates(variables)
  const figure = React.useMemo(
    () => buildFigure(spec, { states, cyclePath, tableRows, tableResults, variables, diagram, psychart, theme: 'dark' }),
    [spec, states, cyclePath, tableRows, tableResults, variables, diagram, psychart]
  )

  if (loading) {
    return (
      <Group gap="xs" justify="center" p="md" key={spec.id}>
        <Loader size="xs" />
        <Text size="sm" c="dimmed">
          Loading diagram {spec.name}...
        </Text>
      </Group>
    )
  }

  if (error) {
    return (
      <Alert color="red" mb="xs" key={spec.id}>
        Failed to load diagram: {error}
      </Alert>
    )
  }

  return (
    <Stack align="center" gap="xs" my="md" key={spec.id}>
      {figure ? (
        <div style={{ width: '100%', maxWidth: 650, height: 400, border: '1px solid var(--mantine-color-default-border)', borderRadius: 4, overflow: 'hidden' }}>
          <PlotlyChart figure={figure} />
        </div>
      ) : (
        <Text size="sm" c="dimmed">No data for diagram {spec.name}.</Text>
      )}
      <Text size="sm" c="dimmed" style={{ fontStyle: 'italic', textAlign: 'center' }}>
        {caption}
      </Text>
    </Stack>
  )
}

/**
 * Parses a [Graph="Name"] Caption [/Graph] line without regular expressions
 * (the equivalent regex is vulnerable to super-linear backtracking).
 */
function parseGraphTag(trimmed: string): { name: string; caption: string } | null {
  const lower = trimmed.toLowerCase()
  if (!lower.startsWith('[graph=') || !lower.endsWith('[/graph]')) return null
  const closeIdx = trimmed.indexOf(']')
  if (closeIdx === -1 || closeIdx > trimmed.length - 8) return null
  let name = trimmed.substring(7, closeIdx).trim()
  if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
    name = name.substring(1, name.length - 1)
  }
  name = name.trim()
  if (!name) return null
  const caption = trimmed.substring(closeIdx + 1, trimmed.length - 8).trim()
  return { name, caption }
}

function ReportGraphPlaceholder({
  name,
  caption,
}: Readonly<{
  name: string
  caption: string
}>) {
  return (
    <Stack align="center" gap="xs" my="md">
      <Paper
        withBorder
        p="xl"
        style={{
          width: '100%',
          maxWidth: 650,
          height: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderStyle: 'dashed',
          backgroundColor: 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))',
        }}
      >
        <Text size="sm" c="dimmed" style={{ textAlign: 'center' }}>
          ⚠️ Diagram "{name}" is not generated yet. Please generate {name}.
        </Text>
      </Paper>
      <Text size="sm" c="dimmed" style={{ fontStyle: 'italic', textAlign: 'center' }}>
        {caption}
      </Text>
    </Stack>
  )
}

export default function FormattedReportView({
  report,
  variables,
  plots = [],
  cyclePath,
  tableRows = [],
  tableResults = [],
}: Readonly<FormattedReportViewProps>) {
  if (!report || report.trim() === '') {
    return (
      <Stack gap="sm" style={{ overflowY: 'auto', flex: 1 }}>
        <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
          No report compiled. Click "Check" (F4) or "Solve" (F2) to compile.
        </Text>
      </Stack>
    )
  }

  const lines = report.split('\n')
  const elements: React.ReactNode[] = []
  let currentList: React.ReactNode[] = []
  let listKey = 0
  let figureCounter = 0
  const keyFor = makeKeyFactory()

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <List key={`list-${listKey++}`} spacing="xs" my="xs">
          {currentList}
        </List>
      )
      currentList = []
    }
  }

  const pushGraph = (graph: { name: string; caption: string }, key: string) => {
    figureCounter++
    const caption = `Figure ${figureCounter} - ${graph.caption}`
    const spec = plots.find((p) => p.name.toLowerCase() === graph.name.toLowerCase())
    if (spec) {
      elements.push(
        <ReportGraph
          key={key}
          spec={spec}
          variables={variables}
          cyclePath={cyclePath}
          tableRows={tableRows}
          tableResults={tableResults}
          caption={caption}
        />
      )
    } else {
      elements.push(
        <ReportGraphPlaceholder key={key} name={graph.name} caption={caption} />
      )
    }
  }

  const headingOrder = (trimmed: string): { order: 2 | 3 | 4; text: string } | null => {
    if (trimmed.startsWith('# ')) return { order: 2, text: trimmed.substring(2) }
    if (trimmed.startsWith('## ')) return { order: 3, text: trimmed.substring(3) }
    if (trimmed.startsWith('### ')) return { order: 4, text: trimmed.substring(4) }
    return null
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const key = keyFor('line', trimmed)

    if (trimmed === '') {
      flushList()
      elements.push(<div key={key} style={{ height: '0.8em' }} />)
      continue
    }

    const graph = parseGraphTag(trimmed)
    if (graph) {
      flushList()
      pushGraph(graph, key)
      continue
    }

    const heading = headingOrder(trimmed)
    if (heading) {
      flushList()
      elements.push(
        <Title key={key} order={heading.order} mt={heading.order === 2 ? 'md' : 'sm'} mb="xs" c="teal.4">
          {renderInlineContent(heading.text, variables)}
        </Title>
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(
        <List.Item key={key}>
          {renderInlineContent(trimmed.substring(2), variables)}
        </List.Item>
      )
    } else {
      flushList()
      if (trimmed.startsWith('[MATH_BLOCK:') && trimmed.endsWith(']')) {
        const math = trimmed.substring(12, trimmed.length - 1)
        elements.push(
          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '12px 0' }}>
            <MathWithBadges math={math} variables={variables} />
          </div>
        )
      } else {
        elements.push(
          <Text key={key} size="sm" style={{ lineHeight: 1.6 }}>
            {renderInlineContent(line, variables)}
          </Text>
        )
      }
    }
  }

  flushList()

  return (
    <Stack gap="xs" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
      {elements}
    </Stack>
  )
}
