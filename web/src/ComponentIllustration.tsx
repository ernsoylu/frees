import { Badge, Box, Group, Paper, Stack, Text, useComputedColorScheme } from '@mantine/core'
import { IconArrowRight } from '@tabler/icons-react'
import type { ComponentSpec } from './componentCatalog'
import { groupComponentPorts } from './componentPorts'
import { SHAPE_LABELS, SYMBOL_CONVENTIONS, symbolOf } from './schematic/symbols'

export default function ComponentIllustration({ spec }: Readonly<{ spec: ComponentSpec }>) {
  const scheme = useComputedColorScheme('dark')
  const { inlet, outlet, connection } = groupComponentPorts(spec.ports)
  const { shape } = symbolOf(spec.type)
  return (
    <Paper component="figure" m={0} p="md" withBorder aria-label={`${spec.type} port diagram`}>
      <Text size="sm" fw={600} mb="md">Ports &amp; flow</Text>
      <Box style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 96px minmax(0, 1fr)', alignItems: 'center', gap: 8 }}>
        <Stack gap="sm">
          {inlet.map((port) => (
            <Box key={port}>
              <Text size="xs" ff="monospace" style={{ overflowWrap: 'anywhere' }}>{port}</Text>
              <Group gap={0} wrap="nowrap" c="teal" aria-hidden="true">
                <Box style={{ flex: 1, borderTop: '2px solid currentColor' }} />
                <IconArrowRight size={18} style={{ flexShrink: 0 }} />
              </Group>
            </Box>
          ))}
        </Stack>
        <Stack gap={4} align="center">
          <img src={`${import.meta.env.BASE_URL}component-symbols/${scheme === 'dark' ? 'dark/' : ''}${shape}.svg`} width={96} height={96} alt={`${SHAPE_LABELS[shape]} symbol`} />
          <Text size="xs" c="dimmed" ta="center">{SHAPE_LABELS[shape]}</Text>
        </Stack>
        <Stack gap="sm">
          {outlet.map((port) => (
            <Box key={port}>
              <Text size="xs" ff="monospace" ta="right" style={{ overflowWrap: 'anywhere' }}>{port}</Text>
              <Group gap={0} wrap="nowrap" c="teal" aria-hidden="true">
                <Box style={{ flex: 1, borderTop: '2px solid currentColor' }} />
                <IconArrowRight size={18} style={{ flexShrink: 0 }} />
              </Group>
            </Box>
          ))}
        </Stack>
      </Box>
      <Text size="xs" c="dimmed" ta="center" mt={8}>{SYMBOL_CONVENTIONS[shape]}</Text>
      {connection.length > 0 && (
        <Stack gap={6} mt="md" align="center">
          <Text size="xs" c="dimmed">Connections · no direction assumed</Text>
          <Group gap="xs" justify="center">
            {connection.map((port) => <Badge key={port} variant="outline" tt="none" ff="monospace">{port}</Badge>)}
          </Group>
        </Stack>
      )}
      <Text component="figcaption" size="xs" c="dimmed" mt="md">
        {spec.ports.length === 0 ? 'This component has no external ports.' : 'Wire these ports with connect(…). Arrows follow inlet/outlet names, not solved flow or physical arrangement.'}
      </Text>
    </Paper>
  )
}
