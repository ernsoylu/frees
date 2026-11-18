// Phase Q: state that outlives the view that edits it. `useKeptState` is
// `useState` whose value is held here under a key, so closing a dialog or a
// dock window and opening it again shows the draft as it was left (AC-11).
// It lasts for the page and the project: a project switch clears it, because a
// draft names that project's variables and tables. Nothing here is saved.
//
// Phase R: every mounted user of a key reads the one value here, so a run that
// finishes after its view closed still leaves its result, and the view that
// opens next shows it. A value set by a view from before a project switch is
// dropped, not carried into the next project; a view still on screen across
// the switch keeps working.
import { useCallback, useEffect, useRef, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'

const kept = new Map<string, unknown>()
const listeners = new Map<string, Set<() => void>>()
let epoch = 0
const mounted = new Set<{ current: number }>()

export function useKeptState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  // The first reader of a key seeds it; later readers find it.
  if (!kept.has(key)) kept.set(key, initial instanceof Function ? initial() : initial)
  const subscribe = useCallback((l: () => void) => {
    const set = listeners.get(key) ?? new Set()
    listeners.set(key, set.add(l))
    return () => void set.delete(l)
  }, [key])
  const value = useSyncExternalStore(subscribe, () => kept.get(key) as T)
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  })
  const born = useRef(epoch)
  useEffect(() => {
    mounted.add(born)
    return () => void mounted.delete(born)
  }, [])
  const set = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    if (born.current !== epoch) return
    const next = action instanceof Function ? action(kept.has(key) ? (kept.get(key) as T) : latest.current) : action
    kept.set(key, next)
    for (const l of listeners.get(key) ?? []) l()
  }, [key])
  return [value, set]
}

/** Forgets every kept value (a project switch). */
export function clearKeptState() {
  kept.clear()
  epoch++
  for (const m of mounted) m.current = epoch
}
