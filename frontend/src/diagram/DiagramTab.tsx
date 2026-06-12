import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionIcon,
  Button,
  Checkbox,
  ColorInput,
  Divider,
  Group,
  Menu,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  Tooltip,
} from '@mantine/core'
import {
  IconArrowNarrowRight,
  IconCircle,
  IconCopy,
  IconLine,
  IconPlayerPlayFilled,
  IconPointer,
  IconRectangle,
  IconStack2,
  IconStackPop,
  IconStackPush,
  IconTags,
  IconTrash,
  IconTypography,
  IconZoomScan,
} from '@tabler/icons-react'
import { VariableResult } from '../api'
import { formatValue } from '../format'
import { LIBRARY_ICONS, libraryIcon } from './library'
import {
  DEFAULT_DIAGRAM_STATE,
  DEFAULT_STYLE,
  DiagramElement,
  DiagramState,
  LabelElement,
  LineElement,
  elementBounds,
} from './types'

const STORAGE_KEY = 'frees-diagram-v1'

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadState(): DiagramState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DIAGRAM_STATE
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.elements)) return DEFAULT_DIAGRAM_STATE
    return { ...DEFAULT_DIAGRAM_STATE, ...parsed }
  } catch {
    return DEFAULT_DIAGRAM_STATE
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

interface ViewTransform {
  x: number
  y: number
  k: number
}

type DragState =
  | { type: 'pan'; startClientX: number; startClientY: number; startView: ViewTransform }
  | { type: 'create'; id: string; startX: number; startY: number }
  | { type: 'move'; id: string; startX: number; startY: number; original: DiagramElement }
  | {
      type: 'resize'
      id: string
      handle: 'nw' | 'ne' | 'sw' | 'se'
      original: DiagramElement
    }
  | { type: 'endpoint'; id: string; which: 1 | 2 }

function elementCenter(el: DiagramElement): { cx: number; cy: number } {
  const b = elementBounds(el)
  return { cx: b.x + b.w / 2, cy: b.y + b.h / 2 }
}

// ---------------------------------------------------------------------------
// Element rendering
// ---------------------------------------------------------------------------

function interpolateLabel(text: string, values: Map<string, VariableResult>): string {
  return text.replace(/\{([A-Za-z][\w$]*)\}/g, (match, name: string) => {
    const v = values.get(name.toLowerCase())
    if (!v) return match
    const unit = v.units && v.units !== '-' ? ` ${v.units}` : ''
    return `${formatValue(v.value)}${unit}`
  })
}

function LabelText({
  el,
  text,
}: Readonly<{ el: LabelElement; text: string }>) {
  const lines = text.split('\n')
  return (
    <text
      x={el.x}
      y={el.y}
      fill={el.stroke}
      fontSize={el.fontSize}
      fontWeight={el.bold ? 700 : 400}
      fontFamily="system-ui, sans-serif"
      opacity={el.opacity}
      style={{ userSelect: 'none' }}
    >
      {lines.map((line, i) => (
        <tspan key={`${el.id}-${line}-${i}`} x={el.x} dy={i === 0 ? '1em' : '1.3em'}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

function ElementView({
  el,
  runMode,
  values,
  onMouseDown,
}: Readonly<{
  el: DiagramElement
  runMode: boolean
  values: Map<string, VariableResult>
  onMouseDown: (e: React.MouseEvent, el: DiagramElement) => void
}>) {
  const { cx, cy } = elementCenter(el)
  const transform = el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined
  const handleDown = (e: React.MouseEvent) => {
    if (!runMode) onMouseDown(e, el)
  }

  let body: React.ReactNode = null
  if (el.kind === 'line') {
    const marker = el.arrow ? `url(#diagram-arrow-${el.id})` : undefined
    body = (
      <>
        {el.arrow && (
          <defs>
            <marker
              id={`diagram-arrow-${el.id}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={el.stroke} />
            </marker>
          </defs>
        )}
        <line
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          opacity={el.opacity}
          markerEnd={marker}
        />
        {/* wide invisible hit area */}
        <line
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke="transparent"
          strokeWidth={Math.max(12, el.strokeWidth + 8)}
        />
      </>
    )
  } else if (el.kind === 'rect') {
    body = (
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={el.h}
        rx={el.rx}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        fill={el.fill === 'transparent' ? 'rgba(0,0,0,0.001)' : el.fill}
        opacity={el.opacity}
      />
    )
  } else if (el.kind === 'ellipse') {
    body = (
      <ellipse
        cx={el.x + el.w / 2}
        cy={el.y + el.h / 2}
        rx={el.w / 2}
        ry={el.h / 2}
        stroke={el.stroke}
        strokeWidth={el.strokeWidth}
        fill={el.fill === 'transparent' ? 'rgba(0,0,0,0.001)' : el.fill}
        opacity={el.opacity}
      />
    )
  } else if (el.kind === 'label') {
    const text = runMode ? interpolateLabel(el.text, values) : el.text
    body = <LabelText el={el} text={text} />
  } else {
    const icon = libraryIcon(el.icon)
    if (!icon) return null
    body = (
      <g
        transform={`translate(${el.x} ${el.y}) scale(${el.w / 100} ${el.h / 100})`}
        opacity={el.opacity}
      >
        {icon.render(el.stroke, (el.strokeWidth * 100) / Math.max(el.w, el.h), el.fill)}
        <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.001)" stroke="none" />
      </g>
    )
  }

  return (
    <g
      transform={transform}
      onMouseDown={handleDown}
      style={{ cursor: runMode ? 'default' : 'move' }}
    >
      {body}
    </g>
  )
}

function SelectionHandles({
  el,
  view,
  onHandleDown,
  onEndpointDown,
}: Readonly<{
  el: DiagramElement
  view: ViewTransform
  onHandleDown: (e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se') => void
  onEndpointDown: (e: React.MouseEvent, which: 1 | 2) => void
}>) {
  const size = 8 / view.k
  const color = '#4dabf7'

  if (el.kind === 'line') {
    return (
      <>
        {[1, 2].map((which) => {
          const x = which === 1 ? el.x1 : el.x2
          const y = which === 1 ? el.y1 : el.y2
          return (
            <circle
              key={which}
              cx={x}
              cy={y}
              r={size * 0.7}
              fill={color}
              stroke="#1a1b1e"
              strokeWidth={1 / view.k}
              style={{ cursor: 'crosshair' }}
              onMouseDown={(e) => onEndpointDown(e, which as 1 | 2)}
            />
          )
        })}
      </>
    )
  }

  const b = elementBounds(el)
  const handles: { id: 'nw' | 'ne' | 'sw' | 'se'; x: number; y: number; cursor: string }[] = [
    { id: 'nw', x: b.x, y: b.y, cursor: 'nwse-resize' },
    { id: 'ne', x: b.x + b.w, y: b.y, cursor: 'nesw-resize' },
    { id: 'sw', x: b.x, y: b.y + b.h, cursor: 'nesw-resize' },
    { id: 'se', x: b.x + b.w, y: b.y + b.h, cursor: 'nwse-resize' },
  ]
  return (
    <>
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        fill="none"
        stroke={color}
        strokeWidth={1 / view.k}
        strokeDasharray={`${4 / view.k} ${3 / view.k}`}
        pointerEvents="none"
      />
      {el.kind !== 'label' &&
        handles.map((h) => (
          <rect
            key={h.id}
            x={h.x - size / 2}
            y={h.y - size / 2}
            width={size}
            height={size}
            fill={color}
            stroke="#1a1b1e"
            strokeWidth={1 / view.k}
            style={{ cursor: h.cursor }}
            onMouseDown={(e) => onHandleDown(e, h.id)}
          />
        ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Properties panel
// ---------------------------------------------------------------------------

function PropertiesPanel({
  el,
  onChange,
  onDuplicate,
  onDelete,
  onZOrder,
}: Readonly<{
  el: DiagramElement
  onChange: (next: DiagramElement) => void
  onDuplicate: () => void
  onDelete: () => void
  onZOrder: (direction: 'front' | 'back') => void
}>) {
  const set = (patch: Partial<DiagramElement>) =>
    onChange({ ...el, ...patch } as DiagramElement)

  return (
    <Stack gap="xs">
      <Text fw={600} size="sm" c="blue.4">
        {el.kind === 'icon' ? (libraryIcon(el.icon)?.label ?? 'Component') : el.kind}
      </Text>

      {el.kind === 'label' && (
        <>
          <Textarea
            label="Text"
            description="Use {varname} to show a solved value in Run mode"
            size="xs"
            autosize
            minRows={2}
            value={el.text}
            onChange={(e) => set({ text: e.currentTarget.value })}
          />
          <Group grow>
            <NumberInput
              label="Font size"
              size="xs"
              min={6}
              max={96}
              value={el.fontSize}
              onChange={(v) => set({ fontSize: typeof v === 'number' ? v : el.fontSize })}
            />
            <Checkbox
              label="Bold"
              size="xs"
              mt={22}
              checked={el.bold}
              onChange={(e) => set({ bold: e.currentTarget.checked })}
            />
          </Group>
        </>
      )}

      {el.kind === 'line' && (
        <Checkbox
          label="Arrow head"
          size="xs"
          checked={el.arrow}
          onChange={(e) => set({ arrow: e.currentTarget.checked })}
        />
      )}

      {el.kind === 'rect' && (
        <NumberInput
          label="Corner radius"
          size="xs"
          min={0}
          value={el.rx}
          onChange={(v) => set({ rx: typeof v === 'number' ? v : el.rx })}
        />
      )}

      <ColorInput
        label={el.kind === 'label' ? 'Color' : 'Stroke color'}
        size="xs"
        value={el.stroke}
        onChange={(stroke) => set({ stroke })}
      />
      {(el.kind === 'rect' || el.kind === 'ellipse' || el.kind === 'icon') && (
        <ColorInput
          label="Fill color"
          size="xs"
          value={el.fill === 'transparent' ? '' : el.fill}
          placeholder="transparent"
          onChange={(fill) => set({ fill: fill || 'transparent' })}
        />
      )}
      {el.kind !== 'label' && (
        <NumberInput
          label="Stroke width"
          size="xs"
          min={0.5}
          step={0.5}
          value={el.strokeWidth}
          onChange={(v) => set({ strokeWidth: typeof v === 'number' ? v : el.strokeWidth })}
        />
      )}
      <Group grow>
        <NumberInput
          label="Rotation °"
          size="xs"
          min={-360}
          max={360}
          value={el.rotation}
          onChange={(v) => set({ rotation: typeof v === 'number' ? v : el.rotation })}
        />
        <NumberInput
          label="Opacity"
          size="xs"
          min={0.1}
          max={1}
          step={0.1}
          value={el.opacity}
          onChange={(v) => set({ opacity: typeof v === 'number' ? v : el.opacity })}
        />
      </Group>

      <Divider />
      <Group gap="xs">
        <Tooltip label="Bring to front">
          <ActionIcon variant="default" size="md" onClick={() => onZOrder('front')}>
            <IconStackPop size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Send to back">
          <ActionIcon variant="default" size="md" onClick={() => onZOrder('back')}>
            <IconStackPush size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Duplicate">
          <ActionIcon variant="default" size="md" onClick={onDuplicate}>
            <IconCopy size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete (Del)">
          <ActionIcon variant="default" color="red" size="md" onClick={onDelete}>
            <IconTrash size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Main tab
// ---------------------------------------------------------------------------

type Tool =
  | 'select'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'label'
  | `icon:${string}`

interface Props {
  variables: VariableResult[]
}

export default function DiagramTab({ variables }: Readonly<Props>) {
  const [state, setState] = useState<DiagramState>(loadState)
  const [tool, setTool] = useState<Tool>('select')
  const [mode, setMode] = useState<'develop' | 'run'>('develop')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [view, setView] = useState<ViewTransform>({ x: 60, y: 40, k: 1 })
  const [drag, setDrag] = useState<DragState | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const runMode = mode === 'run'
  const selected = state.elements.find((el) => el.id === selectedId) ?? null

  const valueMap = useMemo(() => {
    const map = new Map<string, VariableResult>()
    for (const v of variables) map.set(v.name.toLowerCase(), v)
    return map
  }, [variables])

  // Persist on every change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Quota exceeded: diagram simply won't persist.
    }
  }, [state])

  const snap = useCallback(
    (v: number) => (state.snap ? Math.round(v / state.gridSize) * state.gridSize : v),
    [state.snap, state.gridSize],
  )

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return { x: 0, y: 0 }
      return {
        x: (clientX - rect.left - view.x) / view.k,
        y: (clientY - rect.top - view.y) / view.k,
      }
    },
    [view],
  )

  const updateElement = useCallback((id: string, next: DiagramElement) => {
    setState((s) => ({
      ...s,
      elements: s.elements.map((el) => (el.id === id ? next : el)),
    }))
  }, [])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    setState((s) => ({ ...s, elements: s.elements.filter((el) => el.id !== selectedId) }))
    setSelectedId(null)
  }, [selectedId])

  const duplicateSelected = useCallback(() => {
    if (!selected) return
    const copy = structuredClone(selected)
    copy.id = crypto.randomUUID()
    const dx = state.gridSize * 2
    if (copy.kind === 'line') {
      copy.x1 += dx
      copy.x2 += dx
      copy.y1 += dx
      copy.y2 += dx
    } else {
      copy.x += dx
      copy.y += dx
    }
    setState((s) => ({ ...s, elements: [...s.elements, copy] }))
    setSelectedId(copy.id)
  }, [selected, state.gridSize])

  const zOrder = useCallback(
    (direction: 'front' | 'back') => {
      if (!selectedId) return
      setState((s) => {
        const el = s.elements.find((e) => e.id === selectedId)
        if (!el) return s
        const rest = s.elements.filter((e) => e.id !== selectedId)
        return {
          ...s,
          elements: direction === 'front' ? [...rest, el] : [el, ...rest],
        }
      })
    },
    [selectedId],
  )

  // ── element creation ─────────────────────────────────────────────────

  const createElement = useCallback(
    (worldX: number, worldY: number): DiagramElement | null => {
      const x = snap(worldX)
      const y = snap(worldY)
      const id = crypto.randomUUID()
      const base = { id, rotation: 0, ...DEFAULT_STYLE }
      if (tool === 'line' || tool === 'arrow') {
        return { ...base, kind: 'line', x1: x, y1: y, x2: x, y2: y, arrow: tool === 'arrow' }
      }
      if (tool === 'rect') {
        return { ...base, kind: 'rect', x, y, w: 0, h: 0, rx: 0 }
      }
      if (tool === 'ellipse') {
        return { ...base, kind: 'ellipse', x, y, w: 0, h: 0 }
      }
      if (tool === 'label') {
        return { ...base, kind: 'label', x, y, text: 'Label', fontSize: 16, bold: false }
      }
      if (tool.startsWith('icon:')) {
        const iconId = tool.slice(5)
        return { ...base, kind: 'icon', icon: iconId, x, y, w: 100, h: 100 }
      }
      return null
    },
    [tool, snap],
  )

  // ── mouse interactions ───────────────────────────────────────────────

  const onBackgroundDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (runMode || tool === 'select') {
      setSelectedId(null)
      setDrag({
        type: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startView: view,
      })
      return
    }
    const world = toWorld(e.clientX, e.clientY)
    const el = createElement(world.x, world.y)
    if (!el) return
    setState((s) => ({ ...s, elements: [...s.elements, el] }))
    setSelectedId(el.id)
    if (el.kind === 'label' || el.kind === 'icon') {
      // Click-to-place: immediately movable.
      setDrag({ type: 'move', id: el.id, startX: world.x, startY: world.y, original: el })
    } else {
      setDrag({ type: 'create', id: el.id, startX: snap(world.x), startY: snap(world.y) })
    }
  }

  const onElementDown = (e: React.MouseEvent, el: DiagramElement) => {
    if (e.button !== 0 || tool !== 'select') return
    e.stopPropagation()
    setSelectedId(el.id)
    const world = toWorld(e.clientX, e.clientY)
    setDrag({ type: 'move', id: el.id, startX: world.x, startY: world.y, original: el })
  }

  const onHandleDown = (e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se') => {
    if (!selected) return
    e.stopPropagation()
    setDrag({ type: 'resize', id: selected.id, handle, original: selected })
  }

  const onEndpointDown = (e: React.MouseEvent, which: 1 | 2) => {
    if (!selected) return
    e.stopPropagation()
    setDrag({ type: 'endpoint', id: selected.id, which })
  }

  const applyMove = useCallback(
    (d: Extract<DragState, { type: 'move' }>, world: { x: number; y: number }) => {
      const dx = snap(world.x - d.startX)
      const dy = snap(world.y - d.startY)
      const orig = d.original
      if (orig.kind === 'line') {
        updateElement(d.id, {
          ...orig,
          x1: orig.x1 + dx,
          y1: orig.y1 + dy,
          x2: orig.x2 + dx,
          y2: orig.y2 + dy,
        })
      } else {
        updateElement(d.id, { ...orig, x: orig.x + dx, y: orig.y + dy })
      }
    },
    [snap, updateElement],
  )

  const applyCreate = useCallback(
    (d: Extract<DragState, { type: 'create' }>, world: { x: number; y: number }) => {
      const el = state.elements.find((e) => e.id === d.id)
      if (!el) return
      const wx = snap(world.x)
      const wy = snap(world.y)
      if (el.kind === 'line') {
        updateElement(d.id, { ...el, x2: wx, y2: wy })
      } else if (el.kind === 'rect' || el.kind === 'ellipse') {
        updateElement(d.id, {
          ...el,
          x: Math.min(d.startX, wx),
          y: Math.min(d.startY, wy),
          w: Math.abs(wx - d.startX),
          h: Math.abs(wy - d.startY),
        })
      }
    },
    [state.elements, snap, updateElement],
  )

  const applyResize = useCallback(
    (d: Extract<DragState, { type: 'resize' }>, world: { x: number; y: number }) => {
      const orig = d.original
      if (orig.kind === 'line' || orig.kind === 'label') return
      const b = { x: orig.x, y: orig.y, w: orig.w, h: orig.h }
      // The corner opposite to the dragged handle stays fixed.
      const fixedX = d.handle === 'nw' || d.handle === 'sw' ? b.x + b.w : b.x
      const fixedY = d.handle === 'nw' || d.handle === 'ne' ? b.y + b.h : b.y
      const wx = snap(world.x)
      const wy = snap(world.y)
      updateElement(d.id, {
        ...orig,
        x: Math.min(fixedX, wx),
        y: Math.min(fixedY, wy),
        w: Math.max(state.gridSize, Math.abs(wx - fixedX)),
        h: Math.max(state.gridSize, Math.abs(wy - fixedY)),
      })
    },
    [snap, state.gridSize, updateElement],
  )

  const applyEndpoint = useCallback(
    (d: Extract<DragState, { type: 'endpoint' }>, world: { x: number; y: number }) => {
      const el = state.elements.find((e) => e.id === d.id)
      if (!el || el.kind !== 'line') return
      const wx = snap(world.x)
      const wy = snap(world.y)
      const next: LineElement =
        d.which === 1 ? { ...el, x1: wx, y1: wy } : { ...el, x2: wx, y2: wy }
      updateElement(d.id, next)
    },
    [state.elements, snap, updateElement],
  )

  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      if (drag.type === 'pan') {
        setView({
          ...drag.startView,
          x: drag.startView.x + (e.clientX - drag.startClientX),
          y: drag.startView.y + (e.clientY - drag.startClientY),
        })
        return
      }
      const world = toWorld(e.clientX, e.clientY)
      if (drag.type === 'move') applyMove(drag, world)
      else if (drag.type === 'create') applyCreate(drag, world)
      else if (drag.type === 'resize') applyResize(drag, world)
      else applyEndpoint(drag, world)
    }
    const onUp = () => {
      if (drag.type === 'create') {
        // A click without a drag: give the shape a sensible default size.
        setState((s) => ({
          ...s,
          elements: s.elements.map((el) => {
            if (el.id !== drag.id) return el
            if (el.kind === 'line' && Math.hypot(el.x2 - el.x1, el.y2 - el.y1) < 4) {
              return { ...el, x2: el.x1 + 80 }
            }
            if ((el.kind === 'rect' || el.kind === 'ellipse') && (el.w < 4 || el.h < 4)) {
              return { ...el, w: 100, h: 60 }
            }
            return el
          }),
        }))
        setTool('select')
      }
      if (drag.type === 'move' && tool !== 'select') {
        setTool('select')
      }
      setDrag(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [drag, toWorld, applyMove, applyCreate, applyResize, applyEndpoint, tool])

  const onWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor = Math.exp(-e.deltaY * 0.0012)
    const k = Math.min(5, Math.max(0.15, view.k * factor))
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    // Keep the world point under the cursor stationary.
    setView({
      k,
      x: px - ((px - view.x) / view.k) * k,
      y: py - ((py - view.y) / view.k) * k,
    })
  }

  const zoomToFit = () => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || state.elements.length === 0) {
      setView({ x: 60, y: 40, k: 1 })
      return
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const el of state.elements) {
      const b = elementBounds(el)
      minX = Math.min(minX, b.x)
      minY = Math.min(minY, b.y)
      maxX = Math.max(maxX, b.x + b.w)
      maxY = Math.max(maxY, b.y + b.h)
    }
    const pad = 40
    const w = Math.max(1, maxX - minX)
    const h = Math.max(1, maxY - minY)
    const k = Math.min(5, Math.min((rect.width - pad * 2) / w, (rect.height - pad * 2) / h))
    setView({
      k,
      x: (rect.width - w * k) / 2 - minX * k,
      y: (rect.height - h * k) / 2 - minY * k,
    })
  }

  // ── keyboard shortcuts ───────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (runMode) return
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        deleteSelected()
      } else if (e.key === 'Escape') {
        setSelectedId(null)
        setTool('select')
      } else if (e.key.startsWith('Arrow') && selected) {
        e.preventDefault()
        const step = e.shiftKey ? 1 : state.gridSize
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
        if (selected.kind === 'line') {
          updateElement(selected.id, {
            ...selected,
            x1: selected.x1 + dx,
            y1: selected.y1 + dy,
            x2: selected.x2 + dx,
            y2: selected.y2 + dy,
          })
        } else {
          updateElement(selected.id, { ...selected, x: selected.x + dx, y: selected.y + dy })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [runMode, selectedId, selected, deleteSelected, state.gridSize, updateElement])

  // ── render ───────────────────────────────────────────────────────────

  const TOOL_BUTTONS: { tool: Tool; label: string; icon: React.ReactNode }[] = [
    { tool: 'select', label: 'Select / Move (Esc)', icon: <IconPointer size={18} /> },
    { tool: 'line', label: 'Line', icon: <IconLine size={18} /> },
    { tool: 'arrow', label: 'Arrow', icon: <IconArrowNarrowRight size={18} /> },
    { tool: 'rect', label: 'Rectangle', icon: <IconRectangle size={18} /> },
    { tool: 'ellipse', label: 'Circle / Ellipse', icon: <IconCircle size={18} /> },
    { tool: 'label', label: 'Rich Label', icon: <IconTypography size={18} /> },
  ]

  const gridStep = state.gridSize * view.k

  return (
    <Group align="stretch" gap="sm" h="100%" wrap="nowrap">
      <Stack gap="sm" flex={1} miw={0}>
        <Group gap="xs" wrap="wrap">
          <SegmentedControl
            size="xs"
            value={mode}
            onChange={(v) => {
              setMode(v as 'develop' | 'run')
              setSelectedId(null)
              setTool('select')
            }}
            data={[
              { label: 'Development', value: 'develop' },
              {
                label: (
                  <Group gap={4} wrap="nowrap">
                    <IconPlayerPlayFilled size={12} />
                    <span>Run</span>
                  </Group>
                ),
                value: 'run',
              },
            ]}
          />
          {!runMode && (
            <>
              <Group gap={4}>
                {TOOL_BUTTONS.map((tb) => (
                  <Tooltip key={tb.tool} label={tb.label}>
                    <ActionIcon
                      variant={tool === tb.tool ? 'filled' : 'default'}
                      size="lg"
                      onClick={() => setTool(tb.tool)}
                    >
                      {tb.icon}
                    </ActionIcon>
                  </Tooltip>
                ))}
                <Menu shadow="md" position="bottom-start">
                  <Menu.Target>
                    <Tooltip label="Component Library">
                      <ActionIcon
                        variant={tool.startsWith('icon:') ? 'filled' : 'default'}
                        size="lg"
                      >
                        <IconStack2 size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>Engineering components</Menu.Label>
                    {LIBRARY_ICONS.map((icon) => (
                      <Menu.Item
                        key={icon.id}
                        leftSection={
                          <svg width="22" height="22" viewBox="0 0 100 100">
                            {icon.render('#c1c2c5', 6, 'none')}
                          </svg>
                        }
                        onClick={() => setTool(`icon:${icon.id}`)}
                      >
                        {icon.label}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              </Group>
              <Divider orientation="vertical" />
              <Checkbox
                label="Grid"
                size="xs"
                checked={state.showGrid}
                onChange={(e) => setState({ ...state, showGrid: e.currentTarget.checked })}
              />
              <Checkbox
                label="Snap"
                size="xs"
                checked={state.snap}
                onChange={(e) => setState({ ...state, snap: e.currentTarget.checked })}
              />
              <NumberInput
                size="xs"
                w={70}
                min={2}
                max={100}
                value={state.gridSize}
                onChange={(v) =>
                  setState({ ...state, gridSize: typeof v === 'number' ? v : state.gridSize })
                }
                aria-label="Grid size"
              />
            </>
          )}
          <Tooltip label="Zoom to fit">
            <ActionIcon variant="default" size="lg" onClick={zoomToFit}>
              <IconZoomScan size={18} />
            </ActionIcon>
          </Tooltip>
          {runMode && (
            <Group gap={6}>
              <IconTags size={14} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">
                Labels show solved values for {'{varname}'} placeholders — solve first.
              </Text>
            </Group>
          )}
        </Group>

        <Paper
          withBorder
          flex={1}
          mih={0}
          style={{ overflow: 'hidden', background: '#141517' }}
        >
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            onMouseDown={onBackgroundDown}
            onWheel={onWheel}
            style={{ display: 'block', cursor: tool === 'select' ? 'default' : 'crosshair' }}
          >
            <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
              {state.showGrid && !runMode && gridStep > 4 && (
                <GridPattern gridSize={state.gridSize} view={view} />
              )}
              {state.elements.map((el) => (
                <ElementView
                  key={el.id}
                  el={el}
                  runMode={runMode}
                  values={valueMap}
                  onMouseDown={onElementDown}
                />
              ))}
              {!runMode && selected && (
                <SelectionHandles
                  el={selected}
                  view={view}
                  onHandleDown={onHandleDown}
                  onEndpointDown={onEndpointDown}
                />
              )}
            </g>
          </svg>
        </Paper>
      </Stack>

      {!runMode && (
        <Paper withBorder p="sm" w={250} style={{ flexShrink: 0 }}>
          <ScrollArea h="100%" type="auto">
            {selected ? (
              <PropertiesPanel
                el={selected}
                onChange={(next) => updateElement(selected.id, next)}
                onDuplicate={duplicateSelected}
                onDelete={deleteSelected}
                onZOrder={zOrder}
              />
            ) : (
              <Stack gap="xs">
                <Text fw={600} size="sm" c="blue.4">
                  Diagram
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Pick a tool and drag on the canvas to draw. Click a shape to
                  select it; drag the corner handles to resize, arrow keys to
                  nudge, Del to remove. The component library holds standard
                  engineering symbols (turbine, pump, valve, …).
                </Text>
                <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                  Labels may contain {'{varname}'} placeholders: in Run mode
                  they display the solved value with units.
                </Text>
                <Divider />
                <Text size="xs" c="dimmed">
                  {state.elements.length} element(s)
                </Text>
                {state.elements.length > 0 && (
                  <Button
                    size="xs"
                    color="red"
                    variant="light"
                    onClick={() => {
                      setState({ ...state, elements: [] })
                      setSelectedId(null)
                    }}
                  >
                    Clear diagram
                  </Button>
                )}
              </Stack>
            )}
          </ScrollArea>
        </Paper>
      )}
    </Group>
  )
}

/** Dotted grid covering the visible viewport only. */
function GridPattern({
  gridSize,
  view,
}: Readonly<{ gridSize: number; view: ViewTransform }>) {
  // Visible world rect (with margin) derived from the inverse transform.
  const margin = 200
  const x0 = -view.x / view.k - margin
  const y0 = -view.y / view.k - margin
  const w = 6000 / Math.min(1, view.k) + 2 * margin
  const h = 4000 / Math.min(1, view.k) + 2 * margin
  const startX = Math.floor(x0 / gridSize) * gridSize
  const startY = Math.floor(y0 / gridSize) * gridSize
  return (
    <>
      <defs>
        <pattern
          id="diagram-grid"
          x={startX}
          y={startY}
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={0.75} cy={0.75} r={0.75} fill="#373A40" />
        </pattern>
      </defs>
      <rect
        x={startX}
        y={startY}
        width={w}
        height={h}
        fill="url(#diagram-grid)"
        pointerEvents="none"
      />
    </>
  )
}
