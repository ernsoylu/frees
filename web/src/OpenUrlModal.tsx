import { useEffect, useRef, useState } from 'react'
import { Anchor, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { IconWorld } from '@tabler/icons-react'
import { DEFAULT_RAW_DOCUMENT_SOURCE, fetchRawDocument, normalizeRawDocumentUrl } from './share'

export interface OpenUrlModalProps {
  opened: boolean
  onClose: () => void
  onSuccess: (url: string, text: string) => void
}

export default function OpenUrlModal({ opened, onClose, onSuccess }: Readonly<OpenUrlModalProps>) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (opened) {
      setUrl('')
      setError(null)
      setLoading(false)
    } else {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    }
  }, [opened])

  const handleClose = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setLoading(false)
    onClose()
  }

  const handleOpen = async () => {
    const raw = url.trim()
    if (!raw) {
      setError('Please enter a raw document URL.')
      return
    }
    const targetUrl = normalizeRawDocumentUrl(raw)
    try {
      const parsed = new URL(targetUrl)
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
        setError('Use an HTTPS URL without embedded credentials.')
        return
      }
    } catch {
      setError('The URL parameter must contain a complete HTTPS URL.')
      return
    }

    setLoading(true)
    setError(null)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const text = await fetchRawDocument(targetUrl, controller.signal)
      if (!controller.signal.aborted) {
        onSuccess(targetUrl, text)
        onClose()
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconWorld size={18} />
          <Text fw={600}>Open from URL</Text>
        </Group>
      }
      centered
      size="lg"
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Enter the HTTPS URL of a raw equation text file. The remote host must allow cross-origin access (CORS).
        </Text>
        <TextInput
          label="Raw text URL"
          placeholder={DEFAULT_RAW_DOCUMENT_SOURCE}
          value={url}
          onChange={(e) => {
            setUrl(e.currentTarget.value)
            if (error) setError(null)
          }}
          disabled={loading}
          data-autofocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              e.preventDefault()
              void handleOpen()
            }
          }}
        />
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed">
            Example:{' '}
            <Anchor
              component="button"
              type="button"
              size="xs"
              onClick={() => {
                setUrl(DEFAULT_RAW_DOCUMENT_SOURCE)
                if (error) setError(null)
              }}
              disabled={loading}
            >
              {DEFAULT_RAW_DOCUMENT_SOURCE}
            </Anchor>
          </Text>
        </Group>
        {error && (
          <Text size="xs" c="red">
            {error}
          </Text>
        )}
        <Group justify="flex-end" gap="xs" mt="xs">
          <Button variant="default" size="xs" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            size="xs"
            color="teal"
            onClick={() => void handleOpen()}
            loading={loading}
            disabled={!url.trim()}
          >
            Open
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
