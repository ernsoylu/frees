// Phase P: a window can put its own controls on the ribbon. While a tab with a
// slot is shown, the ribbon registers that slot's element here and the window
// portals its groups into it, so every control keeps its handler, icon and
// state and only changes parent. `on` says the ribbon is mounted at all, so the
// window keeps just its canvas strip.
import { useSyncExternalStore } from 'react'

type State = { on: boolean; slots: Readonly<Record<string, HTMLElement>> }
let state: State = { on: false, slots: {} }
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  for (const l of listeners) l()
}

export function setRibbonOn(on: boolean) {
  if (state.on !== on) set({ ...state, on })
}

const refs = new Map<string, (el: HTMLElement | null) => void>()

/** A stable callback ref that registers the element as slot `name`. */
export function slotRef(name: string) {
  let ref = refs.get(name)
  if (!ref) {
    ref = (el) => {
      if ((state.slots[name] ?? null) === el) return
      const slots = { ...state.slots }
      if (el) slots[name] = el
      else delete slots[name]
      set({ ...state, slots })
    }
    refs.set(name, ref)
  }
  return ref
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useRibbonSlots(): State {
  return useSyncExternalStore(subscribe, () => state)
}
