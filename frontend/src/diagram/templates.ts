import { DiagramElement } from './types'

export interface DiagramTemplate {
  name: string
  description: string
  elements: DiagramElement[]
}

export function instantiateTemplate(elements: DiagramElement[]): DiagramElement[] {
  const idMap = new Map<string, string>()
  elements.forEach((el) => {
    idMap.set(el.id, crypto.randomUUID())
  })
  return elements.map((el) => {
    const copy = structuredClone(el) as any
    copy.id = idMap.get(el.id)!
    if (copy.groupId) {
      copy.groupId = idMap.get(copy.groupId) || copy.groupId
    }
    if (copy.kind === 'connector') {
      copy.fromId = idMap.get(copy.fromId) ?? copy.fromId
      copy.toId = idMap.get(copy.toId) ?? copy.toId
    }
    return copy
  })
}

const DEFAULT_STYLE = { stroke: '#c1c2c5', strokeWidth: 2, fill: 'transparent', opacity: 1 }

export const TEMPLATES: DiagramTemplate[] = [
  {
    name: 'Vapor-Compression Refrigeration',
    description: 'Compressor, condenser, expansion valve, and evaporator with COP gauge and pressure/temperature indicators.',
    elements: [
      // 1. Compressor
      { id: 'ref-comp', kind: 'icon', icon: 'compressor', x: 420, y: 160, w: 80, h: 80, rotation: 0, ...DEFAULT_STYLE },
      // 2. Condenser
      { id: 'ref-cond', kind: 'icon', icon: 'condenser', x: 240, y: 60, w: 100, h: 60, rotation: 0, ...DEFAULT_STYLE },
      // 3. Expansion Valve
      { id: 'ref-valve', kind: 'icon', icon: 'valve', x: 100, y: 160, w: 80, h: 80, rotation: 0, ...DEFAULT_STYLE },
      // 4. Evaporator
      { id: 'ref-evap', kind: 'icon', icon: 'evaporator', x: 240, y: 320, w: 100, h: 60, rotation: 0, ...DEFAULT_STYLE },

      // Connectors
      {
        id: 'ref-conn1',
        kind: 'connector',
        fromId: 'ref-evap',
        fromAnchor: 'right',
        toId: 'ref-comp',
        toAnchor: 'bottom',
        style: 'orthogonal',
        arrow: 'to',
        rotation: 0,
        ...DEFAULT_STYLE,
      },
      {
        id: 'ref-conn2',
        kind: 'connector',
        fromId: 'ref-comp',
        fromAnchor: 'top',
        toId: 'ref-cond',
        toAnchor: 'right',
        style: 'orthogonal',
        arrow: 'to',
        rotation: 0,
        ...DEFAULT_STYLE,
      },
      {
        id: 'ref-conn3',
        kind: 'connector',
        fromId: 'ref-cond',
        fromAnchor: 'left',
        toId: 'ref-valve',
        toAnchor: 'top',
        style: 'orthogonal',
        arrow: 'to',
        rotation: 0,
        ...DEFAULT_STYLE,
      },
      {
        id: 'ref-conn4',
        kind: 'connector',
        fromId: 'ref-valve',
        fromAnchor: 'bottom',
        toId: 'ref-evap',
        toAnchor: 'left',
        style: 'orthogonal',
        arrow: 'to',
        rotation: 0,
        ...DEFAULT_STYLE,
      },

      // Labels & Indicators
      {
        id: 'ref-lbl-title',
        kind: 'label',
        x: 180,
        y: 10,
        text: 'Vapor-Compression Refrigeration Cycle',
        fontSize: 14,
        bold: true,
        rotation: 0,
        stroke: '#4dabf7',
        strokeWidth: 0,
        fill: 'transparent',
        opacity: 1,
      },
      {
        id: 'ref-lbl-s1',
        kind: 'label',
        x: 430,
        y: 280,
        text: 'State 1: Sat. Vapor\nT1 = {T1:.1f:°C}\nP1 = {P1:.2f:bar}',
        fontSize: 10,
        bold: false,
        rotation: 0,
        ...DEFAULT_STYLE,
        strokeWidth: 0,
      },
      {
        id: 'ref-lbl-s2',
        kind: 'label',
        x: 430,
        y: 80,
        text: 'State 2: Superheated\nT2 = {T2:.1f:°C}\nP2 = {P2:.2f:bar}',
        fontSize: 10,
        bold: false,
        rotation: 0,
        ...DEFAULT_STYLE,
        strokeWidth: 0,
      },
      {
        id: 'ref-lbl-s3',
        kind: 'label',
        x: 60,
        y: 80,
        text: 'State 3: Sat. Liquid\nT3 = {T3:.1f:°C}\nP3 = {P3:.2f:bar}',
        fontSize: 10,
        bold: false,
        rotation: 0,
        ...DEFAULT_STYLE,
        strokeWidth: 0,
      },
      {
        id: 'ref-lbl-s4',
        kind: 'label',
        x: 60,
        y: 280,
        text: 'State 4: Two-Phase Mix\nT4 = {T4:.1f:°C}\nx4 = {x4:.2f}',
        fontSize: 10,
        bold: false,
        rotation: 0,
        ...DEFAULT_STYLE,
        strokeWidth: 0,
      },

      // Widgets
      {
        id: 'ref-gauge-cop',
        kind: 'widget',
        widgetType: 'dial',
        x: 230,
        y: 160,
        w: 120,
        h: 120,
        varName: 'COP',
        minFormula: '1',
        maxFormula: '7',
        label: 'COP',
        rotation: 0,
        ...DEFAULT_STYLE,
      },

      // Controls
      {
        id: 'ref-ctrl-tevap',
        kind: 'ctl-slider',
        x: 30,
        y: 380,
        w: 160,
        h: 50,
        varName: 'T_evap',
        label: 'Evap Temp (°C)',
        min: -20,
        max: 10,
        step: 1,
        value: -5,
        rotation: 0,
        ...DEFAULT_STYLE,
      },
      {
        id: 'ref-ctrl-tcond',
        kind: 'ctl-slider',
        x: 410,
        y: 380,
        w: 160,
        h: 50,
        varName: 'T_cond',
        label: 'Cond Temp (°C)',
        min: 20,
        max: 60,
        step: 1,
        value: 40,
        rotation: 0,
        ...DEFAULT_STYLE,
      },
      {
        id: 'ref-btn-solve',
        kind: 'ctl-button',
        x: 230,
        y: 390,
        w: 110,
        h: 36,
        label: 'Solve Cycle',
        action: 'solve',
        rotation: 0,
        ...DEFAULT_STYLE,
      },
    ],
  },
  {
    name: 'Rankine Steam Power Cycle',
    description: 'Turbine, condenser, feed pump, and steam boiler loop with thermal efficiency gauge and slider controls.',
    elements: [
      // Icons
      { id: 'ran-boiler', kind: 'icon', icon: 'boiler', x: 120, y: 140, w: 80, h: 80, rotation: 0, ...DEFAULT_STYLE },
      { id: 'ran-turbine', kind: 'icon', icon: 'turbine', x: 340, y: 60, w: 90, h: 80, rotation: 0, ...DEFAULT_STYLE },
      { id: 'ran-cond', kind: 'icon', icon: 'condenser', x: 345, y: 240, w: 80, h: 70, rotation: 0, ...DEFAULT_STYLE },
      { id: 'ran-pump', kind: 'icon', icon: 'pump', x: 130, y: 240, w: 70, h: 70, rotation: 0, ...DEFAULT_STYLE },

      // Connectors
      { id: 'ran-conn1', kind: 'connector', fromId: 'ran-boiler', fromAnchor: 'top', toId: 'ran-turbine', toAnchor: 'left', style: 'orthogonal', arrow: 'to', rotation: 0, ...DEFAULT_STYLE },
      { id: 'ran-conn2', kind: 'connector', fromId: 'ran-turbine', fromAnchor: 'right', toId: 'ran-cond', toAnchor: 'top', style: 'orthogonal', arrow: 'to', rotation: 0, ...DEFAULT_STYLE },
      { id: 'ran-conn3', kind: 'connector', fromId: 'ran-cond', fromAnchor: 'bottom', toId: 'ran-pump', toAnchor: 'right', style: 'orthogonal', arrow: 'to', rotation: 0, ...DEFAULT_STYLE },
      { id: 'ran-conn4', kind: 'connector', fromId: 'ran-pump', fromAnchor: 'left', toId: 'ran-boiler', toAnchor: 'bottom', style: 'orthogonal', arrow: 'to', rotation: 0, ...DEFAULT_STYLE },

      // Title
      {
        id: 'ran-lbl-title',
        kind: 'label',
        x: 180,
        y: 10,
        text: 'Rankine Steam Power Cycle',
        fontSize: 14,
        bold: true,
        rotation: 0,
        stroke: '#ff922b',
        strokeWidth: 0,
        fill: 'transparent',
        opacity: 1,
      },

      // States Labels
      { id: 'ran-lbl-s1', kind: 'label', x: 360, y: 150, text: 'State 1: Turbine Inlet\nT1 = {T[1]:.1f:°C}\nh1 = {h[1]:.1f:kJ/kg}', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'ran-lbl-s2', kind: 'label', x: 360, y: 320, text: 'State 2: Condenser Inlet\nT2 = {T[2]:.1f:°C}\nx2 = {x2:.3f}', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'ran-lbl-s3', kind: 'label', x: 40, y: 320, text: 'State 3: Pump Inlet\nT3 = {T[3]:.1f:°C}\nh3 = {h[3]:.1f:kJ/kg}', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'ran-lbl-s4', kind: 'label', x: 40, y: 150, text: 'State 4: Boiler Inlet\nT4 = {T[4]:.1f:°C}\nh4 = {h[4]:.1f:kJ/kg}', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },

      // Widget
      { id: 'ran-gauge-eff', kind: 'widget', widgetType: 'dial', x: 220, y: 140, w: 100, h: 100, varName: 'eta_th', minFormula: '0', maxFormula: '50', label: 'Efficiency (%)', rotation: 0, ...DEFAULT_STYLE },

      // Controls
      { id: 'ran-ctrl-phigh', kind: 'ctl-slider', x: 20, y: 380, w: 170, h: 50, varName: 'P_high', label: 'Boiler Pressure (kPa)', min: 1000, max: 15000, step: 100, value: 8000, rotation: 0, ...DEFAULT_STYLE },
      { id: 'ran-ctrl-tboiler', kind: 'ctl-slider', x: 400, y: 380, w: 170, h: 50, varName: 'T_boiler', label: 'Superheat Temp (°C)', min: 300, max: 600, step: 10, value: 500, rotation: 0, ...DEFAULT_STYLE },
      { id: 'ran-btn-solve', kind: 'ctl-button', x: 225, y: 390, w: 110, h: 36, label: 'Solve Cycle', action: 'solve', rotation: 0, ...DEFAULT_STYLE },
    ],
  },
  {
    name: 'Brayton Gas Turbine Cycle',
    description: 'Compressor, combustor, turbine, and cooler loop with net power gauge and pressure ratio controls.',
    elements: [
      // Icons
      { id: 'bra-comp', kind: 'icon', icon: 'compressor', x: 130, y: 140, w: 80, h: 80, rotation: 0, ...DEFAULT_STYLE },
      { id: 'bra-heat', kind: 'icon', icon: 'heatx', x: 280, y: 50, w: 80, h: 60, rotation: 0, ...DEFAULT_STYLE },
      { id: 'bra-turb', kind: 'icon', icon: 'turbine', x: 410, y: 140, w: 80, h: 80, rotation: 0, ...DEFAULT_STYLE },
      { id: 'bra-cool', kind: 'icon', icon: 'heatx', x: 280, y: 260, w: 80, h: 60, rotation: 0, ...DEFAULT_STYLE },

      // Connectors
      { id: 'bra-conn1', kind: 'connector', fromId: 'bra-comp', fromAnchor: 'top', toId: 'bra-heat', toAnchor: 'left', style: 'orthogonal', arrow: 'to', rotation: 0, ...DEFAULT_STYLE },
      { id: 'bra-conn2', kind: 'connector', fromId: 'bra-heat', fromAnchor: 'right', toId: 'bra-turb', toAnchor: 'top', style: 'orthogonal', arrow: 'to', rotation: 0, ...DEFAULT_STYLE },
      { id: 'bra-conn3', kind: 'connector', fromId: 'bra-turb', fromAnchor: 'bottom', toId: 'bra-cool', toAnchor: 'right', style: 'orthogonal', arrow: 'to', rotation: 0, ...DEFAULT_STYLE },
      { id: 'bra-conn4', kind: 'connector', fromId: 'bra-cool', fromAnchor: 'left', toId: 'bra-comp', toAnchor: 'bottom', style: 'orthogonal', arrow: 'to', rotation: 0, ...DEFAULT_STYLE },

      // Title
      {
        id: 'bra-lbl-title',
        kind: 'label',
        x: 180,
        y: 10,
        text: 'Brayton Gas Turbine Cycle',
        fontSize: 14,
        bold: true,
        rotation: 0,
        stroke: '#ffd43b',
        strokeWidth: 0,
        fill: 'transparent',
        opacity: 1,
      },

      // States Labels
      { id: 'bra-lbl-s1', kind: 'label', x: 30, y: 230, text: 'State 1: Inlet\nT1 = {T1:.1f:K}\nP1 = {P1:.2f:bar}', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'bra-lbl-s2', kind: 'label', x: 30, y: 80, text: 'State 2: Comp Exit\nT2 = {T2:.1f:K}\nP2 = {P2:.2f:bar}', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'bra-lbl-s3', kind: 'label', x: 440, y: 80, text: 'State 3: Turb Inlet\nT3 = {T3:.1f:K}\nP3 = {P3:.2f:bar}', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'bra-lbl-s4', kind: 'label', x: 440, y: 230, text: 'State 4: Turb Exit\nT4 = {T4:.1f:K}\nP4 = {P4:.2f:bar}', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },

      // Widget
      { id: 'bra-gauge-eff', kind: 'widget', widgetType: 'dial', x: 230, y: 130, w: 120, h: 120, varName: 'eta_th', minFormula: '0', maxFormula: '60', label: 'Efficiency (%)', rotation: 0, ...DEFAULT_STYLE },

      // Controls
      { id: 'bra-ctrl-rp', kind: 'ctl-slider', x: 20, y: 380, w: 160, h: 50, varName: 'r_p', label: 'Pressure Ratio', min: 2, max: 20, step: 0.5, value: 8, rotation: 0, ...DEFAULT_STYLE },
      { id: 'bra-ctrl-t3', kind: 'ctl-slider', x: 410, y: 380, w: 160, h: 50, varName: 'T3', label: 'Turbine Inlet Temp (K)', min: 1000, max: 1800, step: 20, value: 1400, rotation: 0, ...DEFAULT_STYLE },
      { id: 'bra-btn-solve', kind: 'ctl-button', x: 235, y: 390, w: 110, h: 36, label: 'Solve Cycle', action: 'solve', rotation: 0, ...DEFAULT_STYLE },
    ],
  },
  {
    name: 'Simple Piping Network',
    description: 'Source reservoir, pump, distribution tee, and two receiving vessels with flow-rate animation.',
    elements: [
      // Icons
      { id: 'pip-res', kind: 'icon', icon: 'vessel', x: 40, y: 100, w: 70, h: 90, rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-pump', kind: 'icon', icon: 'pump', x: 190, y: 210, w: 70, h: 70, rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-tee', kind: 'icon', icon: 'tee', x: 330, y: 225, w: 40, h: 40, rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-v1', kind: 'icon', icon: 'vessel', x: 480, y: 100, w: 70, h: 90, rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-v2', kind: 'icon', icon: 'vessel', x: 480, y: 300, w: 70, h: 90, rotation: 0, ...DEFAULT_STYLE },

      // Connectors with flow animations
      { id: 'pip-conn1', kind: 'connector', fromId: 'pip-res', fromAnchor: 'bottom', toId: 'pip-pump', toAnchor: 'left', style: 'orthogonal', arrow: 'to', flow: { speed: 'V_dot_total' }, rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-conn2', kind: 'connector', fromId: 'pip-pump', fromAnchor: 'right', toId: 'pip-tee', toAnchor: 'left', style: 'straight', arrow: 'to', flow: { speed: 'V_dot_total' }, rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-conn3', kind: 'connector', fromId: 'pip-tee', fromAnchor: 'top', toId: 'pip-v1', toAnchor: 'bottom', style: 'orthogonal', arrow: 'to', flow: { speed: 'V_dot_1' }, rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-conn4', kind: 'connector', fromId: 'pip-tee', fromAnchor: 'bottom', toId: 'pip-v2', toAnchor: 'top', style: 'orthogonal', arrow: 'to', flow: { speed: 'V_dot_2' }, rotation: 0, ...DEFAULT_STYLE },

      // Title
      {
        id: 'pip-lbl-title',
        kind: 'label',
        x: 180,
        y: 10,
        text: 'Piping & Fluid Distribution Network',
        fontSize: 14,
        bold: true,
        rotation: 0,
        stroke: '#20c997',
        strokeWidth: 0,
        fill: 'transparent',
        opacity: 1,
      },

      // Fill Widgets
      { id: 'pip-level-res', kind: 'widget', widgetType: 'tank', x: 40, y: 100, w: 70, h: 90, varName: 'level_res', minFormula: '0', maxFormula: '100', label: 'Res. Level', rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-level-v1', kind: 'widget', widgetType: 'tank', x: 480, y: 100, w: 70, h: 90, varName: 'level_v1', minFormula: '0', maxFormula: '100', label: 'Tank 1 Level', rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-level-v2', kind: 'widget', widgetType: 'tank', x: 480, y: 300, w: 70, h: 90, varName: 'level_v2', minFormula: '0', maxFormula: '100', label: 'Tank 2 Level', rotation: 0, ...DEFAULT_STYLE },

      // Flow labels
      { id: 'pip-lbl-tot', kind: 'label', x: 180, y: 160, text: 'Total: {V_dot_total:.1f} L/s', fontSize: 9, bold: true, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'pip-lbl-q1', kind: 'label', x: 380, y: 130, text: 'Q1: {V_dot_1:.1f} L/s', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'pip-lbl-q2', kind: 'label', x: 380, y: 320, text: 'Q2: {V_dot_2:.1f} L/s', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },

      // Controls
      { id: 'pip-ctrl-total', kind: 'ctl-slider', x: 30, y: 400, w: 220, h: 50, varName: 'V_dot_total', label: 'Pump Flow Rate (L/s)', min: 10, max: 100, step: 2, value: 50, rotation: 0, ...DEFAULT_STYLE },
      { id: 'pip-ctrl-frac', kind: 'ctl-slider', x: 330, y: 400, w: 220, h: 50, varName: 'valve_frac', label: 'Branch 1 Split Fraction', min: 0.1, max: 0.9, step: 0.05, value: 0.5, rotation: 0, ...DEFAULT_STYLE },
    ],
  },
  {
    name: 'Spring-Mass Free Body Diagram',
    description: 'Mechanical wall ground connection, spring-damper connector, and moving mass block.',
    elements: [
      // Wall Ground
      { id: 'mech-ground', kind: 'icon', icon: 'ground', x: 40, y: 120, w: 30, h: 120, rotation: 0, ...DEFAULT_STYLE },
      // Mass
      { id: 'mech-mass', kind: 'icon', icon: 'mass', x: 320, y: 130, w: 100, h: 100, rotation: 0, ...DEFAULT_STYLE },

      // Spring & Damper connection
      { id: 'mech-sd', kind: 'connector', fromId: 'mech-ground', fromAnchor: 'right', toId: 'mech-mass', toAnchor: 'left', style: 'straight', arrow: 'none', rotation: 0, ...DEFAULT_STYLE },

      // Forces annotation lines
      { id: 'mech-force-fext', kind: 'line', x1: 420, y1: 180, x2: 520, y2: 180, arrow: true, rotation: 0, stroke: '#e64980', strokeWidth: 3, fill: 'none', opacity: 1 },
      { id: 'mech-force-fspring', kind: 'line', x1: 200, y1: 150, x2: 100, y2: 150, arrow: true, rotation: 0, stroke: '#ffd43b', strokeWidth: 2, fill: 'none', opacity: 1 },
      { id: 'mech-force-fdamper', kind: 'line', x1: 200, y1: 210, x2: 100, y2: 210, arrow: true, rotation: 0, stroke: '#4dabf7', strokeWidth: 2, fill: 'none', opacity: 1 },

      // Title
      {
        id: 'mech-lbl-title',
        kind: 'label',
        x: 180,
        y: 10,
        text: 'Spring-Mass-Damper System',
        fontSize: 14,
        bold: true,
        rotation: 0,
        stroke: '#ff6b6b',
        strokeWidth: 0,
        fill: 'transparent',
        opacity: 1,
      },

      // Labels
      { id: 'mech-lbl-mass', kind: 'label', x: 330, y: 240, text: 'Mass = {m} kg', fontSize: 10, bold: true, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'mech-lbl-fext', kind: 'label', x: 440, y: 150, text: 'F_ext = {F_ext} N', fontSize: 9, bold: false, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },
      { id: 'mech-lbl-x', kind: 'label', x: 330, y: 90, text: 'x = {x:.3f} m', fontSize: 10, bold: true, rotation: 0, ...DEFAULT_STYLE, strokeWidth: 0 },

      // Numeric Stepper and Sliders
      { id: 'mech-ctrl-k', kind: 'ctl-stepper', x: 20, y: 380, w: 160, h: 50, varName: 'k', label: 'Spring Constant k (N/m)', min: 1, max: 500, step: 5, value: 50, rotation: 0, ...DEFAULT_STYLE },
      { id: 'mech-ctrl-c', kind: 'ctl-stepper', x: 200, y: 380, w: 160, h: 50, varName: 'c', label: 'Damping coeff c (N·s/m)', min: 0.5, max: 50, step: 0.5, value: 5, rotation: 0, ...DEFAULT_STYLE },
      { id: 'mech-ctrl-fext', kind: 'ctl-slider', x: 380, y: 380, w: 180, h: 50, varName: 'F_ext', label: 'External Force F_ext (N)', min: 0, max: 200, step: 5, value: 100, rotation: 0, ...DEFAULT_STYLE },
    ],
  },
]
