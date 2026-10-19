// Shared geometry for the schematic, editor SVGs and Figma masters.
// Reference sources and simplification limits: public/component-symbols/README.md.

export const SHAPE_LABELS = {
  source: 'source boundary', sink: 'sink boundary',
  pump: 'liquid pump', compressor: 'gas pump / compressor', turbine: 'turbine',
  valve: 'two-way valve', exchanger: 'heat exchanger', store: 'tank / vessel',
  junction: 'junction', sensor: 'measurement block', control: 'control block',
  machine: 'machine block', ground: 'electrical reference', block: 'functional block',
  resistor: 'resistor', capacitor: 'capacitor', inductor: 'inductor', battery: 'battery',
  diode: 'diode', fuse: 'fuse', motor: 'electric motor',
  'voltage-source': 'voltage source', 'current-source': 'current source',
  'hydraulic-pump': 'hydraulic pump', 'hydraulic-motor': 'hydraulic motor',
  cylinder: 'single-acting cylinder', 'cylinder-double': 'double-acting cylinder',
  reservoir: 'vented reservoir', restrictor: 'flow restriction', 'check-valve': 'check valve',
  spring: 'spring', damper: 'mechanical damper', 'mechanical-ground': 'fixed support',
  gear: 'gear pair', mass: 'mass', pipe: 'pipe / duct',
} as const

export type Shape = keyof typeof SHAPE_LABELS
export interface Symbolism { shape: Shape; terminal: boolean }

// Specific devices precede family rules: a hydraulic motor is not an electric motor.
const RULES: { re: RegExp; shape: Shape }[] = [
  { re: /^(resistor|heatingresistor|harnessresistance)$/i, shape: 'resistor' },
  { re: /^(supercapacitor|capacitor)$/i, shape: 'capacitor' },
  { re: /^inductor$/i, shape: 'inductor' },
  { re: /^battery/i, shape: 'battery' },
  { re: /^diode$/i, shape: 'diode' },
  { re: /^thermalfuse$/i, shape: 'fuse' },
  { re: /^voltagesource$/i, shape: 'voltage-source' },
  { re: /^currentsource$/i, shape: 'current-source' },
  { re: /^(dcmotor|motormap|pmsm)$/i, shape: 'motor' },
  { re: /^ground$/i, shape: 'ground' },
  { re: /^(mechground|transground)$/i, shape: 'mechanical-ground' },
  { re: /^(rotationalspring|transspring)$/i, shape: 'spring' },
  { re: /^(rotationaldamper|transdamper)$/i, shape: 'damper' },
  { re: /^transmass$/i, shape: 'mass' },
  { re: /^gear$/i, shape: 'gear' },
  { re: /^(hydraulicpump|loadsensingpump)$/i, shape: 'hydraulic-pump' },
  { re: /^hydraulicmotor$/i, shape: 'hydraulic-motor' },
  { re: /^(hydrauliccylinder|pneumaticactuator)$/i, shape: 'cylinder' },
  { re: /^(hydraulic|pneumatic)doubleactingcylinder$/i, shape: 'cylinder-double' },
  { re: /^(hydraulictank|opentank)$/i, shape: 'reservoir' },
  { re: /^(hydraulic|pneumatic|liquid)checkvalve$/i, shape: 'check-valve' },
  { re: /^(hydraulic|pneumatic|liquid)orifice$|^hydraulic(resistance|flowcontrol|valve(cmd)?)$|^pneumaticservovalve(cmd)?$|^servovalvedynamic$|^twophaseflowres$|^capillarytube$/i, shape: 'restrictor' },
  { re: /^(sig|supervisoryecms|pithermostat|mpptblock|zoneco2)/i, shape: 'control' },
  { re: /(sensor|probe|gauge|meter)$/i, shape: 'sensor' },
  { re: /source(ph)?$|supply$|^(drivecyclesource|gradeprofile)$/i, shape: 'source' },
  { re: /sink$|^pneumaticatmosphere$/i, shape: 'sink' },
  { re: /^(twophase)?compressor(map)?$|^(moistair)?fan(curve|map)?$/i, shape: 'compressor' },
  { re: /^(liquid)?pump(map)?$/i, shape: 'pump' },
  { re: /^(hydro)?turbine$/i, shape: 'turbine' },
  { re: /^(valve|expansionvalve|twophaseexpansionvalve|throttle|exv(cmd)?|txv(superheat)?|transcriticalbackpressurevalve|liquidthermostat)$/i, shape: 'valve' },
  { re: /hx$|heatexchanger|evaporator|condenser|radiator|^aircoil$|^chiller$|^heatercore$|^liquidcoldplate$|^gascooler$|^regenerator$|^(cooling|heating|apparatusdewpoint)coil$|^totalenergyexchanger$/i, shape: 'exchanger' },
  { re: /^(liquid(tank|expansiontank)|thermalstoragetank|flashtank|boilingvessel|twophasereceiver|suctionaccumulator)$/i, shape: 'store' },
  { re: /^(liquid|twophase|blend|gas)?mixer(n)?$|^splitter$|^mixingbox$/i, shape: 'junction' },
  { re: /^(liquid|hydraulic|gas|twophase)?pipe$|^(moistair)?duct$/i, shape: 'pipe' },
]

export function symbolOf(type: string | undefined): Symbolism {
  const shape = RULES.find(({ re }) => re.test(type ?? ''))?.shape ?? 'block'
  return { shape, terminal: ['source', 'sink', 'ground', 'mechanical-ground', 'voltage-source', 'current-source'].includes(shape) }
}

const CIRCLE = 'M.9 .5 A.4 .4 0 1 1 .1 .5 A.4 .4 0 1 1 .9 .5 Z'
const LEADS = 'M0 .5 H.1 M.9 .5 H1'
const BOX = 'M.15 .2 H.85 V.8 H.15 Z'

/** Outline geometry in a unit square. Closed outlines must remain unfilled. */
const PATHS: Record<Shape, string> = {
  source: BOX + ' M.35 .35 L.6 .5 L.35 .65 M.6 .5 H1',
  sink: BOX + ' M0 .5 H.6 M.4 .35 L.6 .5 L.4 .65',
  pump: CIRCLE + ' ' + LEADS + ' M.25 .22 L.9 .5 L.25 .78 Z',
  compressor: CIRCLE + ' ' + LEADS + ' M.26 .18 L.86 .34 M.26 .82 L.86 .66',
  turbine: 'M0 .5 H.15 M.85 .5 H1 M.15 .3 L.85 .1 V.9 L.15 .7 Z',
  valve: 'M0 .5 H.15 M.85 .5 H1 M.15 .25 V.75 L.85 .25 V.75 Z',
  exchanger: CIRCLE + ' ' + LEADS + ' M.1 .5 H.3 L.5 .3 V.7 L.7 .5 H.9',
  store: 'M.25 .15 H.75 V.85 H.25 Z',
  junction: 'M0 .5 H1 M.5 .5 V1',
  sensor: BOX, control: BOX, machine: BOX, block: BOX,
  ground: 'M.5 .05 V.45 M.15 .45 H.85 M.28 .62 H.72 M.4 .79 H.6',
  resistor: 'M0 .5 H.2 M.2 .35 H.8 V.65 H.2 Z M.8 .5 H1',
  capacitor: 'M0 .5 H.42 M.42 .2 V.8 M.58 .2 V.8 M.58 .5 H1',
  inductor: 'M0 .5 H.18 A.08 .12 0 0 1 .34 .5 A.08 .12 0 0 1 .5 .5 A.08 .12 0 0 1 .66 .5 A.08 .12 0 0 1 .82 .5 H1',
  battery: 'M0 .5 H.42 M.42 .32 V.68 M.58 .12 V.88 M.58 .5 H1',
  diode: 'M0 .5 H.3 M.3 .25 V.75 L.7 .5 Z M.7 .25 V.75 M.7 .5 H1',
  fuse: 'M0 .5 H1 M.25 .35 H.75 V.65 H.25 Z',
  motor: CIRCLE + ' ' + LEADS + ' M.32 .68 V.32 L.5 .53 L.68 .32 V.68',
  'voltage-source': CIRCLE + ' ' + LEADS + ' M.28 .5 H.44 M.36 .42 V.58 M.6 .5 H.76',
  'current-source': CIRCLE + ' ' + LEADS + ' M.28 .5 H.72 M.57 .35 L.72 .5 L.57 .65',
  'hydraulic-pump': CIRCLE + ' ' + LEADS + ' M.62 .36 L.88 .5 L.62 .64 Z',
  'hydraulic-motor': CIRCLE + ' ' + LEADS + ' M.12 .36 L.38 .5 L.12 .64 Z',
  cylinder: 'M.1 .2 H.75 V.8 H.1 Z M.4 .2 V.8 M.4 .5 H1 M.2 .8 V1',
  'cylinder-double': 'M.1 .2 H.75 V.8 H.1 Z M.4 .2 V.8 M.4 .5 H1 M.2 .8 V1 M.65 .8 V1',
  reservoir: 'M.5 .05 V.65 M.15 .35 V.8 H.85 V.35',
  restrictor: 'M0 .5 H1 M.3 .25 Q.55 .5 .3 .75 M.7 .25 Q.45 .5 .7 .75',
  'check-valve': 'M0 .5 H.3 M.3 .3 L.5 .5 L.3 .7 M.7 .5 A.1 .1 0 1 1 .5 .5 A.1 .1 0 1 1 .7 .5 Z M.7 .5 H1',
  spring: 'M0 .5 H.15 L.22 .3 L.36 .7 L.5 .3 L.64 .7 L.78 .3 L.85 .5 H1',
  damper: 'M0 .5 H.25 M.75 .25 H.25 V.75 H.75 M.55 .3 V.7 M.55 .5 H1',
  'mechanical-ground': 'M.5 .05 V.5 M.1 .5 H.9 M.25 .5 L.1 .7 M.45 .5 L.3 .7 M.65 .5 L.5 .7 M.85 .5 L.7 .7',
  gear: CIRCLE + ' ' + LEADS + ' M.22 .78 L.78 .22',
  mass: 'M0 .5 H.25 M.25 .25 H.75 V.75 H.25 Z M.75 .5 H1',
  pipe: 'M0 .5 H1',
}

export function glyphPath(shape: Shape): string { return PATHS[shape] }

/** Only the energy triangle / junction dot is filled, never the surrounding circle. */
export function glyphFillPath(shape: Shape): string {
  if (shape === 'hydraulic-pump') return 'M.62 .36 L.88 .5 L.62 .64 Z'
  if (shape === 'hydraulic-motor') return 'M.12 .36 L.38 .5 L.12 .64 Z'
  if (shape === 'junction') return 'M.56 .5 A.06 .06 0 1 1 .44 .5 A.06 .06 0 1 1 .56 .5 Z'
  return ''
}

// Drawing conventions, not certification of a complete circuit.
export const SYMBOL_CONVENTIONS: Record<Shape, string> = {
  source: 'Model boundary', sink: 'Model boundary',
  pump: 'ISO 14617', compressor: 'ISO 14617', turbine: 'Process convention',
  valve: 'ISO 14617', exchanger: 'ISO 10628-2', store: 'ISO 10628-2',
  junction: 'Connection', sensor: 'Functional block', control: 'Functional block',
  machine: 'Functional block', block: 'Functional block',
  ground: 'IEC 60617', resistor: 'IEC 60617', capacitor: 'IEC 60617',
  inductor: 'IEC 60617', battery: 'IEC 60617', diode: 'IEC 60617',
  fuse: 'IEC 60617', motor: 'IEC 60617',
  'voltage-source': 'Circuit convention', 'current-source': 'Circuit convention',
  'hydraulic-pump': 'ISO 1219-1', 'hydraulic-motor': 'ISO 1219-1',
  cylinder: 'ISO 1219-1', 'cylinder-double': 'ISO 1219-1',
  reservoir: 'ISO 1219-1', restrictor: 'ISO 1219-1', 'check-valve': 'ISO 1219-1',
  spring: 'ISO 14617', gear: 'ISO 14617', mass: 'ISO 14617',
  damper: 'Mechanical convention', 'mechanical-ground': 'Mechanical convention', pipe: 'Connection',
}
