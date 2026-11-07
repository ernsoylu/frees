import { describe, expect, it } from 'vitest'
import { assignRoles, INSIGHTS, insightLines, insightsFor, type InsightContext } from './insights'

const p = (name: string, value: number | null) => ({ name, ref: String(value), value })
const ctx = (blocks: InsightContext['blocks'], values: Record<string, number> = {}, phases: InsightContext['phase'] = () => undefined): InsightContext => ({
  blocks,
  value: (n) => values[n],
  phase: phases,
})

describe('insight cards (I1)', () => {
  it('offers an insight only when every role has its own block', () => {
    const rc = [{ id: 'r1', type: 'Resistor' }, { id: 'c1', type: 'Capacitor' }]
    expect(insightsFor(rc).map((i) => i.kind)).toEqual(['rc-tau'])
    expect(insightsFor([...rc, { id: 'l1', type: 'Inductor' }]).map((i) => i.kind)).toEqual(['rc-tau', 'rlc'])
    // One resistor cannot fill two roles.
    expect(assignRoles(INSIGHTS.find((i) => i.kind === 'rc-tau')!, [{ id: 'r1', type: 'Resistor' }])).toBeNull()
  })

  it('computes τ = RC, thermal τ = C/UA, ω_n and ζ from the blocks’ own parameters', () => {
    const rc = ctx([{ id: 'r1', type: 'Resistor', params: [p('R', 1000)] }, { id: 'c1', type: 'Capacitor', params: [p('C', 1e-3), p('V0', 0)] }])
    expect(insightLines('rc-tau', rc)).toEqual(['τ = R·C', '1 s', 'R = 1000 Ω, C = 0.001 F'])
    const thermal = ctx([
      { id: 'm', type: 'ThermalMass', params: [p('C', 5000), p('T0', 400)] },
      { id: 'wall', type: 'Conduction', params: [p('k', 2), p('area', 1), p('L', 0.1)] },
    ])
    expect(insightLines('thermal-tau', thermal)[1]).toBe('250 s')
    const msd = ctx([
      { id: 'm', type: 'TransMass', params: [p('m', 4), p('v0', 0)] },
      { id: 'k', type: 'TransSpring', params: [p('k', 100), p('x0', 0)] },
      { id: 'c', type: 'TransDamper', params: [p('c', 8)] },
    ])
    expect(insightLines('msd', msd).slice(1)).toEqual(['ω_n = 5 rad/s', 'ζ = 0.2'])
    const rlc = ctx([
      { id: 'r', type: 'Resistor', params: [p('R', 10)] },
      { id: 'l', type: 'Inductor', params: [p('L', 0.1), p('I0', 0)] },
      { id: 'c', type: 'Capacitor', params: [p('C', 1e-3), p('V0', 0)] },
    ])
    expect(insightLines('rlc', rlc).slice(1)).toEqual(['ω_n = 100 rad/s', 'ζ = 0.5'])
  })

  it('says which quantity is missing instead of assuming one', () => {
    const expr = ctx([{ id: 'r1', type: 'Resistor', params: [{ name: 'R', ref: 'R0*2', value: null }] }, { id: 'c1', type: 'Capacitor', params: [p('C', 1)] }])
    expect(insightLines('rc-tau', expr)).toEqual(['Electrical time constant τ = RC', 'Not available: the model gives no R'])
    expect(insightLines('rc-tau', ctx([]))[1]).toBe('Its blocks are no longer all here')
  })

  it('takes COP from solved work and heat and Carnot from the engine’s saturation temperatures', () => {
    const blocks = [
      { id: 'comp', type: 'Compressor', params: [p('eta', 1)] },
      { id: 'evap', type: 'Boiler', params: [] },
      { id: 'cond', type: 'Condenser', params: [] },
    ]
    const sat: Record<string, { phase: 'two-phase'; tBubble: number; tDew: number }> = {
      'evap.in': { phase: 'two-phase', tBubble: 250, tDew: 250 },
      'cond.in': { phase: 'two-phase', tBubble: 300, tDew: 300 },
    }
    const lines = insightLines('cop', ctx(blocks, { 'comp.w': 1000, 'evap.q': 4000 }, (s) => sat[s]))
    expect(lines[1]).toBe('COP = 4, Carnot = 5')
    expect(insightLines('cop', ctx(blocks, { 'comp.w': 1000, 'evap.q': 4000 }))[1]).toBe('Not available: the model gives no T_L')
    expect(insightLines('glide', ctx([{ id: 'evap', type: 'Boiler', params: [] }], {}, () => ({ phase: 'two-phase', tBubble: 270, tDew: 271.5 })))[1]).toBe('1.5 K')
  })

  it('reads NTU, C_r and ε off a solved heat exchanger', () => {
    const hx = ctx([{ id: 'hx', type: 'HeatExchanger', params: [p('UA', 2000)] }], { 'hx.cmin': 1000, 'hx.cmax': 4000, 'hx.eps': 0.75 })
    expect(insightLines('ntu', hx).slice(1)).toEqual(['NTU = 2, C_r = 0.25', 'ε = 0.75'])
  })
})
