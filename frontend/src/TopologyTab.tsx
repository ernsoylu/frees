import { useEffect, useRef, useState } from 'react'
import { Alert, Stack, Text } from '@mantine/core'
import mermaid from 'mermaid'

let initialized = false

interface TopologyTabProps {
  /** Mermaid flowchart of the COMPONENT network (from the solve result), or null. */
  topology?: string | null
}

/**
 * Read-only topology view — renders the backend's Mermaid flowchart of the
 * COMPONENT network (instances as nodes, connections as edges) for instant
 * visual validation of a code-based model. Distinct from the interactive Diagram
 * window: this is a diagnostic, regenerated from the solved document.
 */
export default function TopologyTab({ topology }: TopologyTabProps) {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`topo-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' })
      initialized = true
    }
    if (!topology) {
      setSvg('')
      setError(null)
      return
    }
    let cancelled = false
    mermaid
      .render(idRef.current, topology)
      .then(({ svg }) => {
        if (!cancelled) {
          setSvg(svg)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      cancelled = true
    }
  }, [topology])

  if (!topology) {
    return (
      <Stack p="md">
        <Text c="dimmed" size="sm">
          No components to display. Build a model with COMPONENT instances and
          connect(…) and solve to see its topology graph.
        </Text>
      </Stack>
    )
  }

  return (
    <Stack gap="sm" p="md" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      {error && (
        <Alert color="red" title="Could not render topology" variant="light">
          {error}
        </Alert>
      )}
      <div style={{ overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: svg }} />
    </Stack>
  )
}
