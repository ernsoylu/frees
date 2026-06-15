import { Anchor, Avatar, Group, Modal, Stack, Text } from '@mantine/core'
import { IconBrandGithub, IconBrandLinkedin } from '@tabler/icons-react'

interface Props {
  onClose: () => void
}

// Author / about-me card. Static content; no app state needed.
export default function AboutModal({ onClose }: Readonly<Props>) {
  return (
    <Modal opened onClose={onClose} title="About" centered size="sm">
      <Stack align="center" gap="xs" py="sm">
        <Avatar size={72} radius="xl" color="blue">
          ES
        </Avatar>
        <Text fw={600} size="lg">
          Eren Soylu
        </Text>
        <Text c="dimmed" size="sm" ta="center">
          Creator of frees — a free, declarative equation-solving environment.
        </Text>

        <Stack gap={6} mt="sm" w="100%">
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
