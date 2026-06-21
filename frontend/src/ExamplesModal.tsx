import { Badge, Card, Group, Modal, SimpleGrid, Stack, Text } from '@mantine/core'
import { EXAMPLES, Example } from './examples'

interface Props {
  opened: boolean
  onClose: () => void
  /** Load the chosen example's document into the editor. */
  onSelect: (example: Example) => void
}

// A gallery of ready-to-solve examples. Picking one replaces the editor
// document; the user can then press Solve (F2) to see a full result. This is
// the main on-ramp for students who don't yet know the frees syntax.
export default function ExamplesModal({ opened, onClose, onSelect }: Readonly<Props>) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Open an Example"
      size="lg"
      centered
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Pick a worked example to load into the editor, then press{' '}
          <strong>Solve</strong> (F2). Each one is ready to run — edit the inputs
          to explore. More examples live in{' '}
          <strong>Help → Engineering Examples Library</strong>.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {EXAMPLES.filter((ex) => ex.featured).map((ex) => (
            <Card
              key={ex.id}
              withBorder
              padding="sm"
              radius="md"
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(ex)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(ex)
                }
              }}
            >
              <Group justify="space-between" wrap="nowrap" mb={4} align="flex-start">
                <Text fw={600} size="sm">
                  {ex.title}
                </Text>
                <Badge variant="light" size="xs" style={{ flexShrink: 0 }}>
                  {ex.category}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {ex.description}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Modal>
  )
}
