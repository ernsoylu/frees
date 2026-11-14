import type { ReactNode } from 'react'
import { Menu } from '@mantine/core'
import { CommandMenuItems } from './CommandMenuItems'
import type { Commands, MenuEntry } from './commands'

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

/** A context menu of registry commands, with the handlers for the thing it was opened on. */
export function CommandContextMenu({ at, label, cmds, entries, onClose }: Readonly<{ at: { x: number; y: number }; label: string; cmds: Commands; entries: readonly MenuEntry[]; onClose: () => void }>) {
  return (
    <ContextMenu at={at} label={label} onClose={onClose}>
      <CommandMenuItems cmds={cmds} entries={entries} />
    </ContextMenu>
  )
}

/** Where to open a menu for `e`: at the pointer, or under the element when a key asked for it. */
export function menuPoint(e: { clientX?: number; clientY?: number; currentTarget: Element }): { x: number; y: number } {
  if (e.clientX || e.clientY) return { x: e.clientX ?? 0, y: e.clientY ?? 0 }
  const r = e.currentTarget.getBoundingClientRect()
  return { x: r.left, y: r.bottom }
}

/** Whether a key asks for the context menu of the focused element. */
export const isMenuKey = (e: { key: string; shiftKey: boolean }) => e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)
