import React from 'react'
import { Group, List, Stack, Text, Title, Tooltip, Loader, Alert, Paper, Button } from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'
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
  theme?: 'light' | 'dark'
}

function ReportGraph({
  spec,
  variables = [],
  cyclePath,
  tableRows = [],
  tableResults = [],
  caption,
  theme = 'dark',
}: Readonly<ReportGraphProps>) {
  const { diagram, psychart, loading, error } = useDiagramData(spec)
  const states = detectStates(variables)
  const figure = React.useMemo(
    () => buildFigure(spec, { states, cyclePath, tableRows, tableResults, variables, diagram, psychart, theme }),
    [spec, states, cyclePath, tableRows, tableResults, variables, diagram, psychart, theme]
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

interface DocConfig {
  type: 'report' | 'slide'
  size: string
  margin: string
  pageNumber: boolean
}

function parseDocumentTag(line: string): DocConfig | null {
  const typeMatch = line.match(/type=([^\s\]]+)/i)
  const sizeMatch = line.match(/size=([^\s\]]+)/i)
  const marginMatch = line.match(/margin=\(([^)]+)\)/i)
  return {
    type: (typeMatch ? typeMatch[1].toLowerCase() : 'report') as 'report' | 'slide',
    size: sizeMatch ? sizeMatch[1].toLowerCase() : 'a4',
    margin: marginMatch ? marginMatch[1] : '20,20,20,20',
    pageNumber: false
  }
}

function parsePageTag(line: string) {
  const numMatch = line.match(/number=([^\s\]]+)/i)
  return {
    number: numMatch ? numMatch[1].toLowerCase() === 'on' : undefined
  }
}

export default function FormattedReportView({
  report,
  variables,
  plots = [],
  cyclePath,
  tableRows = [],
  tableResults = [],
}: Readonly<FormattedReportViewProps>) {
  const printRef = React.useRef<HTMLDivElement>(null)

  if (!report || report.trim() === '') {
    return (
      <Stack gap="sm" style={{ overflowY: 'auto', flex: 1 }}>
        <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
          No report compiled. Click "Check" (F4) or "Solve" (F2) to compile.
        </Text>
      </Stack>
    )
  }

  const processedReport = report
    .replace(/(\[document[^\]]*\])/gi, '\n$1\n')
    .replace(/(\[\/document\])/gi, '\n$1\n')
    .replace(/(\[page[^\]]*\])/gi, '\n$1\n')
    .replace(/(\[\/page\])/gi, '\n$1\n')

  const lines = processedReport.split('\n')
  
  const outOfDocElements: React.ReactNode[] = []
  let docConfig: DocConfig | null = null
  let pages: { elements: React.ReactNode[], number?: boolean }[] = []
  let currentPage: { elements: React.ReactNode[], number?: boolean } | null = null

  let currentList: React.ReactNode[] = []
  let listKey = 0
  let figureCounter = 0
  const keyFor = makeKeyFactory()

  const flushList = () => {
    if (currentList.length > 0) {
      pushElement(
        <List key={`list-${listKey++}`} spacing="xs" my="xs">
          {currentList}
        </List>
      )
      currentList = []
    }
  }

  const pushElement = (el: React.ReactNode) => {
    if (docConfig) {
      if (!currentPage) {
        currentPage = { elements: [], number: docConfig.pageNumber }
        pages.push(currentPage)
      }
      currentPage.elements.push(el)
    } else {
      outOfDocElements.push(el)
    }
  }

  const pushGraph = (graph: { name: string; caption: string }, key: string) => {
    figureCounter++
    const caption = `Figure ${figureCounter} - ${graph.caption}`
    const spec = plots.find((p) => p.name.toLowerCase() === graph.name.toLowerCase())
    if (spec) {
      pushElement(
        <ReportGraph
          key={key}
          spec={spec}
          variables={variables}
          cyclePath={cyclePath}
          tableRows={tableRows}
          tableResults={tableResults}
          caption={caption}
          theme={docConfig ? 'light' : 'dark'}
        />
      )
    } else {
      pushElement(
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
    const lowerTrimmed = trimmed.toLowerCase()

    if (lowerTrimmed.startsWith('[document')) {
      docConfig = parseDocumentTag(trimmed)
      pages = []
      currentPage = null
      continue
    }

    if (lowerTrimmed === '[/document]') {
      docConfig = null
      continue
    }

    if (lowerTrimmed.startsWith('[page')) {
      flushList()
      const pageCfg = parsePageTag(trimmed)
      if (pageCfg.number !== undefined && docConfig) {
        docConfig.pageNumber = pageCfg.number
      }
      if (lowerTrimmed === '[page]' || lowerTrimmed.startsWith('[page number=')) {
         currentPage = { elements: [], number: docConfig?.pageNumber }
         pages.push(currentPage)
      }
      continue
    }

    if (lowerTrimmed === '[/page]') {
      continue
    }

    if (trimmed === '') {
      flushList()
      pushElement(<div key={key} style={{ height: '0.8em' }} />)
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
      pushElement(
        <Title key={key} order={heading.order} mt={heading.order === 2 ? 'md' : 'sm'} mb="xs" c={docConfig ? "teal.8" : "teal.4"}>
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
        pushElement(
          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '12px 0' }}>
            <MathWithBadges math={math} variables={variables} />
          </div>
        )
      } else {
        pushElement(
          <Text key={key} size="sm" style={{ lineHeight: 1.6 }}>
            {renderInlineContent(line, variables)}
          </Text>
        )
      }
    }
  }

  flushList()

  const handleDownload = async () => {
    if (!printRef.current) return

    const html2pdf = (await import('html2pdf.js')).default

    let pdfFormat: string | [number, number] = 'a4'
    let orientation: 'portrait' | 'landscape' = 'portrait'
    let unit: 'mm' | 'px' = 'mm'

    if (docConfig && docConfig.size !== 'a4') {
      const match = docConfig.size.match(/\(([^,]+),([^)]+)\)/)
      if (match) {
        const w = parseFloat(match[1])
        const h = parseFloat(match[2])
        pdfFormat = [w, h]
        orientation = w > h ? 'landscape' : 'portrait'
        unit = 'px'
      }
    }

    const opt = {
      margin:       0,
      filename:     'document.pdf',
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit, format: pdfFormat, orientation },
      pagebreak:    { mode: ['css', 'legacy'] }
    }
    
    html2pdf().set(opt).from(printRef.current).save()
  }

  const getPageStyle = (): React.CSSProperties => {
    if (!docConfig) return {}
    const isReport = docConfig.type === 'report'
    const unit = isReport ? 'mm' : 'px'
    
    let width = '210mm'
    let height = '297mm'

    if (docConfig.size !== 'a4') {
      const match = docConfig.size.match(/\(([^,]+),([^)]+)\)/)
      if (match) {
        width = match[1] + unit
        height = match[2] + unit
      } else {
        width = '100%'
        height = 'auto'
      }
    }

    let paddingStr = '20mm'
    if (docConfig.margin) {
       paddingStr = docConfig.margin.split(',').map(s => s.trim() + unit).join(' ')
    }

    return {
      width,
      minHeight: height,
      padding: paddingStr,
      backgroundColor: 'white',
      color: 'black',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      position: 'relative',
      boxSizing: 'border-box',
      pageBreakAfter: 'always',
      overflow: 'hidden'
    }
  }

  return (
    <Stack gap="xs" style={{ overflowY: 'auto', flex: 1, paddingRight: 8, paddingBottom: 20 }}>
      {(pages.length > 0 || docConfig) && (
        <Group justify="flex-end" mb="xs" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--mantine-color-body)', padding: '8px 0' }}>
          <Button leftSection={<IconDownload size={16} />} variant="light" onClick={handleDownload}>
            Download PDF
          </Button>
        </Group>
      )}

      {outOfDocElements.length > 0 && (
         <>{outOfDocElements}</>
      )}

      {pages.length > 0 && (
         <div data-mantine-color-scheme="light" ref={printRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
           {pages.map((page, i) => (
             <div key={`page-${i}`} style={getPageStyle()} className="html2pdf__page-break">
                {page.elements}
                {page.number && (
                   <div style={{ position: 'absolute', bottom: '10px', right: '20px', fontSize: '12px', color: '#666' }}>
                     {i + 1}
                   </div>
                )}
             </div>
           ))}
         </div>
      )}
    </Stack>
  )
}
