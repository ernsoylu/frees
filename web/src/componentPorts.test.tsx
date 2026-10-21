import { renderToStaticMarkup } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { COMPONENT_CATALOG } from './componentCatalog'
import ComponentIllustration from './ComponentIllustration'
import { groupComponentPorts } from './componentPorts'
import { glyphFillPath, glyphPath, SHAPE_LABELS, SYMBOL_CONVENTIONS, symbolOf, type Shape } from './schematic/symbols'

const symbols = import.meta.glob<string>('../public/component-symbols/**/*.svg', { query: '?raw', import: 'default', eager: true })

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => vi.unstubAllGlobals())

it('uses only explicit inlet/outlet names for reference arrows', () => {
  expect(groupComponentPorts(['ref_in', 'ref_out', 'in1', 'out2', 'INLET', 'OUTLET', 'in_p', 'wall', 'shaft', 'p', 'n', 'a', 'b', 'pin', 'sp', 'pv'])).toEqual({
    inlet: ['ref_in', 'in1', 'INLET', 'in_p'],
    outlet: ['ref_out', 'out2', 'OUTLET'],
    connection: ['wall', 'shaft', 'p', 'n', 'a', 'b', 'pin', 'sp', 'pv'],
  })
  expect(groupComponentPorts([])).toEqual({ inlet: [], outlet: [], connection: [] })
})

it('provides a local Figma symbol and renders every catalog port exactly once', () => {
  for (const shape of Object.keys(SHAPE_LABELS)) {
    const svg = symbols[`../public/component-symbols/${shape}.svg`]
    expect(svg).toContain('viewBox="0 0 96 96"')
    expect(svg).toContain('<path')
  }
  for (const spec of COMPONENT_CATALOG) {
    const groups = groupComponentPorts(spec.ports)
    expect(Object.values(groups).flat().sort(), spec.type).toEqual([...spec.ports].sort())
    const markup = renderToStaticMarkup(<MantineProvider env="test" forceColorScheme="light"><ComponentIllustration spec={spec} /></MantineProvider>)
    const doc = new DOMParser().parseFromString(markup, 'text/html')
    const figure = doc.querySelector('figure')!
    expect(figure.getAttribute('aria-label')).toBe(`${spec.type} port diagram`)
    expect(figure.querySelector('img')?.getAttribute('src')).toBe(`/component-symbols/${symbolOf(spec.type).shape}.svg`)
    expect(figure.textContent).toContain(SYMBOL_CONVENTIONS[symbolOf(spec.type).shape])
    for (const port of spec.ports) {
      expect([...figure.querySelectorAll('*')].filter(node => node.childElementCount === 0 && node.textContent === port), `${spec.type}.${port}`).toHaveLength(1)
    }
  }
  // Renders every catalog component (~300); under full-suite load on CI this
  // exceeds vitest's 5 s default though it takes ~2 s alone.
}, 30_000)

it('keeps electrical, fluid and mechanical devices distinct', () => {
  const cases: Record<string, Shape> = {
    Resistor: 'resistor', HeatingResistor: 'resistor', HarnessResistance: 'resistor',
    Capacitor: 'capacitor', Supercapacitor: 'capacitor', Inductor: 'inductor', Battery2RC: 'battery',
    DCMotor: 'motor', PMSM: 'motor', HydraulicMotor: 'hydraulic-motor',
    HydraulicPump: 'hydraulic-pump', LiquidPump: 'pump', MoistAirFan: 'compressor',
    Ground: 'ground', MechGround: 'mechanical-ground', TransGround: 'mechanical-ground',
    RotationalSpring: 'spring', TransDamper: 'damper', Gear: 'gear', TransMass: 'mass',
    HydraulicDoubleActingCylinder: 'cylinder-double', PneumaticActuator: 'cylinder',
    HydraulicCheckValve: 'check-valve', HydraulicValve: 'restrictor', HydraulicTank: 'reservoir',
    LiquidTank: 'store', HeatExchanger: 'exchanger', HeaterCore: 'exchanger',
    ThermalMass: 'block', MassGen: 'block', Conduction: 'block', DCDCConverter: 'block',
    PneumaticValve52: 'block', CounterbalanceValve: 'block', Engine: 'block',
  }
  for (const [type, shape] of Object.entries(cases)) expect(symbolOf(type).shape, type).toBe(shape)
})

it('keeps closed outlines open and fills only hydraulic energy triangles and junction dots', () => {
  for (const shape of Object.keys(SHAPE_LABELS) as Shape[]) {
    expect(glyphPath(shape), shape).toBeTruthy()
    expect(SYMBOL_CONVENTIONS[shape], shape).toBeTruthy()
    if (!['hydraulic-pump', 'hydraulic-motor', 'junction'].includes(shape)) expect(glyphFillPath(shape)).toBe('')
  }
  expect(glyphFillPath('hydraulic-pump')).not.toBe(glyphFillPath('hydraulic-motor'))
  expect(glyphFillPath('hydraulic-pump')).not.toContain('A.4')
  expect(glyphPath('exchanger')).not.toBe(glyphPath('resistor'))
})

it('recognizes electronic expansion valves alongside the existing schematic families', () => {
  expect(symbolOf('EXV').shape).toBe('valve')
  expect(symbolOf('EXVCmd').shape).toBe('valve')
  expect(symbolOf('Chiller').shape).toBe('exchanger')
  expect(symbolOf('UnrecognizedComponent').shape).toBe('block')
})

// Exhaustive and CPU-bound: every symbol path, token by token, then all 312
// component illustrations. ~2 s on a workstation, ~5–8 s on a shared CI runner.
it('preserves engineering geometry in the FREES dark palette and selects it for every component', () => {
  const parser = new DOMParser()
  for (const shape of Object.keys(SHAPE_LABELS)) {
    const light = parser.parseFromString(symbols[`../public/component-symbols/${shape}.svg`], 'image/svg+xml')
    const dark = parser.parseFromString(symbols[`../public/component-symbols/dark/${shape}.svg`], 'image/svg+xml')
    expect(dark.documentElement.getAttribute('viewBox'), shape).toBe('0 0 96 96')
    const lightPaths = [...light.querySelectorAll('path')]
    const darkPaths = [...dark.querySelectorAll('path')]
    expect(darkPaths, shape).toHaveLength(lightPaths.length)
    darkPaths.forEach((path, i) => {
      const tokenize = (d: string) => d.match(/[a-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi)!
      const actual = tokenize(path.getAttribute('d')!)
      const expected = tokenize(lightPaths[i].getAttribute('d')!)
      expect(actual, shape).toHaveLength(expected.length)
      actual.forEach((token, j) => {
        // Figma exports introduce subpixel rounding when a clone moves on canvas.
        if (Number.isNaN(Number(token))) expect(token, shape).toBe(expected[j])
        else expect(Number(token), shape).toBeCloseTo(Number(expected[j]), 2)
      })
    })
    expect(dark.querySelector('rect')?.getAttribute('fill'), shape).toBe('#2E2E2E')
    for (const path of dark.querySelectorAll('path')) {
      expect(path.getAttribute('stroke') ?? path.getAttribute('fill'), shape).toBe('#12B886')
    }
  }
  for (const spec of COMPONENT_CATALOG) {
    const markup = renderToStaticMarkup(<MantineProvider env="test" forceColorScheme="dark"><ComponentIllustration spec={spec} /></MantineProvider>)
    const doc = parser.parseFromString(markup, 'text/html')
    expect(doc.querySelector('figure img')?.getAttribute('src'), spec.type).toBe(`/component-symbols/dark/${symbolOf(spec.type).shape}.svg`)
  }
}, 30_000)
