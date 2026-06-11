import React from 'react'
import { Badge, Group, List, Stack, Text, Title, Tooltip } from '@mantine/core'
import Latex from './Latex'
import { VariableResult } from './api'
import { formatValue } from './format'

interface FormattedReportViewProps {
  report: string
  variables?: VariableResult[]
}

interface ParsedPart {
  type: 'text' | 'inline_math' | 'block_math' | 'bold' | 'italic' | 'code'
  value: string
}

export function getVariablesInMath(math: string, variables?: VariableResult[]): VariableResult[] {
  if (!variables || variables.length === 0) return []
  
  // Replace LaTeX commands with space
  let s = math.replace(/\\[a-zA-Z]+/g, ' ')
  // Remove curly braces, brackets, and underscores
  s = s.replace(/[\{\}_\[\]]/g, '')
  // Match alphanumeric words starting with a letter
  const words = s.match(/[a-zA-Z][a-zA-Z0-9]*/g) || []
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))

  return variables.filter(v => {
    const cleanName = v.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    return uniqueWords.has(cleanName)
  })
}

export function getLhsVariable(math: string, variables?: VariableResult[]): VariableResult | null {
  if (!variables || variables.length === 0) return null
  const eqIdx = math.indexOf('=')
  if (eqIdx === -1) return null
  const lhsPart = math.substring(0, eqIdx)
  
  // Clean the LHS part
  let s = lhsPart.replace(/\\[a-zA-Z]+/g, ' ')
  s = s.replace(/[\{\}_\[\]]/g, '')
  const words = s.match(/[a-zA-Z][a-zA-Z0-9]*/g) || []
  const firstWord = words[0]
  if (!firstWord) return null
  const firstWordClean = firstWord.toLowerCase()
  return variables.find(v => {
    const cleanName = v.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    return cleanName === firstWordClean
  }) || null
}

export function getTooltipLabel(math: string, variables?: VariableResult[]): string {
  const allVars = getVariablesInMath(math, variables)
  if (allVars.length === 0) return ''
  const lhsVar = getLhsVariable(math, variables)
  
  const sorted = [...allVars]
  if (lhsVar) {
    const idx = sorted.findIndex(v => v.name === lhsVar.name)
    if (idx !== -1) {
      sorted.splice(idx, 1)
      sorted.unshift(lhsVar)
    }
  }
  
  return sorted.map(v => `${v.name} = ${formatValue(v.value)}${v.units ? ` [${v.units}]` : ''}`).join(', ')
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
    if (text.startsWith('[MATH_INLINE:', i)) {
      flushText(i)
      let depth = 1
      let j = i + 13
      while (j < text.length && depth > 0) {
        if (text[j] === '[') {
          depth++
        } else if (text[j] === ']') {
          depth--
        }
        j++
      }
      const mathContent = text.substring(i + 13, j - 1)
      result.push({ type: 'inline_math', value: mathContent })
      i = j
      lastTextStart = i
      continue
    }

    if (text.startsWith('[MATH_BLOCK:', i)) {
      flushText(i)
      let depth = 1
      let j = i + 12
      while (j < text.length && depth > 0) {
        if (text[j] === '[') {
          depth++
        } else if (text[j] === ']') {
          depth--
        }
        j++
      }
      const mathContent = text.substring(i + 12, j - 1)
      result.push({ type: 'block_math', value: mathContent })
      i = j
      lastTextStart = i
      continue
    }

    if (text.startsWith('**', i)) {
      const endBold = text.indexOf('**', i + 2)
      if (endBold !== -1) {
        flushText(i)
        result.push({ type: 'bold', value: text.substring(i + 2, endBold) })
        i = endBold + 2
        lastTextStart = i
        continue
      }
    }

    if (text.startsWith('*', i)) {
      const endItalic = text.indexOf('*', i + 1)
      if (endItalic !== -1) {
        flushText(i)
        result.push({ type: 'italic', value: text.substring(i + 1, endItalic) })
        i = endItalic + 1
        lastTextStart = i
        continue
      }
    }

    if (text.startsWith('`', i)) {
      const endCode = text.indexOf('`', i + 1)
      if (endCode !== -1) {
        flushText(i)
        result.push({ type: 'code', value: text.substring(i + 1, endCode) })
        i = endCode + 1
        lastTextStart = i
        continue
      }
    }

    i++
  }

  flushText(text.length)
  return result
}

function renderInlineContent(text: string, variables?: VariableResult[]): React.ReactNode[] {
  const parts = splitReportText(text)
  return parts.map((part, index) => {
    switch (part.type) {
      case 'inline_math': {
        const tooltip = getTooltipLabel(part.value, variables)
        if (tooltip) {
          return (
            <Tooltip key={index} label={tooltip} withArrow>
              <span style={{ cursor: 'help', borderBottom: '1px dotted var(--mantine-color-blue-4)', display: 'inline-block' }}>
                <Latex math={part.value} />
              </span>
            </Tooltip>
          )
        }
        return <Latex key={index} math={part.value} />
      }
      case 'block_math': {
        const tooltip = getTooltipLabel(part.value, variables)
        const lhsVar = getLhsVariable(part.value, variables)
        const allVars = getVariablesInMath(part.value, variables)
        const otherVars = allVars.filter(v => v.name !== lhsVar?.name)
        
        return (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '12px 0' }}>
            {tooltip ? (
              <Tooltip label={tooltip} withArrow>
                <div style={{ cursor: 'help' }}>
                  <Latex math={part.value} block />
                </div>
              </Tooltip>
            ) : (
              <Latex math={part.value} block />
            )}
            {variables && allVars.length > 0 && (
              <Group gap="xs" justify="center" mt="xs" wrap="wrap">
                {lhsVar && (
                  <Badge variant="light" color="blue" size="sm">
                    {lhsVar.name} = {formatValue(lhsVar.value)} {lhsVar.units ? `[${lhsVar.units}]` : ''}
                  </Badge>
                )}
                {otherVars.map((v) => (
                  <Text key={v.name} size="xs" c="dimmed">
                    {v.name} = {formatValue(v.value)} {v.units ? `[${v.units}]` : ''}
                  </Text>
                ))}
              </Group>
            )}
          </div>
        )
      }
      case 'bold':
        return <strong key={index}>{part.value}</strong>
      case 'italic':
        return <em key={index}>{part.value}</em>
      case 'code':
        return (
          <code
            key={index}
            style={{
              fontFamily: 'var(--mantine-font-family-monospace)',
              backgroundColor: 'var(--mantine-color-dark-6)',
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

export default function FormattedReportView({ report, variables }: Readonly<FormattedReportViewProps>) {
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

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (trimmed === '') {
      flushList()
      elements.push(<div key={`space-${index}`} style={{ height: '0.8em' }} />)
      return
    }

    if (trimmed.startsWith('# ')) {
      flushList()
      elements.push(
        <Title key={`h1-${index}`} order={2} mt="md" mb="xs" c="blue.4">
          {renderInlineContent(trimmed.substring(2), variables)}
        </Title>
      )
    } else if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <Title key={`h2-${index}`} order={3} mt="sm" mb="xs" c="blue.4">
          {renderInlineContent(trimmed.substring(3), variables)}
        </Title>
      )
    } else if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <Title key={`h3-${index}`} order={4} mt="sm" mb="xs" c="blue.4">
          {renderInlineContent(trimmed.substring(4), variables)}
        </Title>
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(
        <List.Item key={`li-${index}`}>
          {renderInlineContent(trimmed.substring(2), variables)}
        </List.Item>
      )
    } else {
      flushList()
      if (trimmed.startsWith('[MATH_BLOCK:') && trimmed.endsWith(']')) {
        const math = trimmed.substring(12, trimmed.length - 1)
        const tooltip = getTooltipLabel(math, variables)
        const lhsVar = getLhsVariable(math, variables)
        const allVars = getVariablesInMath(math, variables)
        const otherVars = allVars.filter(v => v.name !== lhsVar?.name)
        
        elements.push(
          <div key={`mathblk-${index}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '12px 0' }}>
            {tooltip ? (
              <Tooltip label={tooltip} withArrow>
                <div style={{ cursor: 'help' }}>
                  <Latex math={math} block />
                </div>
              </Tooltip>
            ) : (
              <Latex math={math} block />
            )}
            {variables && allVars.length > 0 && (
              <Group gap="xs" justify="center" mt="xs" wrap="wrap">
                {lhsVar && (
                  <Badge variant="light" color="blue" size="sm">
                    {lhsVar.name} = {formatValue(lhsVar.value)} {lhsVar.units ? `[${lhsVar.units}]` : ''}
                  </Badge>
                )}
                {otherVars.map((v) => (
                  <Text key={v.name} size="xs" c="dimmed">
                    {v.name} = {formatValue(v.value)} {v.units ? `[${v.units}]` : ''}
                  </Text>
                ))}
              </Group>
            )}
          </div>
        )
      } else {
        elements.push(
          <Text key={`p-${index}`} size="sm" style={{ lineHeight: 1.6 }}>
            {renderInlineContent(line, variables)}
          </Text>
        )
      }
    }
  })

  flushList()

  return (
    <Stack gap="xs" style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
      {elements}
    </Stack>
  )
}
