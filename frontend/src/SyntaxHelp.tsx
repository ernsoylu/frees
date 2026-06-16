import { Anchor, Button, Code, List, Popover, Stack, Text } from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'

// A lightweight, in-context cheat sheet for the frees language, anchored next
// to the editor so students don't have to leave for the Help portal to recall
// the basic rules. Deeper reference stays in /help.
export default function SyntaxHelp() {
  return (
    <Popover width={320} position="bottom-start" withArrow shadow="md">
      <Popover.Target>
        <Button
          size="compact-xs"
          variant="subtle"
          color="gray"
          leftSection={<IconInfoCircle size={14} />}
        >
          Syntax
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={6}>
          <Text size="sm" fw={600}>
            frees syntax basics
          </Text>
          <List size="xs" spacing={4}>
            <List.Item>
              Equations may be written in <strong>any order</strong>; names are
              case-insensitive.
            </List.Item>
            <List.Item>
              <Code>=</Code> means equality, not assignment — e.g.{' '}
              <Code>P * V = m * R * T</Code>.
            </List.Item>
            <List.Item>
              Units go in brackets: <Code>T = 100 [C]</Code>,{' '}
              <Code>P = 250 [kPa]</Code>.
            </List.Item>
            <List.Item>
              Comments use braces: <Code>{'{ like this }'}</Code>.
            </List.Item>
            <List.Item>
              Type by suffix: <Code>name$</Code> string, <Code>name#</Code>{' '}
              constant, <Code>name[]</Code> array.
            </List.Item>
            <List.Item>
              Group fluid states per circuit:{' '}
              <Code>{'STATE TABLE Loop(P1, T1) FLUID = Water END'}</Code>.
            </List.Item>
            <List.Item>
              Insert functions and blocks from the <strong>Functions</strong>{' '}
              menu or the command palette (<Code>Ctrl/⌘ K</Code>).
            </List.Item>
          </List>
          <Anchor href="/help" target="_blank" size="xs">
            Full language reference →
          </Anchor>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
