import { useState } from 'react'
import { Button, Group, Modal, ScrollArea, Stack, Text, TextInput } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { commandHome, type Command, type CommandId, type Commands } from './commands'

/** Phase R: find a command by name and see where it lives; Show goes there without running it. */
export function WhereIsModal({ commands, ribbon, onShow, onClose }: Readonly<{
  commands: Commands
  ribbon: boolean
  onShow: (id: CommandId) => void
  onClose: () => void
}>) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const match = (c: Command) => !q || c.label.toLowerCase().includes(q) || (c.aliases ?? []).some((a) => a.toLowerCase().includes(q))
  const rows = Object.values(commands).filter((c) => c.group !== null && match(c)).slice(0, 40)
  return (
    <Modal opened onClose={onClose} title="Where Is a Command?" centered size="md">
      <Stack gap="sm">
        <TextInput
          data-autofocus
          aria-label="Search commands"
          placeholder="Search commands"
          leftSection={<IconSearch size={14} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && rows[0]) onShow(rows[0].id)
          }}
        />
        <ScrollArea.Autosize mah={420}>
          <Stack gap={2}>
            {rows.length === 0 && <Text size="xs" c="dimmed">No command matches.</Text>}
            {rows.map((c) => {
              const home = commandHome(c.id, ribbon)
              return (
                <Group key={c.id} gap="xs" wrap="nowrap" justify="space-between" data-where={c.id}>
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" truncate>{c.label}</Text>
                    <Text size="xs" c="dimmed" truncate title={home.path}>{home.path}</Text>
                  </div>
                  {home.tab && (
                    <Button size="compact-xs" variant="light" aria-label={`Show ${c.label} on the ribbon`} onClick={() => onShow(c.id)}>
                      Show
                    </Button>
                  )}
                </Group>
              )
            })}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  )
}
