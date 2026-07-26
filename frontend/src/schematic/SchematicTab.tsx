import { useMemo, useRef, useState } from 'react'
import { ActionIcon, Badge, Group, Stack, Text, Tooltip } from '@mantine/core'
import { IconDownload, IconZoomIn, IconZoomOut, IconZoomReset } from '@tabler/icons-react'
import type { CheckResponse, ComponentResult } from '../api'
import { declarationLine } from './declaration'
import { domainColor, legendDomains } from './palette'
import { layoutSchematic, type SchematicNode } from './layout'

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
}

/**
 * Read-only rendered schematic of the component network. Nodes are component
 * instances, edges are connections colored by physical domain; clicking an
 * instance reveals its declaration in the editor. Everything is drawn from
 * the check payload, so the drawing follows the text as it is checked.
 */
export default function SchematicTab({ checkResult, components, text, onRevealLine }: Readonly<Props>) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoomIndex, setZoomIndex] = useState(3)
  const [hovered, setHovered] = useState<string | null>(null)
  const zoom = ZOOM_STEPS[zoomIndex]

  const connections = useMemo(() => checkResult?.connections ?? [], [checkResult])

  const labels = useMemo(() => {
    const map = new Map<string, { label: string; type?: string }>()
    for (const c of components ?? []) {
      map.set(c.name.toLowerCase(), { label: c.name, type: c.type })
    }
    return map
  }, [components])

  const layout = useMemo(() => layoutSchematic(connections, labels), [connections, labels])

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

  if (connections.length === 0) {
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
                  <title>
                    {`${e.fromPort ? `${e.from}.${e.fromPort}` : e.from} → ${
                      e.toPort ? `${e.to}.${e.toPort}` : e.to
                    }  (${e.domain})`}
                  </title>
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
        </svg>
      </div>
    </Stack>
  )
}
