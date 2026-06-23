import { Badge, Group, Text, Tooltip } from '@mantine/core'
import Latex from './Latex'
import { VariableResult } from './api'
import { formatValue } from './format'

// Lightweight KaTeX + solved-value badge rendering.

export function getVariablesInMath(math: string, variables?: VariableResult[]): VariableResult[] {
  if (!variables || variables.length === 0) return []

  // Replace LaTeX commands with space
  let s = math.replace(/\\[a-zA-Z]+/g, ' ')
  // Remove curly braces, brackets, and underscores
  s = s.replace(/[{}_[\]]/g, '')
  // Match alphanumeric words starting with a letter
  const words = s.match(/[a-zA-Z][a-zA-Z0-9]*/g) || []
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()))

  return variables.filter((v) => {
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
  s = s.replace(/[{}_[\]]/g, '')
  const words = s.match(/[a-zA-Z][a-zA-Z0-9]*/g) || []
  const firstWord = words[0]
  if (!firstWord) return null
  const firstWordClean = firstWord.toLowerCase()
  return (
    variables.find((v) => {
      const cleanName = v.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
      return cleanName === firstWordClean
    }) || null
  )
}

export function getTooltipLabel(math: string, variables?: VariableResult[]): string {
  const allVars = getVariablesInMath(math, variables)
  if (allVars.length === 0) return ''
  const lhsVar = getLhsVariable(math, variables)

  const sorted = [...allVars]
  if (lhsVar) {
    const idx = sorted.findIndex((v) => v.name === lhsVar.name)
    if (idx !== -1) {
      sorted.splice(idx, 1)
      sorted.unshift(lhsVar)
    }
  }

  return sorted
    .map((v) => {
      const units = v.units ? ` [${v.units}]` : ''
      return `${v.name} = ${formatValue(v.value)}${units}`
    })
    .join(', ')
}

export function MathWithBadges({
  math,
  variables,
}: Readonly<{ math: string; variables?: VariableResult[] }>) {
  const tooltip = getTooltipLabel(math, variables)
  const lhsVar = getLhsVariable(math, variables)
  const allVars = getVariablesInMath(math, variables)
  const otherVars = allVars.filter((v) => v.name !== lhsVar?.name)

  return (
    <>
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
            <Badge variant="light" color="teal" size="sm">
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
    </>
  )
}
