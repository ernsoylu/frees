import React from 'react'
import { List, Stack, Text, Title } from '@mantine/core'
import Latex from './Latex'

interface FormattedReportViewProps {
  report: string
}

function renderInlineContent(text: string): React.ReactNode[] {
  // Regex to split by inline math, block math, bold, italic, and inline code
  const parts = text.split(/(\[MATH_INLINE:[^\]]+\]|\[MATH_BLOCK:[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith('[MATH_INLINE:') && part.endsWith(']')) {
      const math = part.substring(13, part.length - 1)
      return <Latex key={index} math={math} />
    }
    if (part.startsWith('[MATH_BLOCK:') && part.endsWith(']')) {
      const math = part.substring(12, part.length - 1)
      return <Latex key={index} math={math} block />
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.substring(2, part.length - 2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.substring(1, part.length - 1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} style={{
        fontFamily: 'var(--mantine-font-family-monospace)',
        backgroundColor: 'var(--mantine-color-dark-6)',
        padding: '2px 4px',
        borderRadius: '4px',
        fontSize: '90%'
      }}>{part.substring(1, part.length - 1)}</code>
    }
    return part
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
