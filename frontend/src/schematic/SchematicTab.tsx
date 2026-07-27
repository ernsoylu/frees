import { useMemo, useRef, useState } from 'react'
import { ActionIcon, Badge, Group, Stack, Text, Tooltip } from '@mantine/core'
import { IconDownload, IconZoomIn, IconZoomOut, IconZoomReset } from '@tabler/icons-react'
import type { CheckResponse, ComponentResult } from '../api'
import { declarationLine, instanceTypes } from './declaration'
import { domainColor, legendDomains } from './palette'
import { layoutSchematic, portAnchors, type SchematicEdge, type SchematicNode } from './layout'
import { COMPONENT_CATALOG } from '../componentCatalog'

const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 2]

interface Props {
  /** The check response holding the connection topology; it outlives the
   *  solve result, so the schematic tracks the text without needing a solve. */
  checkResult: CheckResponse | null
  /** Solved component instances, when a solve has run — supplies the written
   *  spelling and the component type for each node. */
  components?: ComponentResult[]
  /** The document text, for locating an instance's declaration on click. */
  text: string
  /** Reveal a 1-based line in the editor. */
  onRevealLine: (line: number) => void
  /** Append a statement to the document (wiring emits `connect(...)` lines).
   *  Absent = the canvas stays read-only. */
  onEmitStatement?: (statement: string) => void
}

/**
 * Read-only rendered schematic of the component network. Nodes are component
 * instances, edges are connections colored by physical domain; clicking an
 * instance reveals its declaration in the editor. Everything is drawn from
 * the check payload, so the drawing follows the text as it is checked.
 */
export default function SchematicTab({ checkResult, components, text, onRevealLine, onEmitStatement }: Readonly<Props>) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoomIndex, setZoomIndex] = useState(3)
  const [hovered, setHovered] = useState<string | null>(null)
  // The first port of a wire being drawn; the second click completes it.
  const [pendingPort, setPendingPort] = useState<{ instance: string; port: string } | null>(null)
  const [wireNote, setWireNote] = useState<string | null>(null)
  const zoom = ZOOM_STEPS[zoomIndex]

  const connections = useMemo(() => checkResult?.connections ?? [], [checkResult])

  const labels = useMemo(() => {
    const map = new Map<string, { label: string; type?: string }>()
    for (const c of components ?? []) {
      map.set(c.name.toLowerCase(), { label: c.name, type: c.type })
    }
    return map
  }, [components])

  const declaredInstances = useMemo(() => [...instanceTypes(text).keys()], [text])
  // The document wires components but the payload carries no topology: the
  // check did not get far enough to expand the network. Say so, rather than
  // showing a silently edgeless canvas right after the user wired something.
  const topologyStale = useMemo(
    () => connections.length === 0 && /^\s*connect\s*\(/im.test(text),
    [connections, text],
  )
  const layout = useMemo(
    () => layoutSchematic(connections, labels, declaredInstances),
    [connections, labels, declaredInstances],
  )

  // Each instance's declared ports, looked up by its component type. Only
  // available once a solve has told us the types — wiring is therefore an
  // affordance of a solved network, not a bare check.
  const portsByInstance = useMemo(() => {
    const byType = new Map(COMPONENT_CATALOG.map((c) => [c.type.toLowerCase(), c.ports]))
    const out = new Map<string, string[]>()
    // Types come from the DOCUMENT, not the solve response: a network being
    // wired is precisely one that does not solve yet, so reading types from a
    // solve would withdraw the affordance exactly when it is needed.
    for (const [instance, type] of instanceTypes(text)) {
      const ports = byType.get(type.toLowerCase())
      if (ports && ports.length > 0) {
        out.set(instance, ports)
      }
    }
    return out
  }, [text])

  const clickPort = (instance: string, port: string, label: string) => {
    if (!onEmitStatement) {
      return
    }
    setWireNote(null)
    if (!pendingPort) {
      setPendingPort({ instance, port })
      return
    }
    if (pendingPort.instance === instance) {
      // A component wired to itself is never what the user meant, and the
      // expander would reject it anyway.
      setWireNote('Pick a port on a different component.')
      setPendingPort(null)
      return
    }
    const fromLabel = layout.nodes.find((n) => n.id === pendingPort.instance)?.label ?? pendingPort.instance
    onEmitStatement(`connect(${fromLabel}.${pendingPort.port}, ${label}.${port})`)
    setPendingPort(null)
    setWireNote(`Wired ${fromLabel}.${pendingPort.port} → ${label}.${port}`)
  }

  const domains = useMemo(
    () => legendDomains(connections.map((c) => c.domain)),
    [connections],
  )

  const revealInstance = (node: SchematicNode) => {
    if (node.kind !== 'instance') {
      return
    }
    const line = declarationLine(text, node.label)
    if (line !== null) {
      onRevealLine(line)
    }
  }

  const exportSvg = () => {
    const svg = svgRef.current
    if (!svg) {
      return
    }
    const xml = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([xml], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'schematic.svg'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  if (connections.length === 0 && declaredInstances.length === 0) {
    return (
      <Stack gap="xs" p="md" align="center" justify="center" h="100%">
        <Text size="sm" c="dimmed" ta="center" maw={430}>
          No component network to draw. Instantiate components and wire them — with
          <Text span ff="monospace" size="sm">{' connect(a.out, b.in) '}</Text>
          or by sharing a stream name — then press Check.
        </Text>
      </Stack>
    )
  }

  return (
    <Stack gap={4} h="100%" style={{ minHeight: 0 }}>
      <Group gap="xs" px="xs" pt={4} wrap="wrap">
        {domains.map((d) => (
          <Group key={d} gap={4}>
            <span
              style={{
                width: 14,
                height: 3,
                borderRadius: 2,
                background: domainColor(d),
                display: 'inline-block',
              }}
            />
            <Text size="xs" c="dimmed">
              {d}
            </Text>
          </Group>
        ))}
        <Badge size="xs" variant="light" color="gray">
          {layout.nodes.filter((n) => n.kind === 'instance').length} components
        </Badge>
        {onEmitStatement && pendingPort && (
          <Badge size="xs" variant="filled" color="teal">
            wiring from {pendingPort.instance}.{pendingPort.port} — pick a second port
          </Badge>
        )}
        {onEmitStatement && !pendingPort && wireNote && (
          <Text size="xs" c="dimmed">
            {wireNote}
          </Text>
        )}
        {topologyStale && (
          <Text size="xs" c="orange">
            connections not shown — the document has errors; fix them and Check
          </Text>
        )}
        <Group gap={2} ml="auto">
          <Tooltip label="Zoom out">
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Zoom out"
              onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
            >
              <IconZoomOut size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Reset zoom">
            <ActionIcon size="sm" variant="subtle" aria-label="Reset zoom" onClick={() => setZoomIndex(3)}>
              <IconZoomReset size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Zoom in">
            <ActionIcon
              size="sm"
              variant="subtle"
              aria-label="Zoom in"
              onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
            >
              <IconZoomIn size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Export SVG">
            <ActionIcon size="sm" variant="subtle" aria-label="Export SVG" onClick={exportSvg}>
              <IconDownload size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <svg
          ref={svgRef}
          width={layout.width * zoom}
          height={layout.height * zoom}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Component network schematic"
        >
          <g>
            {layout.edges.map((e) => {
              const lit = hovered !== null && (e.from === hovered || e.to === hovered)
              return (
                <path
                  key={e.id}
                  d={e.path}
                  fill="none"
                  stroke={domainColor(e.domain)}
                  strokeWidth={lit ? 2.6 : 1.6}
                  strokeOpacity={hovered !== null && !lit ? 0.35 : 0.9}
                >
                  <title>{edgeTitle(e)}</title>
                </path>
              )
            })}
          </g>
          <g>
            {layout.nodes.map((n) =>
              n.kind === 'junction' ? (
                <circle
                  key={n.id}
                  cx={n.x + n.w / 2}
                  cy={n.y + n.h / 2}
                  r={n.w / 2}
                  fill="#868e96"
                  stroke="#495057"
                />
              ) : (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  onClick={() => revealInstance(n)}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{n.type ? `${n.type} ${n.label} — click to reveal` : `${n.label} — click to reveal`}</title>
                  <rect
                    width={n.w}
                    height={n.h}
                    rx={6}
                    fill={hovered === n.id ? '#2b3138' : '#25292e'}
                    stroke={hovered === n.id ? '#12b886' : '#4a4f55'}
                    strokeWidth={hovered === n.id ? 2 : 1.2}
                  />
                  <text
                    x={n.w / 2}
                    y={n.type ? 20 : 27}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={600}
                    fill="#e9ecef"
                  >
                    {n.label}
                  </text>
                  {n.type && (
                    <text x={n.w / 2} y={35} textAnchor="middle" fontSize={11} fill="#909296">
                      {n.type}
                    </text>
                  )}
                </g>
              ),
            )}
          </g>
          {onEmitStatement && (
            <g>
              {layout.nodes.flatMap((n) =>
                portAnchors(n, portsByInstance.get(n.id) ?? []).map((a) => {
                  const armed =
                    pendingPort?.instance === n.id && pendingPort?.port === a.port
                  return (
                    <g
                      key={`${n.id}.${a.port}`}
                      onClick={() => clickPort(n.id, a.port, n.label)}
                      style={{ cursor: 'crosshair' }}
                    >
                      <title>{`${n.label}.${a.port} — click to ${pendingPort ? 'complete' : 'start'} a connection`}</title>
                      <circle
                        cx={a.x}
                        cy={a.y}
                        r={armed ? 5.5 : 3.5}
                        fill={armed ? '#12b886' : '#495057'}
                        stroke={armed ? '#12b886' : '#868e96'}
                        strokeWidth={1}
                      />
                      <text
                        x={a.side === 'left' ? a.x - 6 : a.x + 6}
                        y={a.y + 3}
                        textAnchor={a.side === 'left' ? 'end' : 'start'}
                        fontSize={9}
                        fill="#909296"
                      >
                        {a.port}
                      </text>
                    </g>
                  )
                }),
              )}
            </g>
          )}

        </svg>
      </div>
    </Stack>
  )
}

/** "a.out → b.in  (fluid)" — the hover description of one connection. */
function edgeTitle(e: SchematicEdge): string {
  const from = e.fromPort ? `${e.from}.${e.fromPort}` : e.from
  const to = e.toPort ? `${e.to}.${e.toPort}` : e.to
  return `${from} → ${to}  (${e.domain})`
}
