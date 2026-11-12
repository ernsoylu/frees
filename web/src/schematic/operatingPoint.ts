// Phase M4: operating-point cards. A fan, pump or valve block draws its own
// curve from its parameters, with the point the solve (or the live run, or the
// playback sample) puts it at. The curve is rebuilt only when a parameter
// changes; the point moves with the values.

import type { ComponentParamResult, VariableResult } from '../api'

export interface CurveAxis {
  label: string
  unit: string
}

export interface CurveSpec {
  title: string
  x: CurveAxis
  y: CurveAxis
  /** The curve from the parameters, or the document table the engine evaluates (`head = map$(Q)`). */
  curve: { f: (x: number) => number } | { table: string }
  /** The x the curve is drawn to, from the parameters; null takes it from the operating point. */
  xmax: number | null
  /** The instance members the operating point reads. */
  point: (value: (member: string) => number | undefined) => [number, number] | null
  /** What the curve depends on, so it is rebuilt only when this changes. */
  key: string
}

/** A parameter's value: the live or solved value of the variable it is bound to, else the value it was built with. */
function paramReader(params: readonly ComponentParamResult[], values: ReadonlyMap<string, VariableResult>) {
  return (name: string): number | undefined => {
    const p = params.find((q) => q.name === name)
    if (!p) return undefined
    const v = values.get(p.ref.trim().toLowerCase())?.value ?? p.value ?? undefined
    return v !== undefined && Number.isFinite(v) ? v : undefined
  }
}

const textParam = (params: readonly ComponentParamResult[], name: string) => params.find((p) => p.name === name)?.ref.trim()

const both = (a: number | undefined, b: number | undefined): [number, number] | null => (a !== undefined && b !== undefined ? [a, b] : null)

/**
 * The operating-point curve of a block of `type`, or null for a type with no
 * curve or a parameter the solve did not resolve. Fans: pressure rise against
 * volume flow; map pumps: head against volume flow; valves: pressure drop
 * against mass flow at the present opening.
 */
export function curveSpec(type: string, params: readonly ComponentParamResult[], values: ReadonlyMap<string, VariableResult>): CurveSpec | null {
  const num = paramReader(params, values)
  const Q = { label: 'Q', unit: 'm^3/s' }
  const dP = { label: 'ΔP', unit: 'Pa' }
  const qPoint = (y: string) => (value: (m: string) => number | undefined) => both(value('q'), value(y))
  switch (type.toLowerCase()) {
    case 'fan':
    case 'fancurve': {
      const [dP0, Q0] = [num('dp0'), num('q0')]
      if (dP0 === undefined || !Q0) return null
      return { title: 'Fan curve', x: Q, y: dP, curve: { f: (q) => dP0 * (1 - (q * Math.abs(q)) / Q0 ** 2) }, xmax: Math.abs(Q0), point: qPoint('dp'), key: `${dP0}|${Q0}` }
    }
    case 'fanmap':
    case 'pumpmap':
    case 'liquidpumpmap': {
      const table = textParam(params, 'map$')
      if (!table || !/^[a-z_][\w]*$/i.test(table)) return null
      const fan = type.toLowerCase() === 'fanmap'
      return {
        title: fan ? 'Fan curve' : 'Pump curve',
        x: Q,
        y: fan ? dP : { label: 'head', unit: 'm' },
        curve: { table },
        xmax: null,
        point: qPoint(fan ? 'dp' : 'head'),
        key: table,
      }
    }
    case 'valve': {
      const [Cv, rho] = [num('cv'), num('rho')]
      const model = (textParam(params, 'model$') ?? 'fixed').toLowerCase()
      const u = model === 'fixed' ? 1 : num('u')
      const R = model === 'eqpct' ? num('r') : 1
      if (!Cv || !rho || u === undefined || R === undefined) return null
      const eff = model === 'eqpct' ? Cv * R ** (u - 1) : Cv * u
      if (!eff) return null
      return {
        title: model === 'fixed' ? 'Valve' : `Valve at u = ${Number(u.toPrecision(4))}`,
        x: { label: 'ṁ', unit: 'kg/s' },
        y: dP,
        curve: { f: (m) => (m * Math.abs(m)) / (eff ** 2 * rho) },
        xmax: null,
        point: (value) => {
          const [m, pin, pout] = [value('in.mdot'), value('in.p'), value('out.p')]
          return m !== undefined && pin !== undefined && pout !== undefined ? [m, pin - pout] : null
        },
        key: `${eff}|${rho}`,
      }
    }
    default:
      return null
  }
}

/** The next 1-2-5 step at or above `v`, so an extent taken from a moving point changes only now and then. */
export function niceCeil(v: number): number {
  if (!(v > 0) || !Number.isFinite(v)) return 1
  const p = 10 ** Math.floor(Math.log10(v))
  return ([1, 2, 5, 10].find((m) => m * p >= v * (1 - 1e-12)) ?? 10) * p
}

/** Where the curve is drawn to: its own extent, else twice the operating point's, rounded up. */
export function curveExtent(spec: CurveSpec, at: [number, number] | null): number {
  return spec.xmax ?? niceCeil(2 * Math.abs(at?.[0] ?? 0))
}

export const CURVE_POINTS = 41

/** The x samples a curve is drawn through, 0 to `xmax`. */
export const curveXs = (xmax: number) => Array.from({ length: CURVE_POINTS }, (_, k) => (xmax * k) / (CURVE_POINTS - 1))
