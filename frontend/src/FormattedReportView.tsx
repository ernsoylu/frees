import React from 'react'
import { List, Stack, Text, Title } from '@mantine/core'
import Latex from './Latex'

interface FormattedReportViewProps {
  report: string
}

interface ParsedPart {
  type: 'text' | 'inline_math' | 'block_math' | 'bold' | 'italic' | 'code'
  value: string
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

function renderInlineContent(text: string): React.ReactNode[] {
  const parts = splitReportText(text)
  return parts.map((part, index) => {
    switch (part.type) {
      case 'inline_math':
        return <Latex key={index} math={part.value} />
      case 'block_math':
        return <Latex key={index} math={part.value} block />
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

export default function FormattedReportView({ report }: Readonly<FormattedReportViewProps>) {
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
          {renderInlineContent(trimmed.substring(2))}
        </Title>
      )
    } else if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <Title key={`h2-${index}`} order={3} mt="sm" mb="xs" c="blue.4">
          {renderInlineContent(trimmed.substring(3))}
        </Title>
      )
    } else if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <Title key={`h3-${index}`} order={4} mt="sm" mb="xs" c="blue.4">
          {renderInlineContent(trimmed.substring(4))}
        </Title>
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(
        <List.Item key={`li-${index}`}>
          {renderInlineContent(trimmed.substring(2))}
        </List.Item>
      )
    } else {
      flushList()
      if (trimmed.startsWith('[MATH_BLOCK:') && trimmed.endsWith(']')) {
        const math = trimmed.substring(12, trimmed.length - 1)
        elements.push(
          <div key={`mathblk-${index}`} style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
            <Latex math={math} block />
          </div>
        )
      } else {
        elements.push(
          <Text key={`p-${index}`} size="sm" style={{ lineHeight: 1.6 }}>
            {renderInlineContent(line)}
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
