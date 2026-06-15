import { Anchor, Divider, Group, Modal, Stack, Text } from '@mantine/core'
import { IconBrandGithub, IconBrandLinkedin } from '@tabler/icons-react'

interface Props {
  onClose: () => void
}

// About card: software identity + license on top, author at the bottom.
export default function AboutModal({ onClose }: Readonly<Props>) {
  return (
    <Modal opened onClose={onClose} title="About" centered size="sm">
      <Stack gap="sm">
        <Stack gap={2}>
          <Group gap="xs" align="baseline">
            <Text fw={700} size="xl">
              frees
            </Text>
            <Text c="dimmed" size="sm">
              free solver · v0.0.1
            </Text>
          </Group>
          <Text size="sm">
            A free, web-based, open-source equation-solving environment for
            engineers. Solves systems of non-linear simultaneous equations with
            symbolic compiling, unit handling, and uncertainty propagation.
          </Text>
          <Group gap="xs" wrap="nowrap" mt={4}>
            <IconBrandGithub size={20} stroke={1.6} />
            <Anchor
              href="https://github.com/ernsoylu/frees"
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
            >
              github.com/ernsoylu/frees
            </Anchor>
          </Group>
        </Stack>

        <Text c="dimmed" size="xs">
          Licensed under the MIT License. Copyright © 2026 Eren Soylu. Provided
          “as is”, without warranty of any kind.
        </Text>

        <Divider />

        <Stack gap={6}>
          <Text fw={600} size="sm">
            Author
          </Text>
          <Text size="sm">Eren Soylu</Text>
          <Group gap="xs" wrap="nowrap">
            <IconBrandLinkedin size={20} stroke={1.6} />
            <Anchor
              href="https://uk.linkedin.com/in/erensoylu"
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
            >
              linkedin.com/in/erensoylu
            </Anchor>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <IconBrandGithub size={20} stroke={1.6} />
            <Anchor
              href="https://github.com/ernsoylu"
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
            >
              github.com/ernsoylu
            </Anchor>
          </Group>
        </Stack>
      </Stack>
    </Modal>
  )
}
