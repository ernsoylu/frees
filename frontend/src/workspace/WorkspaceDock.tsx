// Dockview-based workspace manager.
//
// Replaces the old single-`activeTab` content area: every window kind
// (Editor, Tables, Plots, Thermo, Digitizer, Diagram, Solution) is a dockview
// panel that can be tabbed, split/docked, floated, maximized, or closed.
//
// Design: the panel *content* lives in App (closing over all its state) and is
// handed in as a `content` map keyed by window kind. A single dockview panel
// component looks its content up by kind through React context, so there is no
// prop-threading and closed panels never mount their (heavy) subtrees — only
// the element is created, not rendered, until dockview opens it.

import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelProps,
} from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { useComputedColorScheme } from '@mantine/core'

const LAYOUT_KEY = 'frees-dock-layout-v2'

/** Latest panel content, keyed by window kind, read by every dockview panel. */
const PanelContentContext = createContext<Record<string, ReactNode>>({})

function WorkspacePanel(props: IDockviewPanelProps) {
  const content = useContext(PanelContentContext)
  // Content is keyed by panel id so multi-instance kinds (e.g. several diagram
  // windows: "diagram:<id>") each show their own content.
  return (
    <div style={{ height: '100%', width: '100%', overflow: 'auto' }}>
      {content[props.api.id] ?? null}
    </div>
  )
}

const components = { panel: WorkspacePanel }

/** A window currently open in the dock. */
export interface OpenWindow {
  id: string
  kind: string
  title: string
}

export interface WorkspaceDockHandle {
  /** Open (or focus) a singleton window whose id equals its kind. */
  open: (kind: string) => void
  /** Open (or focus) a specific window instance (multi-instance kinds). */
  openInstance: (id: string, kind: string, title: string) => void
  /** Close a window by id. */
  close: (id: string) => void
  /** Update an open window's tab title (e.g. after a rename). */
  setTitle: (id: string, title: string) => void
  isOpen: (id: string) => boolean
  /** Discard the saved layout and reopen the default set. */
  reset: () => void
}

interface Props {
  /** Rendered content for each window id (recomputed every App render). */
  content: Record<string, ReactNode>
  /** Tab title for each singleton kind / default window id. */
  titles: Record<string, string>
  /** Window ids to open on first run / reset, in order (first is the anchor). */
  defaultOpen: string[]
  /** Kinds rendered in the collapsible right edge group (Solution, Inspector)
   *  rather than as center tabs. */
  edgeKinds?: string[]
  onActiveChange?: (active: OpenWindow | null) => void
  onOpenChange?: (windows: OpenWindow[]) => void
  handleRef?: React.MutableRefObject<WorkspaceDockHandle | null>
}

const RIGHT_EDGE_ID = 'edge-right'

export function WorkspaceDock({
  content,
  titles,
  defaultOpen,
  edgeKinds = [],
  onActiveChange,
  onOpenChange,
  handleRef,
}: Readonly<Props>) {
  const apiRef = useRef<DockviewApi | null>(null)
  const scheme = useComputedColorScheme('dark')

  // Stable refs so the imperative handle and dockview callbacks always see the
  // latest props without being recreated.
  const titlesRef = useRef(titles)
  titlesRef.current = titles
  const defaultsRef = useRef(defaultOpen)
  defaultsRef.current = defaultOpen
  const edgeKindsRef = useRef(edgeKinds)
  edgeKindsRef.current = edgeKinds
  const cbRef = useRef({ onActiveChange, onOpenChange })
  cbRef.current = { onActiveChange, onOpenChange }

  const kindOf = (panel: { id: string; params?: Record<string, unknown> }): string =>
    (panel.params?.kind as string) ?? panel.id

  // The collapsible right edge group hosts "chrome" panels (Solution, the
  // diagram Inspector) — created on demand and reused thereafter.
  const ensureRightEdge = (api: DockviewApi) => {
    const existing = api.getEdgeGroup('right')
    if (existing) return existing
    return api.addEdgeGroup('right', { id: RIGHT_EDGE_ID, initialSize: 340, minimumSize: 240 })
  }

  const emitOpen = (api: DockviewApi) => {
    cbRef.current.onOpenChange?.(
      api.panels.map((p) => ({ id: p.id, kind: kindOf(p), title: p.title ?? p.id })),
    )
  }

  const openInstance = (api: DockviewApi, id: string, kind: string, title: string) => {
    const existing = api.getPanel(id)
    if (existing) {
      existing.api.setActive()
      if (edgeKindsRef.current.includes(kind)) api.getEdgeGroup('right')?.expand()
      return
    }
    if (edgeKindsRef.current.includes(kind)) {
      ensureRightEdge(api)
      api.addPanel({
        id,
        component: 'panel',
        title,
        params: { kind },
        position: { referenceGroup: RIGHT_EDGE_ID },
      })
      api.getEdgeGroup('right')?.expand()
      return
    }
    // Open center windows as a tab in the main (center) group, anchored to an
    // existing center panel — never the active edge group — so plots/tables/
    // diagrams land next to the Editor instead of beside the edge panels.
    const centerRef = api.panels.find((p) => !edgeKindsRef.current.includes(kindOf(p)))
    api.addPanel({
      id,
      component: 'panel',
      title,
      params: { kind },
      position: centerRef ? { referencePanel: centerRef.id } : undefined,
    })
  }

  const buildDefault = (api: DockviewApi) => {
    api.clear()
    const ids = defaultsRef.current
    const centerIds = ids.filter((id) => !edgeKindsRef.current.includes(id))
    const edgeIds = ids.filter((id) => edgeKindsRef.current.includes(id))
    centerIds.forEach((id, i) => {
      api.addPanel({
        id,
        component: 'panel',
        title: titlesRef.current[id] ?? id,
        params: { kind: id },
        // First panel anchors; the rest dock to the right so the default
        // layout shows them side by side rather than stacked as tabs.
        position: i === 0 ? undefined : { direction: 'right' },
      })
    })
    if (edgeIds.length > 0) {
      ensureRightEdge(api)
      edgeIds.forEach((id) =>
        api.addPanel({
          id,
          component: 'panel',
          title: titlesRef.current[id] ?? id,
          params: { kind: id },
          position: { referenceGroup: RIGHT_EDGE_ID },
        }),
      )
    }
    api.panels.find((p) => !edgeKindsRef.current.includes(kindOf(p)))?.api.setActive()
  }

  // Expose the imperative handle.
  useEffect(() => {
    if (!handleRef) return
    handleRef.current = {
      open: (kind) =>
        apiRef.current &&
        openInstance(apiRef.current, kind, kind, titlesRef.current[kind] ?? kind),
      openInstance: (id, kind, title) =>
        apiRef.current && openInstance(apiRef.current, id, kind, title),
      close: (id) => {
        try {
          const p = apiRef.current?.getPanel(id)
          if (p) apiRef.current?.removePanel(p)
        } catch {
          /* ignore */
        }
      },
      setTitle: (id, title) => {
        try {
          const p = apiRef.current?.getPanel(id)
          if (p && p.title !== title) p.api.setTitle(title)
        } catch {
          /* never let a tab-title update crash the app */
        }
      },
      isOpen: (id) => !!apiRef.current?.getPanel(id),
      reset: () => {
        if (!apiRef.current) return
        localStorage.removeItem(LAYOUT_KEY)
        buildDefault(apiRef.current)
      },
    }
    return () => {
      if (handleRef) handleRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onReady = (event: DockviewReadyEvent) => {
    const api = event.api
    apiRef.current = api

    let restored = false
    const saved = localStorage.getItem(LAYOUT_KEY)
    if (saved) {
      try {
        api.fromJSON(JSON.parse(saved))
        restored = api.panels.length > 0
      } catch {
        restored = false
      }
    }
    if (!restored) buildDefault(api)

    api.onDidLayoutChange(() => {
      try {
        localStorage.setItem(LAYOUT_KEY, JSON.stringify(api.toJSON()))
      } catch {
        /* quota — non-fatal; layout just won't persist */
      }
    })
    const reportActive = (panel: { id: string; title?: string; params?: Record<string, unknown> } | undefined) => {
      cbRef.current.onActiveChange?.(
        panel ? { id: panel.id, kind: kindOf(panel), title: panel.title ?? panel.id } : null,
      )
    }
    api.onDidActivePanelChange((panel) => reportActive(panel ?? undefined))
    const sync = () => emitOpen(api)
    api.onDidAddPanel(sync)
    api.onDidRemovePanel(sync)
    sync()
    reportActive(api.activePanel ?? undefined)
  }

  return (
    <PanelContentContext.Provider value={content}>
      {/* Align dockview's surfaces with the app's Mantine color scale (these
          vars are theme-aware, so one block serves both light and dark). */}
      <style>{`
        .dockview-theme-dark, .dockview-theme-light {
          --dv-group-view-background-color: var(--mantine-color-body);
          --dv-tabs-and-actions-container-background-color: var(--mantine-color-default);
          --dv-activegroup-visiblepanel-tab-background-color: var(--mantine-color-body);
          --dv-activegroup-visiblepanel-tab-color: var(--mantine-color-text);
          --dv-inactivegroup-visiblepanel-tab-background-color: var(--mantine-color-default);
          --dv-inactivegroup-visiblepanel-tab-color: var(--mantine-color-dimmed);
          --dv-tabs-container-scrollbar-color: var(--mantine-color-default-border);
          --dv-tab-divider-color: var(--mantine-color-default-border);
          --dv-separator-border: var(--mantine-color-default-border);
          --dv-paneview-active-outline-color: var(--mantine-color-blue-6);
          --dv-active-sash-color: var(--mantine-color-blue-6);
          --dv-icon-hover-background-color: var(--mantine-color-default-hover);
        }
      `}</style>
      <div style={{ width: '100%', height: '100%' }}>
        <DockviewReact
          className={scheme === 'light' ? 'dockview-theme-light' : 'dockview-theme-dark'}
          components={components}
          onReady={onReady}
        />
      </div>
    </PanelContentContext.Provider>
  )
}
