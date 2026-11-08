import { expect, it } from 'vitest'
import type { InstanceIdentityDto } from './api'
import { canvasInputLine, liftCanvasInputs, setpointStep } from './liveCanvas'

/** An instance whose `name=value` arguments are located in `text`, as Check reports them. */
function instance(text: string, type: string, name: string, extra: Partial<InstanceIdentityDto> = {}): InstanceIdentityDto {
  const at = text.indexOf(`${type} ${name}(`)
  const open = at + type.length + name.length + 2
  const close = text.indexOf(')', open)
  const params = [...text.slice(open, close).matchAll(/(\w+)\s*=\s*([^,]+)/g)].map((m) => {
    const from = open + m.index + m[0].indexOf(m[2], m[1].length)
    return { name: m[1].toLowerCase(), range: [from, from + m[2].trimEnd().length] as [number, number] }
  })
  return { name, label: name, type, line: 1, localType: false, definedIn: null, params, close: [close, close + 1], ...extra }
}

it('lifts numeric command arguments into literals and leaves the rest', () => {
  const text = 'x = 0.3\nValve V1(model$=linear, u=0.5, Cv=2)\nValve V2(u=x)\nPIThermostat TH(Tref=60 [C], band=2)\nClutch C1(eng=1)\n'
  const instances = [instance(text, 'Valve', 'V1'), instance(text, 'Valve', 'V2'), instance(text, 'PIThermostat', 'TH'), instance(text, 'Clutch', 'C1')]
  const { source, inputs } = liftCanvasInputs(text, instances)
  expect(inputs.map((i) => [i.block, i.param, i.kind, i.variable, i.value, i.unit])).toEqual([
    ['V1', 'u', 'fraction', 'live_V1_u', 0.5, ''],
    ['TH', 'tref', 'setpoint', 'live_TH_tref', 60, '[C]'],
    ['C1', 'eng', 'toggle', 'live_C1_eng', 1, ''],
  ])
  expect(source).toBe(
    'x = 0.3\nValve V1(model$=linear, u=live_V1_u, Cv=2)\nValve V2(u=x)\nPIThermostat TH(Tref=live_TH_tref, band=2)\nClutch C1(eng=live_C1_eng)\n' +
      'live_V1_u = 0.5\nlive_TH_tref = 60 [C]\nlive_C1_eng = 1\n',
  )
  // The original lines keep their numbers.
  expect(source.split('\n').slice(0, 5).length).toBe(5)
  expect(canvasInputLine(inputs[1], 65)).toBe('live_TH_tref = 65 [C]')
})

it('skips nested and local instances, avoids taken names, and is a no-op without inputs', () => {
  const text = 'live_V1_u = 2\nValve V1(u=0.5)\n'
  const lifted = liftCanvasInputs(text, [instance(text, 'Valve', 'V1')])
  expect(lifted.inputs[0].variable).toBe('live_V1_u_2')
  const nested = liftCanvasInputs(text, [instance(text, 'Valve', 'V1', { definedIn: 'Plant' })])
  expect(nested).toEqual({ source: text, inputs: [] })
  expect(liftCanvasInputs('a = 1\n', [])).toEqual({ source: 'a = 1\n', inputs: [] })
})

it('steps a setpoint by a tenth of its magnitude', () => {
  expect(setpointStep(60)).toBe(1)
  expect(setpointStep(0.5)).toBeCloseTo(0.01)
  expect(setpointStep(0)).toBe(1)
})
