// Phase O: contextual commands. A window (the Tables workbook, a plot, the
// digitizer, the Editor, the schematic) publishes the registry commands it can
// run, keyed by its dock window id; App runs the focused window's handler and
// reports a reason when that window published none. The store notifies only
// when a window's set of commands or their availability changes, so a panel
// that publishes on every render does not re-render App on every render.
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { CommandHandler, CommandId } from './commands'

export type ContextHandlers = Partial<Record<CommandId, CommandHandler>>

const store = new Map<string, ContextHandlers>()
const listeners = new Set<() => void>()
let version = 0

function notify() {
  version++
  for (const l of listeners) l()
}

export function publishContext(windowId: string, handlers: ContextHandlers) {
  store.set(windowId, handlers)
  notify()
}

export function withdrawContext(windowId: string, handlers: ContextHandlers) {
  // A remount may have published again before the old instance's cleanup ran.
  if (store.get(windowId) !== handlers) return
  store.delete(windowId)
  notify()
}

export function contextHandler(windowId: string | undefined, id: CommandId): CommandHandler | undefined {
  return windowId ? store.get(windowId)?.[id] : undefined
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Re-render when any window's published commands change. */
export function useContextVersion(): number {
  return useSyncExternalStore(subscribe, () => version)
}

/**
 * Publish `handlers` for `windowId` while mounted. Handlers may be new
 * closures every render: the published entries call through a ref, and the
 * store is told only when the ids or their `unavailable`/`description` change.
 */
export function usePublishContext(windowId: string | null, handlers: ContextHandlers) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })
  const signature = JSON.stringify(
    Object.entries(handlers).map(([id, h]) => [id, h?.unavailable ?? null, h?.description ?? null]),
  )
  useEffect(() => {
    if (!windowId) return
    const published: ContextHandlers = {}
    for (const [id, unavailable, description] of JSON.parse(signature) as [CommandId, string | null, string | null][]) {
      published[id] = { run: () => ref.current[id]?.run(), unavailable, description: description ?? undefined }
    }
    publishContext(windowId, published)
    return () => withdrawContext(windowId, published)
  }, [windowId, signature])
}
