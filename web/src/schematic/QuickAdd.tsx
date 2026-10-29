// COMP-01/02: find a component and place it on the canvas. A catalog choice is
// configured in the component wizard before anything is written; a type the
// document defines itself is placed directly. Escape writes nothing.

import { useMemo, useState } from 'react'
import { Badge, Checkbox, Group, Paper, ScrollArea, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { COMPONENT_DRAG_TYPE, MAX_SHOWN, searchLibrary, type QuickAddChoice } from './wiring'

export function QuickAdd({
  at,
  localTypes,
  fits,
  onChoose,
  onCancel,
}: Readonly<{
  /** Screen position inside the viewport. */
  at: { x: number; y: number }
  localTypes: readonly string[]
  /** An armed port: offer types that can take its wire. */
  fits?: { label: string; domain: string } | null
  onChoose: (choice: QuickAddChoice) => void
  onCancel: () => void
}>) {
  const [query, setQuery] = useState('')
  const [onlyFitting, setOnlyFitting] = useState(Boolean(fits))
  const [cursor, setCursor] = useState(0)
  const results = useMemo(
    () => searchLibrary(query, localTypes, onlyFitting ? fits?.domain : null),
    [query, localTypes, onlyFitting, fits],
  )
  const shown = results.slice(0, MAX_SHOWN)
  const choose = (k: number) => shown[k] && onChoose({ type: shown[k].type, local: shown[k].local })
  return (
    <Paper
      withBorder
      shadow="md"
      p="xs"
      radius="sm"
      role="dialog"
      aria-label="Add component"
      data-testid="quick-add"
      style={{ position: 'absolute', left: at.x, top: at.y, width: 340, zIndex: 8 }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <TextInput
        size="xs"
        autoFocus
        aria-label="Search components"
        placeholder="Search by name, tag, library…"
        value={query}
        onChange={(e) => {
          setQuery(e.currentTarget.value)
          setCursor(0)
        }}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') onCancel()
          else if (e.key === 'Enter') choose(cursor)
          else if (e.key === 'ArrowDown') setCursor((c) => Math.min(c + 1, shown.length - 1))
          else if (e.key === 'ArrowUp') setCursor((c) => Math.max(c - 1, 0))
          else return
          e.preventDefault()
        }}
      />
      {fits && (
        <Checkbox
          size="xs"
          mt={6}
          label={`Only types that fit ${fits.label} (${fits.domain})`}
          checked={onlyFitting}
          onChange={(e) => setOnlyFitting(e.currentTarget.checked)}
        />
      )}
      <Text size="xs" c="dimmed" mt={4}>
        {results.length === 0
          ? `Nothing matches "${query}"${onlyFitting ? ' among fitting types' : ''}. Try another word${onlyFitting ? ' or clear the filter' : ''}.`
          : `${results.length} component${results.length === 1 ? '' : 's'}${results.length > MAX_SHOWN ? ` — first ${MAX_SHOWN} shown` : ''}. Enter or click to configure; drag onto the canvas to place.`}
      </Text>
      <ScrollArea.Autosize mah={300} type="auto" mt={4}>
        <Stack gap={2} role="listbox" aria-label="Components">
          {shown.map((r, k) => (
            <UnstyledButton
              key={`${r.local}:${r.type}`}
              role="option"
              aria-selected={k === cursor}
              draggable
              onDragStart={(e) => e.dataTransfer.setData(COMPONENT_DRAG_TYPE, JSON.stringify({ type: r.type, local: r.local }))}
              onMouseEnter={() => setCursor(k)}
              onClick={() => choose(k)}
              style={{ borderRadius: 4, padding: '3px 6px', background: k === cursor ? 'var(--mantine-color-default-hover)' : undefined }}
            >
              <Group gap={6} wrap="nowrap" justify="space-between">
                <Text size="xs" fw={600}>
                  {r.type}
                </Text>
                <Badge size="xs" variant="light" color={r.local ? 'violet' : 'gray'}>
                  {r.local ? 'local' : r.library}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {r.summary}
              </Text>
            </UnstyledButton>
          ))}
        </Stack>
      </ScrollArea.Autosize>
    </Paper>
  )
}
