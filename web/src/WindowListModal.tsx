import { useState } from 'react'
import { ActionIcon, Badge, Group, Modal, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { IconSearch, IconX } from '@tabler/icons-react'
import { groupWindows, type DockWindow } from './workspace/windowActions'

/** Phase Q: every open window, searchable and grouped by kind. Choosing a row
 *  goes to that window; closing one here closes the view, never its data. */
export function WindowListModal({ windows, activeId, onFocus, onCloseWindow, onClose }: Readonly<{
  windows: readonly DockWindow[]
  activeId: string | undefined
  onFocus: (id: string) => void
  onCloseWindow: (id: string) => void
  onClose: () => void
}>) {
  const [query, setQuery] = useState('')
  const groups = groupWindows(windows, query)
  return (
    <Modal opened onClose={onClose} title="Window List" centered size="md">
      <Stack gap="sm">
        <TextInput
          data-autofocus
          aria-label="Search windows"
          placeholder="Search windows"
          leftSection={<IconSearch size={14} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            const first = groups[0]?.windows[0]
            if (e.key === 'Enter' && first) {
              onFocus(first.id)
              onClose()
            }
          }}
        />
        {groups.length === 0 && <Text size="sm" c="dimmed">{windows.length === 0 ? 'No windows are open.' : 'No window matches.'}</Text>}
        {groups.map((g) => (
          <Stack key={g.label} gap={2} role="group" aria-label={g.label}>
            <Text size="xs" c="dimmed" fw={600}>{g.label}</Text>
            {g.windows.map((w) => (
              <Group key={w.id} gap="xs" wrap="nowrap">
                <UnstyledButton
                  onClick={() => { onFocus(w.id); onClose() }}
                  aria-current={w.id === activeId ? 'true' : undefined}
                  title={w.title}
                  style={{ flex: 1, minWidth: 0, padding: '4px 8px', borderRadius: 'var(--mantine-radius-sm)', background: w.id === activeId ? 'var(--mantine-color-default-hover)' : undefined }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>{w.title}</Text>
                    {w.id === activeId && <Badge size="xs" variant="light">active</Badge>}
                    {w.place !== 'grid' && <Badge size="xs" variant="default">{w.place}</Badge>}
                    {w.maximized && <Badge size="xs" variant="default">maximized</Badge>}
                  </Group>
                </UnstyledButton>
                <ActionIcon variant="subtle" color="gray" size="sm" aria-label={`Close view ${w.title}`} onClick={() => onCloseWindow(w.id)}>
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        ))}
      </Stack>
    </Modal>
  )
}
