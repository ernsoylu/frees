import type { ComponentResult, StreamPhase } from '../api'
import { formatCompact } from './readouts'

/**
 * Phase I1: insight cards. Each insight names the component types it needs
 * among a set of blocks and computes a teaching quantity — a time constant,
 * a natural frequency, a COP — from that model's own parameters and solved
 * values. Nothing is assumed: a missing parameter or value gives no number,
 * and the card says what it lacks.
 */
export interface InsightContext {
  /** The member blocks, with the parameters they were built with. */
  blocks: readonly { id: string; type: string; params: ComponentResult['params'] }[]
  /** A solved (or playback) value by lowercase name (`comp.w`). */
  value: (name: string) => number | undefined
  /** The engine's phase of a stream (`evap.in`). */
  phase: (stream: string) => StreamPhase | undefined
}

export interface Insight {
  kind: string
  label: string
  /** Per role, the component types that fill it; the insight applies when every role is filled. */
  roles: Record<string, readonly string[]>
  /** The card's lines, or the reason it has no number. */
  compute: (b: Record<string, { id: string; params: ComponentResult['params'] }>, ctx: InsightContext) => { lines: string[] } | { missing: string }
}

const num = (x: number, units: string) => `${formatCompact(x)}${units ? ` ${units}` : ''}`

/** A parameter's resolved value; undefined when it is an expression or a string. */
function param(b: { params: ComponentResult['params'] }, name: string): number | undefined {
  const p = b.params.find((q) => q.name.toLowerCase() === name.toLowerCase())
  return typeof p?.value === 'number' && Number.isFinite(p.value) ? p.value : undefined
}

/** The values a formula needs, or the name of the first one the model lacks. */
function need<K extends string>(got: Record<K, number | undefined>): Record<K, number> | { missing: string } {
  for (const [k, v] of Object.entries(got) as [K, number | undefined][]) if (v === undefined) return { missing: k }
  return got as Record<K, number>
}

const EVAPORATORS = ['Boiler', 'TwoPhaseEvaporator', 'TwoPhaseEvaporatorUA', 'MovingBoundaryEvaporator']
const TWO_PHASE_HX = [...EVAPORATORS, 'Condenser']

export const INSIGHTS: readonly Insight[] = [
  {
    kind: 'rc-tau',
    label: 'Electrical time constant τ = RC',
    roles: { R: ['Resistor'], C: ['Capacitor', 'Supercapacitor'] },
    compute: (b) => {
      const v = need({ R: param(b.R, 'R'), C: param(b.C, 'C') })
      if ('missing' in v) return v
      return { lines: ['τ = R·C', num(v.R * v.C, 's'), `R = ${num(v.R, 'Ω')}, C = ${num(v.C, 'F')}`] }
    },
  },
  {
    kind: 'thermal-tau',
    label: 'Thermal time constant τ = C/UA',
    roles: { mass: ['ThermalMass', 'MassGen'], path: ['Conduction', 'Convection', 'ContactResistance'] },
    compute: (b) => {
      const p = b.path
      const ua = param(p, 'k') !== undefined ? (param(p, 'k')! * (param(p, 'area') ?? Number.NaN)) / (param(p, 'L') ?? Number.NaN)
        : param(p, 'htc') !== undefined ? param(p, 'htc')! * (param(p, 'area') ?? Number.NaN)
        : param(p, 'Rth') !== undefined ? 1 / param(p, 'Rth')!
        : undefined
      const v = need({ C: param(b.mass, 'C'), UA: ua !== undefined && Number.isFinite(ua) ? ua : undefined })
      if ('missing' in v) return v
      return { lines: ['τ = C / UA', num(v.C / v.UA, 's'), `C = ${num(v.C, 'J/K')}, UA = ${num(v.UA, 'W/K')}`] }
    },
  },
  {
    kind: 'msd',
    label: 'Mass–spring–damper ω_n and ζ',
    roles: { m: ['TransMass', 'Inertia'], k: ['TransSpring', 'RotationalSpring'], c: ['TransDamper', 'RotationalDamper'] },
    compute: (b) => {
      const v = need({ m: param(b.m, 'm') ?? param(b.m, 'J'), k: param(b.k, 'k'), c: param(b.c, 'c') })
      if ('missing' in v) return v
      const wn = Math.sqrt(v.k / v.m)
      return { lines: ['ω_n = √(k/m), ζ = c / (2√(k·m))', `ω_n = ${num(wn, 'rad/s')}`, `ζ = ${num(v.c / (2 * Math.sqrt(v.k * v.m)), '')}`] }
    },
  },
  {
    kind: 'rlc',
    label: 'Series RLC ω_n and ζ',
    roles: { R: ['Resistor'], L: ['Inductor'], C: ['Capacitor'] },
    compute: (b) => {
      const v = need({ R: param(b.R, 'R'), L: param(b.L, 'L'), C: param(b.C, 'C') })
      if ('missing' in v) return v
      return { lines: ['ω_n = 1/√(LC), ζ = (R/2)·√(C/L)', `ω_n = ${num(1 / Math.sqrt(v.L * v.C), 'rad/s')}`, `ζ = ${num((v.R / 2) * Math.sqrt(v.C / v.L), '')}`] }
    },
  },
  {
    kind: 'cop',
    label: 'Refrigeration COP, actual and Carnot',
    roles: { comp: ['Compressor'], evap: EVAPORATORS, cond: ['Condenser'] },
    compute: (b, ctx) => {
      const [evap, cond] = [ctx.phase(`${b.evap.id}.in`), ctx.phase(`${b.cond.id}.in`)]
      const v = need({
        W: ctx.value(`${b.comp.id}.w`),
        Q_L: ctx.value(`${b.evap.id}.q`),
        T_L: evap?.tDew,
        T_H: cond?.tBubble,
      })
      if ('missing' in v) return v
      return {
        lines: [
          'COP = Q_L / W; Carnot = T_L / (T_H − T_L)',
          `COP = ${num(v.Q_L / v.W, '')}, Carnot = ${num(v.T_L / (v.T_H - v.T_L), '')}`,
          `between ${num(v.T_L, 'K')} and ${num(v.T_H, 'K')} saturation`,
        ],
      }
    },
  },
  {
    kind: 'ntu',
    label: 'Heat-exchanger NTU and ε',
    roles: { hx: ['HeatExchanger', 'TwoZoneHX', 'ThreeZoneHX'] },
    compute: (b, ctx) => {
      const id = b.hx.id
      const v = need({ UA: param(b.hx, 'UA'), Cmin: ctx.value(`${id}.cmin`), Cmax: ctx.value(`${id}.cmax`), eps: ctx.value(`${id}.eps`) })
      if ('missing' in v) return v
      return { lines: ['NTU = UA / C_min, C_r = C_min / C_max', `NTU = ${num(v.UA / v.Cmin, '')}, C_r = ${num(v.Cmin / v.Cmax, '')}`, `ε = ${num(v.eps, '')}`] }
    },
  },
  {
    kind: 'glide',
    label: 'Temperature glide at the inlet pressure',
    roles: { hx: TWO_PHASE_HX },
    compute: (b, ctx) => {
      const ph = ctx.phase(`${b.hx.id}.in`)
      const v = need({ T_bubble: ph?.tBubble, T_dew: ph?.tDew })
      if ('missing' in v) return v
      return { lines: ['glide = T_dew − T_bubble', num(v.T_dew - v.T_bubble, 'K'), `bubble ${num(v.T_bubble, 'K')}, dew ${num(v.T_dew, 'K')}`] }
    },
  },
]

export const INSIGHT_KINDS: readonly string[] = INSIGHTS.map((i) => i.kind)

/**
 * Each role filled by a distinct member block of a matching type, in member
 * order; null when some role cannot be filled.
 */
export function assignRoles(insight: Insight, blocks: readonly { id: string; type: string }[]): Record<string, string> | null {
  const used = new Set<string>()
  const out: Record<string, string> = {}
  for (const [role, types] of Object.entries(insight.roles)) {
    const b = blocks.find((x) => !used.has(x.id) && types.some((t) => t.toLowerCase() === x.type.toLowerCase()))
    if (!b) return null
    used.add(b.id)
    out[role] = b.id
  }
  return out
}

/** The insights a selection of blocks can carry. */
export const insightsFor = (blocks: readonly { id: string; type: string }[]) => INSIGHTS.filter((i) => assignRoles(i, blocks) !== null)

/** An insight card's lines from the model's own values, or why it has none. */
export function insightLines(kind: string, ctx: InsightContext): string[] {
  const insight = INSIGHTS.find((i) => i.kind === kind)
  if (!insight) return [`Unknown insight: ${kind}`]
  const roles = assignRoles(insight, ctx.blocks)
  if (!roles) return [insight.label, 'Its blocks are no longer all here']
  const byRole = Object.fromEntries(Object.entries(roles).map(([r, id]) => [r, ctx.blocks.find((b) => b.id === id)!]))
  const out = insight.compute(byRole, ctx)
  return 'missing' in out ? [insight.label, `Not available: the model gives no ${out.missing}`] : out.lines
}
