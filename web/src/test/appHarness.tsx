// Shared scaffolding for tests that mount the real <App />: jsdom stand-ins
// for the layout APIs App touches, a dock that renders without dockview, and
// the engine stubbed one layer below api.ts so the real mapping runs.
import { useEffect, type ReactNode } from 'react'
import { vi } from 'vitest'

/**
 * Call from `beforeEach`. `phone` picks the layout: the phone one reaches the
 * workbook and Solve table through plain buttons, where the desktop rail's
 * menus need layout jsdom does not have. Pair with
 * `afterEach(() => vi.unstubAllGlobals())`; the style spy stays for the file,
 * because floating-ui can measure after a test's own cleanup has run.
 */
export function stubJsdomForApp({ phone }: { phone: boolean }) {
  vi.stubGlobal('matchMedia', () => ({ matches: phone, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  HTMLElement.prototype.scrollIntoView = () => {}
  // CodeMirror measures text ranges, which jsdom does not lay out.
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => new DOMRect()
  // jsdom throws resolving some of Mantine's CSS lengths; an unreadable style
  // reads as an empty one. Both the global and the element's own window,
  // where floating-ui reads it.
  const view = document.defaultView!
  const computed = view.getComputedStyle.bind(view)
  const safe = (el: Element, pseudo?: string | null) => {
    try {
      return computed(el, pseudo)
    } catch {
      return document.createElement('div').style
    }
  }
  vi.stubGlobal('getComputedStyle', safe)
  vi.spyOn(view, 'getComputedStyle').mockImplementation(safe)
  localStorage.clear()
  // A returning user: no first-run dialog over the workspace.
  localStorage.setItem('frees.firstRunDismissed', 'true')
  localStorage.setItem('frees.gettingStartedSeen', 'true')
}

/**
 * The engine module for `vi.mock('./wasm/engineClient', …)`: every function
 * resolves `{}`, and `wasmCheck` reports a solvable document over `variables`.
 */
export function stubbedEngine(real: Record<string, unknown>, variables: string[]) {
  const stubbed: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(real)) stubbed[k] = typeof v === 'function' ? vi.fn(async () => ({})) : v
  stubbed.wasmCheck = vi.fn(async () => ({
    solvable: true, equations: variables.length, unknowns: variables.length, variables,
    unitWarnings: [], inferredUnits: {}, message: 'ok',
  }))
  return stubbed
}

/**
 * A `WorkspaceDock` for jsdom, where dockview never makes anything active. It
 * reports `active()` once on mount, as dockview's first report does (App
 * passes a fresh callback every render), and renders `show(content)`.
 */
export function fakeWorkspaceDock(
  active: () => { id: string; kind: string },
  show: (content: Record<string, ReactNode>) => ReactNode = () => null,
) {
  return function WorkspaceDock({ content, onActiveChange, handleRef }: {
    content: Record<string, ReactNode>
    onActiveChange?: (w: { id: string; kind: string; title: string }) => void
    handleRef?: { current: unknown }
  }) {
    useEffect(() => {
      if (handleRef) {
        handleRef.current = {
          open() {}, openInstance() {}, close() {}, setTitle() {}, isOpen: () => false,
          reset() {}, restore() {}, applyPerspective() {},
        }
      }
      const { id, kind } = active()
      onActiveChange?.({ id, kind, title: kind })
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return <>{show(content)}</>
  }
}
