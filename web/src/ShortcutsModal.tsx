import { Kbd, Modal, Stack, Table, Text } from '@mantine/core'
import { CANVAS_COMMANDS, canvasKeys, keysOf } from './schematic/commands'
import { keyLabel, shortcutRows, type Commands } from './commands'

interface Props {
  opened: boolean
  onClose: () => void
  /** The registry: every command with a key is listed (N4). */
  commands: Commands
}

interface Shortcut {
  keys: string[]
  action: string
}

// The schematic's own keys act only while the drawing has focus; single keys
// show as the user rebound them.
const canvasShortcuts = (): Shortcut[] => {
  const keys = canvasKeys()
  return CANVAS_COMMANDS.filter((c) => c.keys.length > 0).map((c) => ({
    keys: keysOf(c, keys).map((k) => keyLabel(k === 'Ctrl' ? 'Mod' : k)),
    action: `Schematic: ${c.label}`,
  }))
}

// A read-only reference of the global keyboard shortcuts, opened with "?" or
// from the command palette — so hotkeys aren't only discoverable via the
// welcome banner and Help portal.
export default function ShortcutsModal({ opened, onClose, commands }: Readonly<Props>) {
  return (
    <Modal opened={opened} onClose={onClose} title="Keyboard Shortcuts" size="md" centered>
      <Stack gap="sm">
        <Table verticalSpacing="xs">
          <Table.Tbody>
            {[...shortcutRows(commands), ...(opened ? canvasShortcuts() : [])].map((s) => (
              <Table.Tr key={s.action}>
                <Table.Td style={{ width: 140, whiteSpace: 'nowrap' }}>
                  {s.keys.map((k, i) => (
                    <span key={k}>
                      {i > 0 && <Text component="span" c="dimmed" mx={4}>+</Text>}
                      <Kbd>{k}</Kbd>
                    </span>
                  ))}
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{s.action}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Text size="xs" c="dimmed">
          Equations can be entered in any order and variable names are
          case-insensitive. See Help for the full language reference.
        </Text>
      </Stack>
    </Modal>
  )
}
