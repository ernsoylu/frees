// Phase R: the frame of an analysis tool. Each tool is written once and shown
// either as a dialog or as a dock window, with the same sections in the same
// order: Target, Inputs, Method, Advanced, Run, Results, Apply / Export. A tool
// leaves out a section it has nothing for; it never reorders them.
import { useContext, type ReactNode } from 'react'
import { Button, Group, Modal, Stack, Text, type ModalProps } from '@mantine/core'
import { ToolHostContext, type ToolStep } from './toolHost'

export function ToolFrame({ title, opened = true, onClose, size, children }: Readonly<{
  title: string
  opened?: boolean
  onClose: () => void
  size?: ModalProps['size']
  children: ReactNode
}>) {
  const host = useContext(ToolHostContext)
  const move = host && (
    <Group justify="flex-end" mb={4}>
      <Button size="compact-xs" variant="subtle" color="gray" onClick={host.toggle}>
        {host.docked ? 'Open as Dialog' : 'Dock as Window'}
      </Button>
    </Group>
  )
  if (host?.docked) {
    return (
      <section aria-label={title} data-testid="tool-window" style={{ height: '100%', minHeight: 0, overflow: 'auto', padding: 12 }}>
        {move}
        {children}
      </section>
    )
  }
  return (
    <Modal opened={opened} onClose={onClose} title={title} size={size} centered>
      {move}
      {children}
    </Modal>
  )
}

/** One step of a tool, under its fixed name. */
export function ToolSection({ step, children }: Readonly<{ step: ToolStep; children: ReactNode }>) {
  return (
    <Stack component="section" gap={6} aria-label={step} data-tool-step={step}>
      <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 0.4 }}>{step}</Text>
      {children}
    </Stack>
  )
}
