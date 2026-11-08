// Phase L2: canvas inputs for a live run.
//
// A component's command (a valve's opening, a clutch's engagement, a
// setpoint) is a call argument, `Valve V1(u=0.5)`, which a live input — a
// literal assignment the engine re-pins — cannot reach. When a live run opens,
// each such argument written as a number is lifted into a literal of its own:
// `Valve V1(u=live_V1_u)` plus `live_V1_u = 0.5` at the end, the same value,
// so the run is the document's. The canvas then drives `live_V1_u` like a
// slider. The lines stay where they were, so diagnostics keep their lines.

import type { InstanceIdentityDto } from './api'
import { applyChanges, type SourceChange } from './schematic/sourceEdit'

/** How a command is driven on the canvas. */
export type CanvasInputKind = 'toggle' | 'fraction' | 'setpoint'

/** The library components whose command argument the canvas drives, by lowercase type. */
export const CANVAS_INPUTS: Readonly<Record<string, Readonly<Record<string, CanvasInputKind>>>> = {
  valve: { u: 'fraction' },
  hydraulicvalve: { u: 'fraction' },
  exv: { u: 'fraction' },
  liquidthreewayvalve: { u: 'fraction' },
  moistairdamper: { u: 'fraction' },
  pneumaticservovalve: { u: 'fraction' },
  clutch: { eng: 'toggle' },
  reversingvalve: { mode: 'toggle' },
  sigconstant: { k: 'setpoint' },
  pithermostat: { tref: 'setpoint' },
}

export interface CanvasInput {
  /** The instance, as the schematic names its block. */
  block: string
  /** The argument, lowercase (`u`). */
  param: string
  kind: CanvasInputKind
  /** The lifted literal the run is driven through (`live_V1_u`). */
  variable: string
  /** The written value, in the written unit. */
  value: number
  /** The written unit with its brackets (`[C]`), or ''. */
  unit: string
}

const NUMBER = /^\s*([-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)\s*(\[[^\]]*\])?\s*$/

/**
 * Lift the canvas inputs of `text`'s top-level instances. An argument written
 * as anything but a number (an expression, a variable) is left alone: the
 * document already drives it. `instances` must come from checking `text`.
 */
export function liftCanvasInputs(text: string, instances: readonly InstanceIdentityDto[]): { source: string; inputs: CanvasInput[] } {
  const taken = new Set((text.match(/[A-Za-z_]\w*/g) ?? []).map((w) => w.toLowerCase()))
  const changes: SourceChange[] = []
  const lines: string[] = []
  const inputs: CanvasInput[] = []
  for (const inst of instances) {
    const params = CANVAS_INPUTS[inst.type.toLowerCase()]
    if (!params || inst.definedIn || inst.localType || !inst.params) continue
    for (const p of inst.params) {
      const kind = params[p.name]
      const written = kind ? NUMBER.exec(text.slice(p.range[0], p.range[1])) : null
      if (!kind || !written) continue
      let variable = `live_${inst.name}_${p.name}`.replace(/\W/g, '_')
      for (let k = 2; taken.has(variable.toLowerCase()); k++) variable = `live_${inst.name}_${p.name}_${k}`.replace(/\W/g, '_')
      taken.add(variable.toLowerCase())
      const unit = written[2] ?? ''
      changes.push({ from: p.range[0], to: p.range[1], insert: variable })
      lines.push(`${variable} = ${written[1]}${unit ? ` ${unit}` : ''}`)
      inputs.push({ block: inst.name, param: p.name, kind, variable, value: Number(written[1]), unit })
    }
  }
  if (!inputs.length) return { source: text, inputs }
  const lifted = applyChanges(text, changes)
  return { source: `${lifted}${lifted.endsWith('\n') ? '' : '\n'}${lines.join('\n')}\n`, inputs }
}

/** The input line for `input` at `value`, in its written unit. */
export function canvasInputLine(input: CanvasInput, value: number): string {
  return `${input.variable} = ${value}${input.unit ? ` ${input.unit}` : ''}`
}

/** A setpoint's step: a tenth of its opening magnitude (1 for zero). */
export function setpointStep(opening: number): number {
  if (opening === 0 || !Number.isFinite(opening)) return 1
  return 10 ** (Math.floor(Math.log10(Math.abs(opening))) - 1)
}
