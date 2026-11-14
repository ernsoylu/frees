import type { ReactNode } from 'react'
import { Menu } from '@mantine/core'

/** A menu opened at a point (a right click, or the keyboard's menu key on a focused row). */
export function ContextMenu({ at, label, onClose, children }: Readonly<{ at: { x: number; y: number }; label: string; onClose: () => void; children: ReactNode }>) {
  return (
    <Menu opened onChange={(o) => { if (!o) onClose() }} position="bottom-start" shadow="md" width={250} withinPortal>
      <Menu.Target>
        <span style={{ position: 'fixed', left: at.x, top: at.y, width: 0, height: 0 }} />
      </Menu.Target>
      <Menu.Dropdown aria-label={label}>{children}</Menu.Dropdown>
    </Menu>
  )
}
