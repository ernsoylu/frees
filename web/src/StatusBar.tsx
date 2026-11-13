// Phase O: the status bar (with the ribbon, behind its flag). One line under the
// workspace: where Save writes and whether there are unsaved changes, the solve
// state and its duration, the display unit system (opens Preferences), the
// warning count (jumps to the source), the active layout and the engine's
// workers. It reads the same state that feeds the status pill.
import { Group, Text, UnstyledButton } from '@mantine/core'
import type { ReactNode } from 'react'

export interface StatusBarProps {
  save: string
  solve: string
  units: string
  onUnits: () => void
  warnings: number
  onWarnings: () => void
  layout: string
  engine: string
}

function Cell({ children, label, onClick }: Readonly<{ children: ReactNode; label: string; onClick?: () => void }>) {
  const text = (
    <Text size="xs" c="dimmed" truncate="end" style={{ whiteSpace: 'nowrap' }}>
      {children}
    </Text>
  )
  return onClick ? (
    <UnstyledButton onClick={onClick} aria-label={label} title={label} style={{ minWidth: 0 }}>
      {text}
    </UnstyledButton>
  ) : (
    <div title={label} style={{ minWidth: 0 }}>{text}</div>
  )
}

export function StatusBar(p: Readonly<StatusBarProps>) {
  return (
    <Group
      component="footer"
      aria-label="Status bar"
      data-testid="status-bar"
      gap="md"
      wrap="nowrap"
      px="xs"
      h={24}
      style={{ borderTop: '1px solid var(--mantine-color-default-border)', flexShrink: 0, overflow: 'hidden' }}
    >
      <Cell label={`Save: ${p.save}`}>{p.save}</Cell>
      <Cell label={`Solve: ${p.solve}`}>{p.solve}</Cell>
      <div style={{ flex: 1 }} />
      <Cell label={p.warnings ? `${p.warnings} warnings: show the first` : 'No warnings'} onClick={p.warnings ? p.onWarnings : undefined}>
        {p.warnings === 1 ? '1 warning' : `${p.warnings} warnings`}
      </Cell>
      <Cell label={`Display units: ${p.units}. Change in Preferences`} onClick={p.onUnits}>
        Units: {p.units}
      </Cell>
      <Cell label={`Layout: ${p.layout}`}>Layout: {p.layout}</Cell>
      <Cell label={`Engine: ${p.engine}`}>{p.engine}</Cell>
    </Group>
  )
}
