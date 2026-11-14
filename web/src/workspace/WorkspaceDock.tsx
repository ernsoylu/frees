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
  type IDockviewPanelHeaderProps,
} from 'dockview-react'
import 'dockview-react/dist/styles/dockview.css'
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FC,
  type ReactNode,
} from 'react'
import { useComputedColorScheme } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconChartGridDots,
  IconSitemap,
  IconSettings,
  IconChartLine,
  IconChecks,
  IconCode,
  IconTable,
  IconTemperature,
  IconTerminal2,
  IconVariable,
  IconX,
  IconGrid4x4,
  type IconProps,
} from '@tabler/icons-react'

import { CommandContextMenu } from '../ContextMenu'
import { COMMAND_SPECS, TAB_MENU, type Commands, type MenuEntry } from '../commands'
import { windowActionReason, type DockWindow, type WindowAction } from './windowActions'

const LAYOUT_KEY = 'frees-dock-layout-v3'

/** Latest panel content, keyed by window kind, read by every dockview panel. */
const PanelContentContext = createContext<Record<string, ReactNode>>({})

function WorkspacePanel(props: IDockviewPanelProps) {
  const content = useContext(PanelContentContext)
  // Content is keyed by panel id so multi-instance kinds (e.g. several diagram
  // windows: "diagram:<id>") each show their own content.
  return (
    <div style={{ height: '100%', width: '100%', overflow: 'auto', backgroundColor: 'var(--mantine-color-body)' }}>
      {content[props.api.id] ?? null}
    </div>
  )
}

const components = { panel: WorkspacePanel }

// Per-kind tab icon so each window's "application" is recognisable at a glance
// even when the tab is narrow and its title is clipped.
const KIND_ICONS: Record<string, FC<IconProps>> = {
  equations: IconCode,
  table: IconTable,
  plots: IconChartLine,
  plot: IconChartLine,
  digitizer: IconChartGridDots,
  schematic: IconSitemap,
  workspace: IconVariable,
  terminal: IconTerminal2,
  spreadsheet: IconGrid4x4,
  states: IconTemperature,
  solution: IconChecks,
  inspector: IconSettings,
}

/** Tab renderer: a per-kind icon, the live title, and a close button.
 *  Mirrors dockview's default tab markup (so the bundled CSS applies) but
 *  prefixes the icon — the default tab ignores children, hence the rebuild. */
function WorkspaceTab(props: IDockviewPanelHeaderProps) {
  const { api } = props
  const kind = (props.params?.kind as string) ?? api.id
  const Icon = KIND_ICONS[kind]
  const title = useSyncExternalStore(
    (cb) => {
      const sub = api.onDidTitleChange(cb)
      return () => sub.dispose()
    },
    () => api.title,
    () => api.title,
  )
  return (
    <div className="dv-default-tab" data-testid="dockview-dv-default-tab" data-panel-id={api.id}>
      {Icon && <Icon size={13} style={{ flexShrink: 0, marginRight: 4 }} aria-hidden />}
      {/* A long name is cut with an ellipsis; the full name is its tooltip and accessible name (AC-10). */}
      <span
        className="dv-default-tab-content"
        title={title}
        aria-label={title}
        style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {title}
      </span>
      <button
        type="button"
        aria-label="Close"
        className="dv-default-tab-action"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'inherit' }}
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault()
          api.close()
        }}
      >
        <IconX size={13} />
      </button>
    </div>
  )
}

/** A window currently open in the dock. */
export type OpenWindow = DockWindow

/** Named layout presets ("perspectives") a user can jump between without
 *  hand-rearranging panels after an accidental close/drag. */
export type LayoutPerspective = 'default' | 'results' | 'split'

// Each perspective is groups of tabbed center panels laid out left→right, plus
// whether the right edge group (Variable Explorer / Inspector) starts expanded.
// 'default' is not listed: it delegates to buildDefault so it always tracks the
// `defaultOpen` prop.
const PERSPECTIVES: Record<Exclude<LayoutPerspective, 'default'>, { center: string[][]; expandEdge: boolean }> = {
  // Editor beside the solved outputs (Plots tabbed with Fluid States), with the
  // Variable Explorer expanded — everything a re-solve changes, on one screen.
  results: { center: [['equations'], ['plots', 'states']], expandEdge: true },
  // A clean 50/50 Editor | Plots split; the edge group stays collapsed.
  split: { center: [['equations'], ['plots']], expandEdge: false },
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
  /** Restore a previously-serialised dockview layout (from a project file or a
   *  named layout). False when it could not be read and the default was built. */
  restore: (layout: unknown) => boolean
  /** The open windows as dockview holds them now. */
  windows: () => DockWindow[]
  /** The dock's layout as dockview serialises it, for a named layout. */
  serialize: () => unknown
  /** Go back to the layout before the last structural change; again to return (Phase Q). */
  undoLayout: () => void
  /** Rebuild the dock as one of the named layout presets. */
  applyPerspective: (perspective: LayoutPerspective) => void
  /** Bring an open window to the front (expanding the edge panel if it is there). */
  focus: (id: string) => void
  /** Run a window action (Phase Q). False when the window is no longer open. */
  act: (id: string, action: WindowAction) => boolean
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
  onActiveChange?: (active: Pick<OpenWindow, 'id' | 'kind' | 'title'> | null) => void
  onOpenChange?: (windows: OpenWindow[]) => void
  /** Commands a window's tab menu shows above the window commands (a plot's Rename, Configure, Export). */
  tabMenuFor?: (w: DockWindow) => { entries: readonly MenuEntry[]; cmds: Commands } | null
  /** Whether there is a layout change to undo. */
  onUndoChange?: (can: boolean) => void
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
  onUndoChange,
  tabMenuFor,
  handleRef,
}: Readonly<Props>) {
  const apiRef = useRef<DockviewApi | null>(null)
  // The tab whose context menu is open, with the window list as it was then.
  const [tabMenu, setTabMenu] = useState<{ id: string; x: number; y: number; windows: DockWindow[] } | null>(null)
  const lastEmitRef = useRef('')
  const scheme = useComputedColorScheme('dark')

  // Stable refs so the imperative handle and dockview callbacks always see the
  // latest props without being recreated.
  const titlesRef = useRef(titles)
  const defaultsRef = useRef(defaultOpen)
  const edgeKindsRef = useRef(edgeKinds)
  const cbRef = useRef({ onActiveChange, onOpenChange, onUndoChange })
  // Undo Layout Change: the layout as it was before the last structural change
  // (a drag, a window command, a layout applied). `quiet` holds while one
  // command makes several changes, so they undo as one.
  const undoRef = useRef<unknown>(null)
  const quietRef = useRef(false)

  useLayoutEffect(() => {
    titlesRef.current = titles
    defaultsRef.current = defaultOpen
    edgeKindsRef.current = edgeKinds
    cbRef.current = { onActiveChange, onOpenChange, onUndoChange }
  })

  const remember = (layout: unknown) => {
    const had = undoRef.current !== null
    undoRef.current = layout
    if (!had) cbRef.current.onUndoChange?.(true)
  }
  /** Runs one command's worth of changes, remembering the layout before them once. */
  const change = <T,>(api: DockviewApi, fn: () => T): T => {
    if (quietRef.current) return fn()
    remember(api.toJSON())
    quietRef.current = true
    try {
      return fn()
    } finally {
      quietRef.current = false
    }
  }

  const kindOf = (panel: { id: string; params?: Record<string, unknown> }): string =>
    (panel.params?.kind as string) ?? panel.id

  // The collapsible right edge group hosts "chrome" panels (Solution, the
  // diagram Inspector) — created on demand and reused thereafter.
  const ensureRightEdge = (api: DockviewApi) => {
    const existing = api.getEdgeGroup('right')
    if (existing) return existing
    return api.addEdgeGroup('right', { id: RIGHT_EDGE_ID, initialSize: 400, minimumSize: 260 })
  }

  const snapshot = (api: DockviewApi): DockWindow[] =>
    api.panels.map((p) => {
      const place = p.group.api.location.type
      return {
        id: p.id,
        kind: kindOf(p),
        title: p.title ?? p.id,
        group: p.group.id,
        place: place === 'grid' || place === 'edge' ? place : 'floating',
        maximized: p.api.isMaximized(),
      }
    })

  // Reports the window list only when it differs, so a mutation that changes
  // nothing a consumer reads costs no render.
  const emitOpen = (api: DockviewApi) => {
    const windows = snapshot(api)
    const key = JSON.stringify(windows)
    if (key === lastEmitRef.current) return
    lastEmitRef.current = key
    cbRef.current.onOpenChange?.(windows)
  }

  const focus = (api: DockviewApi, id: string) => {
    const panel = api.getPanel(id)
    if (!panel) return
    if (panel.group.api.location.type === 'edge') panel.group.api.expand()
    panel.api.setActive()
  }

  // Docks a window as a tab beside another centre window, or in a new centre
  // group when there is none.
  const toCentre = (api: DockviewApi, id: string) => {
    const panel = api.getPanel(id)
    if (!panel) return
    const beside = api.panels.find((p) => p.id !== id && p.group.api.location.type === 'grid')
    panel.api.moveTo({ group: beside ? beside.group : api.addGroup() })
  }

  const act = (api: DockviewApi, id: string, action: WindowAction): boolean => {
    const panel = api.getPanel(id)
    if (!panel) return false
    const group = panel.group
    // A move starts from the grid as it is, not from one maximized group.
    if (action !== 'maximize' && api.hasMaximizedGroup()) api.exitMaximizedGroup()
    switch (action) {
      case 'close':
        api.removePanel(panel)
        return true
      case 'closeOthers':
        for (const p of [...group.panels]) if (p.id !== id) api.removePanel(p)
        break
      case 'closeGroup':
        for (const p of [...group.panels]) api.removePanel(p)
        return true
      case 'float':
        if (group.api.location.type === 'floating') toCentre(api, id)
        else api.addFloatingGroup(panel, { x: 80, y: 80, width: 640, height: 420 })
        break
      case 'maximize':
        if (panel.api.isMaximized()) panel.api.exitMaximized()
        else panel.api.maximize()
        break
      case 'moveEdge': {
        ensureRightEdge(api)
        const edge = api.getGroup(RIGHT_EDGE_ID)
        if (edge) panel.api.moveTo({ group: edge as typeof group })
        break
      }
      case 'moveCentre':
        toCentre(api, id)
        break
      case 'moveLeft':
        panel.api.moveTo({ group, position: 'left' })
        break
      case 'moveRight':
        panel.api.moveTo({ group, position: 'right' })
        break
      case 'moveBelow':
        panel.api.moveTo({ group, position: 'bottom' })
        break
    }
    focus(api, id)
    return true
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
    let position: Parameters<DockviewApi['addPanel']>[0]['position']
    if (centerRef) {
      // Tab it next to an existing center panel (e.g. the Editor).
      position = { referencePanel: centerRef.id }
    } else if (api.getEdgeGroup('right')) {
      // No center panels left (e.g. the Editor was closed): a bare `undefined`
      // position would drop the panel into the active group, which is now the
      // right edge group. Anchor a fresh center group to the LEFT of the edge
      // group so the window lands in the main area, not beside the edge panels.
      position = { direction: 'left' }
    } else {
      // Empty dock: this becomes the first/root group.
      position = undefined
    }
    api.addPanel({
      id,
      component: 'panel',
      title,
      params: { kind },
      position,
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
      // Show the edge group (Variable Explorer) expanded by default rather than
      // as a collapsed rotated tab, so solved variables are visible immediately.
      api.getEdgeGroup('right')?.expand()
    }
    api.panels.find((p) => !edgeKindsRef.current.includes(kindOf(p)))?.api.setActive()
  }

  const buildPerspective = (api: DockviewApi, perspective: LayoutPerspective) => {
    if (perspective === 'default') {
      buildDefault(api)
      return
    }
    const spec = PERSPECTIVES[perspective]
    api.clear()
    spec.center.forEach((group, gi) => {
      group.forEach((id, pi) => {
        api.addPanel({
          id,
          component: 'panel',
          title: titlesRef.current[id] ?? id,
          params: { kind: id },
          // First panel of the first group anchors; later groups split to the
          // right; later panels within a group tab onto the group's first.
          position: pi > 0 ? { referencePanel: group[0] } : gi === 0 ? undefined : { direction: 'right' },
        })
      })
    })
    // The edge chrome (Variable Explorer / Inspector) is part of every
    // perspective; only whether it starts expanded varies.
    ensureRightEdge(api)
    for (const id of edgeKindsRef.current) {
      api.addPanel({
        id,
        component: 'panel',
        title: titlesRef.current[id] ?? id,
        params: { kind: id },
        position: { referenceGroup: RIGHT_EDGE_ID },
      })
    }
    if (spec.expandEdge) {
      api.getEdgeGroup('right')?.expand()
      // The last-added edge panel (Inspector) is active by default; the
      // Variable Explorer is the edge tab a results layout is about.
      api.getPanel(edgeKindsRef.current[0])?.api.setActive()
    }
    // Show each group's first tab, ending on the editor group.
    for (const group of [...spec.center].reverse()) {
      api.getPanel(group[0])?.api.setActive()
    }
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
          if (p && p.title !== title) {
            p.api.setTitle(title)
            if (apiRef.current) emitOpen(apiRef.current)
          }
        } catch {
          /* never let a tab-title update crash the app */
        }
      },
      isOpen: (id) => !!apiRef.current?.getPanel(id),
      reset: () => {
        const api = apiRef.current
        if (!api) return
        localStorage.removeItem(LAYOUT_KEY)
        change(api, () => buildDefault(api))
      },
      restore: (layout) => {
        const api = apiRef.current
        if (!api || layout == null || typeof layout !== 'object') return true
        return change(api, () => {
          try {
            api.fromJSON(layout as Parameters<DockviewApi['fromJSON']>[0])
            if (api.panels.length > 0) return true
          } catch {
            // Corrupt or version-mismatched layout: fall through to the default.
          }
          buildDefault(api)
          return false
        })
      },
      windows: () => (apiRef.current ? snapshot(apiRef.current) : []),
      serialize: () => apiRef.current?.toJSON() ?? null,
      undoLayout: () => {
        const api = apiRef.current
        const before = undoRef.current
        if (!api || before === null) return
        const now = api.toJSON()
        quietRef.current = true
        try {
          api.fromJSON(before as Parameters<DockviewApi['fromJSON']>[0])
        } catch {
          api.fromJSON(now)
        } finally {
          quietRef.current = false
        }
        undoRef.current = now
      },
      applyPerspective: (perspective) => {
        const api = apiRef.current
        if (api) change(api, () => buildPerspective(api, perspective))
      },
      focus: (id) => {
        if (apiRef.current) focus(apiRef.current, id)
      },
      act: (id, action) => {
        const api = apiRef.current
        try {
          return !!api && change(api, () => act(api, id, action))
        } catch {
          // A move dockview refuses leaves the layout as it was.
          return true
        }
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
    // Expose the dockview API for Playwright e2e tests
    ;(window as unknown as Record<string, unknown>).__freesTest = { dockviewApi: api }

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

    // Subscribed after the first layout is built, so opening the app is not a change to undo.
    api.onWillMutateLayout(() => {
      if (!quietRef.current) remember(api.toJSON())
    })
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
    // dockview 7 wraps the panel in a { panel, origin } event object.
    api.onDidActivePanelChange(({ panel }) => reportActive(panel ?? undefined))
    const sync = () => emitOpen(api)
    api.onDidAddPanel(sync)
    api.onDidRemovePanel(sync)
    // Moves, floats, maximize and a loaded layout change a window's group and place.
    api.onDidMutateLayout(sync)
    api.onDidLayoutFromJSON(sync)
    sync()
    reportActive(api.activePanel ?? undefined)
  }

  // One handler for every tab, wherever dockview has moved it: a right click,
  // or the menu key or Shift+F10 on the focused tab. A key reports no pointer
  // position, so the menu then opens under the tab.
  const openTabMenu = (e: { target: EventTarget; preventDefault: () => void }, x = 0, y = 0) => {
    const tab = (e.target as HTMLElement).closest<HTMLElement>('.dv-tab')
    const id = tab?.querySelector<HTMLElement>('[data-panel-id]')?.dataset.panelId
    if (!tab || !id || !apiRef.current) return
    e.preventDefault()
    const r = tab.getBoundingClientRect()
    const menu = { id, x: x || r.left, y: y || r.bottom, windows: snapshot(apiRef.current) }
    // After this event: Mantine closes a menu on any keydown outside it, and
    // the key that opens this one would count.
    setTimeout(() => setTabMenu(menu))
  }
  // The menu's rows are the registry's commands, run on the tab it was opened on.
  const tabCommands = tabMenu
    ? (Object.fromEntries(
        TAB_MENU.filter((e) => e !== '-').map(([id, action]) => [
          id,
          {
            ...COMMAND_SPECS[id],
            id,
            run: () => {
              const api = apiRef.current
              if (api && !change(api, () => act(api, tabMenu.id, action))) {
                notifications.show({ color: 'yellow', message: 'That window is no longer open.' })
              }
            },
            unavailable: windowActionReason(tabMenu.windows, tabMenu.id, action),
          },
        ]),
      ) as unknown as Commands)
    : null

  const tabWindow = tabMenu?.windows.find((w) => w.id === tabMenu.id)
  const tabExtras = tabWindow ? tabMenuFor?.(tabWindow) : null

  return (
    <PanelContentContext.Provider value={content}>
      {tabMenu && tabCommands && (
        <CommandContextMenu
          at={tabMenu}
          label={`${tabWindow?.title ?? 'Window'} tab menu`}
          onClose={() => setTabMenu(null)}
          cmds={{ ...tabCommands, ...tabExtras?.cmds }}
          entries={[...(tabExtras?.entries ?? []), ...TAB_MENU.map((e) => (e === '-' ? e : e[0]))]}
        />
      )}
      {/* Align dockview's surfaces with the app's Mantine color scale (these
          vars are theme-aware, so one block serves both light and dark). */}
      <style>{`
        .dockview-theme-dark, .dockview-theme-light, .dockview-theme-abyss {
          /* One single surface colour everywhere — center groups, tab strips
             and the right edge group (Solution/Inspector) — so the whole
             workspace matches the app background instead of the edge bars
             reading as a lighter blue-grey. Active vs inactive tabs are
             distinguished by text colour and the teal active outline. */
          --dv-group-view-background-color: var(--mantine-color-body);
          --dv-tabs-and-actions-container-background-color: var(--mantine-color-body);
          --dv-activegroup-visiblepanel-tab-background-color: var(--mantine-color-body);
          --dv-activegroup-visiblepanel-tab-color: var(--mantine-color-text);
          --dv-inactivegroup-visiblepanel-tab-background-color: var(--mantine-color-body);
          --dv-inactivegroup-visiblepanel-tab-color: var(--mantine-color-dimmed);
          --dv-tabs-container-scrollbar-color: var(--mantine-color-default-border);
          --dv-tab-divider-color: var(--mantine-color-default-border);
          --dv-separator-border: var(--mantine-color-default-border);
          --dv-paneview-active-outline-color: var(--mantine-color-teal-6);
          --dv-active-sash-color: var(--mantine-color-teal-6);
          --dv-icon-hover-background-color: var(--mantine-color-default-hover);
          /* The decorative per-group accent line/chip defaults to blue
             (#1a73e8). Retint the palette to the app's teal and hide the line
             so the right edge group (Solution/Inspector) is not blue. */
          --dv-tab-group-color-blue: var(--mantine-color-teal-6);
          --dv-tab-group-color-cyan: var(--mantine-color-teal-6);
          --dv-tab-group-line-opacity: 0;
          --dv-tab-divider-color: var(--mantine-color-default-border);
        }
        /* The collapsed right edge group (rotated Solution/Inspector tabs) and
           its expanded surface render in a separate container — pin them to the
           app background too. */
        .dockview-theme-dark .dv-groupview-edge,
        .dockview-theme-light .dv-groupview-edge,
        .dockview-theme-abyss .dv-groupview-edge,
        .dockview-theme-dark .dv-edge-collapsed,
        .dockview-theme-light .dv-edge-collapsed,
        .dockview-theme-abyss .dv-edge-collapsed {
          background-color: var(--mantine-color-body);
        }
        /* When the edge group is EXPANDED, dockview rips it into a floating
           panel (.dv-resize-container) inside the overlay host. Pin that panel
           and its inner tree to the app background. Do NOT colour the
           .dv-floating-overlay-host itself: it is an absolutely-positioned
           sibling sized to the FULL grid rect (it mirrors the gridview so saved
           positions stay valid) and stacks above the panel-content render
           container — an opaque background on it paints over the entire grid and
           the whole workspace goes blank. Note dockview's hyphenated
           .dv-split-view-container (not .dv-splitview-container). */
        .dockview-theme-dark .dv-floating-overlay-host .dv-resize-container,
        .dockview-theme-light .dv-floating-overlay-host .dv-resize-container,
        .dockview-theme-abyss .dv-floating-overlay-host .dv-resize-container,
        .dockview-theme-dark .dv-floating-overlay-host .dv-split-view-container,
        .dockview-theme-light .dv-floating-overlay-host .dv-split-view-container,
        .dockview-theme-abyss .dv-floating-overlay-host .dv-split-view-container,
        .dockview-theme-dark .dv-floating-overlay-host .dv-view,
        .dockview-theme-light .dv-floating-overlay-host .dv-view,
        .dockview-theme-abyss .dv-floating-overlay-host .dv-view,
        .dockview-theme-dark .dv-groupview.dv-groupview-edge,
        .dockview-theme-light .dv-groupview.dv-groupview-edge,
        .dockview-theme-abyss .dv-groupview.dv-groupview-edge,
        .dockview-theme-dark .dv-groupview-edge > .dv-content-container,
        .dockview-theme-light .dv-groupview-edge > .dv-content-container,
        .dockview-theme-abyss .dv-groupview-edge > .dv-content-container,
        .dockview-theme-dark .dv-groupview-edge > .dv-tabs-and-actions-container,
        .dockview-theme-light .dv-groupview-edge > .dv-tabs-and-actions-container,
        .dockview-theme-abyss .dv-groupview-edge > .dv-tabs-and-actions-container {
          background-color: var(--mantine-color-body) !important;
        }
        /* Kill the floating panel's hardcoded border + shadow (the thin blue
           line on the left). Target the resize-container, not the full-grid
           overlay host (see note above). */
        .dockview-theme-dark .dv-floating-overlay-host .dv-resize-container,
        .dockview-theme-light .dv-floating-overlay-host .dv-resize-container,
        .dockview-theme-abyss .dv-floating-overlay-host .dv-resize-container {
          border-left: 1px solid var(--mantine-color-default-border) !important;
          box-shadow: none !important;
        }
        /* The resize sash (the other half of the "thin blue line") — transparent
           until hovered/active, then teal to match the app's accents. */
        .dockview-theme-dark .dv-sash,
        .dockview-theme-light .dv-sash,
        .dockview-theme-abyss .dv-sash {
          background-color: transparent !important;
        }
        .dockview-theme-dark .dv-sash:hover,
        .dockview-theme-light .dv-sash:hover,
        .dockview-theme-abyss .dv-sash:hover,
        .dockview-theme-dark .dv-sash.active,
        .dockview-theme-light .dv-sash.active,
        .dockview-theme-abyss .dv-sash.active {
          background-color: var(--mantine-color-teal-6) !important;
        }
        /* Hide the stubborn blue active-tab indicator inside the edge header. */
        .dockview-theme-dark .dv-groupview-edge .dv-tab-divider,
        .dockview-theme-light .dv-groupview-edge .dv-tab-divider,
        .dockview-theme-abyss .dv-groupview-edge .dv-tab-divider {
          background-color: transparent !important;
        }
        /* The focusable dock tabs/groups (tabindex=0) otherwise show the
           browser's default blue focus ring on the active edge group. Retint
           keyboard focus to teal and drop the ring for mouse focus. */
        .dockview-theme-dark .dv-tab:focus-visible,
        .dockview-theme-light .dv-tab:focus-visible,
        .dockview-theme-abyss .dv-tab:focus-visible,
        .dockview-theme-dark .dv-groupview:focus-visible,
        .dockview-theme-light .dv-groupview:focus-visible,
        .dockview-theme-abyss .dv-groupview:focus-visible {
          outline: 1px solid var(--mantine-color-teal-6);
          outline-offset: -1px;
        }
        .dockview-theme-dark .dv-tab:focus:not(:focus-visible),
        .dockview-theme-light .dv-tab:focus:not(:focus-visible),
        .dockview-theme-abyss .dv-tab:focus:not(:focus-visible),
        .dockview-theme-dark .dv-groupview:focus:not(:focus-visible),
        .dockview-theme-light .dv-groupview:focus:not(:focus-visible),
        .dockview-theme-abyss .dv-groupview:focus:not(:focus-visible),
        .dockview-theme-dark .dv-content-container:focus,
        .dockview-theme-light .dv-content-container:focus,
        .dockview-theme-abyss .dv-content-container:focus {
          outline: none;
        }
        /* The expanded edge group lays its content + rotated tab strip out as a
           row-reverse flex with overflow:hidden. Its content container defaults
           to min-width:auto, so a panel whose content is wider than the slot
           (e.g. the Variable Explorer's multi-column table) cannot shrink and
           overflows — clipping the LEFT side (names, title) since the strip is
           pinned right. min-width:0 lets the content shrink to the slot so inner
           scroll containers (the table) handle their own overflow instead. */
        .dockview-theme-dark .dv-groupview-edge .dv-content-container,
        .dockview-theme-light .dv-groupview-edge .dv-content-container,
        .dockview-theme-abyss .dv-groupview-edge .dv-content-container {
          min-width: 0;
        }
        /* Force the collapsed right/left edge tabs and containers to match
           the main app background and remove the default blue/grey color. */
        .dockview-theme-dark .dv-edge-collapsed,
        .dockview-theme-light .dv-edge-collapsed,
        .dockview-theme-abyss .dv-edge-collapsed,
        .dockview-theme-dark .dv-edge-collapsed .dv-tabs-and-actions-container,
        .dockview-theme-light .dv-edge-collapsed .dv-tabs-and-actions-container,
        .dockview-theme-abyss .dv-edge-collapsed .dv-tabs-and-actions-container,
        .dockview-theme-dark .dv-edge-collapsed .dv-tab,
        .dockview-theme-light .dv-edge-collapsed .dv-tab,
        .dockview-theme-abyss .dv-edge-collapsed .dv-tab,
        .dockview-theme-dark .dv-groupview-edge .dv-tab,
        .dockview-theme-light .dv-groupview-edge .dv-tab,
        .dockview-theme-abyss .dv-groupview-edge .dv-tab {
          background-color: var(--mantine-color-body) !important;
        }
      `}</style>
      <div
        // Its own stacking context: dockview stacks floating windows and panel
        // overlays at 999, which put a floating window on top of the app's
        // dialogs and menus (Mantine starts at 200). Inside this context they
        // still order among themselves, and nothing here outranks a portal.
        style={{ width: '100%', height: '100%', isolation: 'isolate' }}
        onContextMenu={(e) => openTabMenu(e, e.clientX, e.clientY)}
        onKeyDown={(e) => {
          if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) openTabMenu(e)
        }}
      >
        <DockviewReact
          className={scheme === 'light' ? 'dockview-theme-light' : 'dockview-theme-dark'}
          components={components}
          defaultTabComponent={WorkspaceTab}
          onReady={onReady}
        />
      </div>
    </PanelContentContext.Provider>
  )
}
