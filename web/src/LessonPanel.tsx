import { useEffect, useRef, useState } from 'react'
import { ActionIcon, Badge, Button, Group, Paper, ScrollArea, SegmentedControl, Stack, Text, Tooltip } from '@mantine/core'
import { IconRefresh, IconX } from '@tabler/icons-react'
import Latex from './Latex'
import { directionOf, PREDICTIONS, type Lesson, type Prediction } from './lessons'
import { formatCompact } from './schematic/readouts'

interface Props {
  lesson: Lesson
  /** A solved value by name (case-insensitive). */
  value: (name: string) => number | undefined
  solving: boolean
  /** Set one of the lesson's sliders and solve. */
  onSet: (name: string, value: number) => void
  /** Restore the lesson's baseline sliders and solve. */
  onReset: () => void
  onOpenPair?: () => void
  pairTitle?: string
  onClose: () => void
}

/**
 * Phase I2: the lesson beside a gallery example — predict, change one input,
 * observe, explain, check. The observed numbers are the model's own solves;
 * the example's CHECKs remain the grade.
 */
export default function LessonPanel({ lesson, value, solving, onSet, onReset, onOpenPair, pairTitle, onClose }: Readonly<Props>) {
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [before, setBefore] = useState<number | null>(null)
  const [after, setAfter] = useState<number | null>(null)
  const waiting = useRef(false)
  const current = value(lesson.observe.variable)

  // The change's solve has landed when solving falls back to false.
  useEffect(() => {
    if (!waiting.current || solving) return
    waiting.current = false
    setAfter(current ?? null)
  }, [solving, current])

  const change = () => {
    setBefore(current ?? null)
    setAfter(null)
    waiting.current = true
    onSet(lesson.change.variable, lesson.change.to)
  }
  const reset = () => {
    setPrediction(null)
    setBefore(null)
    setAfter(null)
    waiting.current = false
    onReset()
  }
  const observed = before !== null && after !== null ? directionOf(before, after) : null

  return (
    <Paper withBorder shadow="md" p="sm" w={360} role="region" aria-label={`Lesson: ${lesson.title}`} data-testid="lesson-panel" style={{ position: 'fixed', right: 16, bottom: 48, zIndex: 300 }}>
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <Group gap={6} wrap="nowrap">
          <Badge size="xs" variant="light" color="grape">Lesson</Badge>
          <Text size="sm" fw={600}>{lesson.title}</Text>
        </Group>
        <Group gap={2} wrap="nowrap">
          <Tooltip label="Reset to the lesson’s starting values">
            <ActionIcon size="sm" variant="subtle" aria-label="Reset lesson" onClick={reset}><IconRefresh size={14} /></ActionIcon>
          </Tooltip>
          <ActionIcon size="sm" variant="subtle" aria-label="Close lesson" onClick={onClose}><IconX size={14} /></ActionIcon>
        </Group>
      </Group>
      <ScrollArea.Autosize mah={420}>
        <Stack gap={8}>
          <Text size="xs">{lesson.objective}</Text>
          <Text size="xs" c="dimmed">Before you start: {lesson.prerequisites.join(' · ')}</Text>
          <Latex math={lesson.equation} block />

          <Text size="xs" fw={600}>1 · Predict</Text>
          <Text size="xs">{lesson.predict}</Text>
          <SegmentedControl size="xs" fullWidth aria-label="Your prediction" data={[...PREDICTIONS]} value={prediction ?? ''} onChange={(v) => setPrediction(v as Prediction)} />

          <Text size="xs" fw={600}>2 · Change one input</Text>
          <Button size="xs" variant="light" disabled={prediction === null || solving || before !== null} onClick={change}>
            {lesson.change.label}
          </Button>

          <Text size="xs" fw={600}>3 · Observe</Text>
          <Text size="xs" data-testid="lesson-observe">
            {before === null
              ? `Watch the ${lesson.observe.label}${current !== undefined ? `, now ${formatCompact(current)}` : ''}.`
              : after === null
                ? 'Solving…'
                : `The ${lesson.observe.label} went from ${formatCompact(before)} to ${formatCompact(after)}: it ${observed}.`}
          </Text>

          {observed && (
            <>
              <Text size="xs" fw={600}>4 · Explain</Text>
              <Text size="xs">{lesson.explain}</Text>
              <Text size="xs" fw={600}>5 · Check</Text>
              <Text size="xs" data-testid="lesson-check" c={observed === prediction ? 'teal' : 'orange'}>
                {observed === prediction ? `✓ You predicted it ${prediction}.` : `✗ You predicted it ${prediction}; the model shows it ${observed}.`}
              </Text>
              {observed !== lesson.observe.expect && (
                <Text size="xs" c="red" data-testid="lesson-unexpected">
                  The model did not show the trend this lesson promises ({lesson.observe.expect}). Reset, or check the model’s edits.
                </Text>
              )}
            </>
          )}

          <Text size="xs" c="dimmed">
            Sliders this lesson approves: {lesson.sliders.map((s) => `${s.name} ${formatCompact(s.min)}–${formatCompact(s.max)} ${s.units}`).join(', ')}.
          </Text>
          {onOpenPair && pairTitle && (
            <Button size="xs" variant="subtle" onClick={onOpenPair}>The same idea in another domain: {pairTitle}</Button>
          )}
          <Text size="xs" c="dimmed">Sources: {lesson.sources.join('; ')}</Text>
        </Stack>
      </ScrollArea.Autosize>
    </Paper>
  )
}
