import { useState } from 'react'
import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import type { SavedLayout } from './workspace/layouts'

/** Phase Q: the layouts saved on this device for this screen size. Deleting a
 *  layout removes the saved arrangement only; no window or data is touched. */
export function LayoutsModal({ layouts, form, onApply, onRename, onDelete, onClose }: Readonly<{
  layouts: readonly SavedLayout[]
  form: string
  onApply: (name: string) => void
  /** False when the new name is empty or taken. */
  onRename: (from: string, to: string) => boolean
  onDelete: (name: string) => void
  onClose: () => void
}>) {
  const [renaming, setRenaming] = useState<{ from: string; to: string; error: boolean } | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const commitRename = () => {
    if (!renaming) return
    if (onRename(renaming.from, renaming.to)) setRenaming(null)
    else setRenaming({ ...renaming, error: true })
  }
  return (
    <Modal opened onClose={onClose} title="Manage Layouts" centered size="md">
      <Stack gap="xs">
        <Text size="xs" c="dimmed">
          Saved on this device for a {form} screen. A layout holds the windows, their sizes, and the ribbon tab and density.
        </Text>
        {layouts.length === 0 && <Text size="sm">No saved layouts yet. Arrange the windows, then use Save Layout As….</Text>}
        {layouts.map((l) => (
          <Group key={l.name} gap="xs" wrap="nowrap" role="group" aria-label={l.name}>
            {renaming?.from === l.name ? (
              <TextInput
                size="xs"
                style={{ flex: 1 }}
                aria-label={`New name for ${l.name}`}
                value={renaming.to}
                error={renaming.error ? 'Give it a name no other layout has.' : undefined}
                autoFocus
                onChange={(e) => setRenaming({ from: l.name, to: e.currentTarget.value, error: false })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') { e.stopPropagation(); setRenaming(null) }
                }}
              />
            ) : (
              <Text size="sm" truncate title={l.name} style={{ flex: 1, minWidth: 0 }}>{l.name}</Text>
            )}
            {renaming?.from === l.name ? (
              <Button size="compact-xs" onClick={commitRename}>Save name</Button>
            ) : deleting === l.name ? (
              <>
                <Button size="compact-xs" color="red" onClick={() => { onDelete(l.name); setDeleting(null) }}>Delete layout</Button>
                <Button size="compact-xs" variant="default" onClick={() => setDeleting(null)}>Keep</Button>
              </>
            ) : (
              <>
                <Button size="compact-xs" variant="light" onClick={() => { onApply(l.name); onClose() }}>Apply</Button>
                <Button size="compact-xs" variant="default" onClick={() => setRenaming({ from: l.name, to: l.name, error: false })}>Rename…</Button>
                <Button size="compact-xs" variant="default" onClick={() => setDeleting(l.name)}>Delete…</Button>
              </>
            )}
          </Group>
        ))}
      </Stack>
    </Modal>
  )
}
