// Phase R: what an analysis tool's frame reads (`ToolFrame.tsx`).
import { createContext } from 'react'

/** Where the tool is shown, and how to move it. Absent (a test, an embed), it is a plain dialog. */
export interface ToolHost {
  docked: boolean
  toggle: () => void
}
export const ToolHostContext = createContext<ToolHost | null>(null)

export const TOOL_STEPS = ['Target', 'Inputs', 'Method', 'Advanced', 'Run', 'Results', 'Apply / Export'] as const
export type ToolStep = (typeof TOOL_STEPS)[number]
