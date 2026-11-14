// Phase Q: state that outlives the view that edits it. `useKeptState` is
// `useState` whose value is also held here under a key, so closing a dialog or
// a dock window and opening it again shows the draft as it was left (AC-11).
// It lasts for the page and the project: a project switch clears it, because a
// draft names that project's variables and tables. Nothing here is saved.
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

const kept = new Map<string, unknown>()

export function useKeptState<T>(key: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => (kept.has(key) ? (kept.get(key) as T) : initial instanceof Function ? initial() : initial))
  const set = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    setValue((prev) => {
      const next = action instanceof Function ? action(prev) : action
      kept.set(key, next)
      return next
    })
  }, [key])
  return [value, set]
}

/** Forgets every kept value (a project switch). */
export function clearKeptState() {
  kept.clear()
}
