import { Menu, Text } from '@mantine/core'
import { keyLabel, type Commands, type MenuEntry } from './commands'

/** A menu built from registry ids. An unavailable command stays listed, greyed, with its reason as text. */
export function CommandMenuItems({ cmds, entries, size = 14 }: Readonly<{ cmds: Commands; entries: readonly MenuEntry[]; size?: number }>) {
  return (
    <>
      {entries.map((e, i) => {
        if (e === '-') return <Menu.Divider key={`after-${String(entries[i - 1])}`} />
        if (typeof e === 'object') return <Menu.Label key={`l${e.label}`}>{e.label}</Menu.Label>
        const c = cmds[e]
        const Ico = c.icon
        return (
          <div key={c.id}>
            <Menu.Item
              leftSection={<Ico size={size} />}
              // The key is shown, and announced through aria-keyshortcuts, so the item's name stays its label.
              rightSection={c.shortcut && !c.ownedElsewhere ? <Text size="xs" c="dimmed" aria-hidden>{c.shortcut.map(keyLabel).join('+')}</Text> : undefined}
              aria-keyshortcuts={c.shortcut && !c.ownedElsewhere ? c.shortcut.map((k) => (k === 'Mod' ? 'Control' : k)).join('+') : undefined}
              onClick={c.run}
              disabled={c.unavailable !== null}
            >
              {c.label}
            </Menu.Item>
            {(c.unavailable ?? c.menuHint) && (
              <Text size="xs" c="dimmed" px="sm" pb={4}>
                {c.unavailable ?? c.menuHint}
              </Text>
            )}
          </div>
        )
      })}
    </>
  )
}
