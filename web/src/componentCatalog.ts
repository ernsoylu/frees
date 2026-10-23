// GENERATED FILE - DO NOT EDIT DIRECTLY.
// Compiled by scripts/compile-docs.js from this port's parsed component library
// plus authored Markdown descriptions (npm run compile-docs).

export interface ComponentParam {
  name: string;          // e.g. "U_tp", "fluid$"
  isString: boolean;     // name ends in "$"
  isSelector: boolean;   // a model$ variant selector
  isMap: boolean;        // a string param naming a TABLE/FUNCTION map (map$, map_eta$)
  unit: string;          // frees-safe unit token, or "" if none/dimensionless
  description: string;
  required: boolean;
  values: string[];      // selector option values (model variants), else []
  variants: string[];    // variants that require this param; [] = shared/always-shown
  defaultValue?: string; // engine-declared default (PARAM model$ = isentropic), else ""
}

export interface ComponentVariant {
  name: string;          // model$ value, e.g. "volumetric"
  requires: string[];    // params this variant requires
}

export interface ComponentSpec {
  type: string;          // "Chiller"
  library: string;       // "ac"
  summary: string;
  tags: string[];
  ports: string[];       // ["ref_in","ref_out","cool_in","cool_out"]
  params: ComponentParam[]; // in Usage (canonical) order
  variants: ComponentVariant[]; // model$ variants, [] if none
}

export const COMPONENT_CATALOG: ComponentSpec[] = [
  {
    type: `AirCoil`,
    library: `ac`,
    summary: `An air-to-refrigerant coil (the air side of an evaporator or condenser).`,
    tags: [`aircoil`, `component`, `ac`, `acausal`],
    ports: [`ref_in`, `ref_out`, `air_in`, `air_out`],
    params: [
      { name: `ref$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `U_tp`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Two-phase-zone overall coefficient [W/m²·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `U_sh`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Superheat-zone overall coefficient [W/m²·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_zone`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Zone-collapse smoothing width [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_air`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Air-side effectiveness.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Chiller`,
    library: `ac`,
    summary: `A refrigerant-to-coolant chiller transferring heat between the two loops.`,
    tags: [`chiller`, `component`, `ac`, `acausal`],
    ports: [`ref_in`, `ref_out`, `cool_in`, `cool_out`],
    params: [
      { name: `ref$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cool$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Coolant name (e.g. EG50, Water).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `U_tp`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Two-phase-zone overall coefficient [W/m²·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `U_sh`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Superheat-zone overall coefficient [W/m²·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_zone`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Zone-collapse smoothing width [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA_cool`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Coolant-side conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `EXV`,
    library: `ac`,
    summary: `An electronic expansion valve with a commanded opening.`,
    tags: [`exv`, `component`, `ac`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `CdA_max`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Maximum Cd·A [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `u`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Valve opening, 0 (shut) to 1 (fully open) [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `EXVCmd`,
    library: `ac`,
    summary: `Signal-commanded EXV: identical orifice physics to EXV, but the opening fraction arrives on a signal port \`u\` (u.sig ∈ [0,1]) so a controller (SigPID, SigTable schedule, …) can drive it in closed loop.`,
    tags: [`exvcmd`, `component`, `ac`, `acausal`],
    ports: [`in`, `out`, `u`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `CdA_max`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Fully open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `HeaterCore`,
    library: `ac`,
    summary: `Heater core: the cabin-heating radiator — hot coolant warms the ventilation air stream through the shared wall node.`,
    tags: [`heatercore`, `component`, `ac`, `acausal`],
    ports: [`cool_in`, `cool_out`, `air_in`, `air_out`],
    params: [
      { name: `cool$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Coolant name (e.g. EG50, Water).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA_cool`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Coolant-side conductance to the shared wall [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_air`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Air-side effectiveness against the wall temperature [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Radiator`,
    library: `ac`,
    summary: `Radiator: coolant rejects heat to ambient moist air through a shared wall node (hierarchical single-domain halves, per the §2.4 rule).`,
    tags: [`radiator`, `component`, `ac`, `acausal`],
    ports: [`cool_in`, `cool_out`, `air_in`, `air_out`],
    params: [
      { name: `cool$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Coolant name (e.g. EG50, Water).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA_cool`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Coolant-side conductance to the shared wall [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_air`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Air-side effectiveness against the wall temperature [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TXV`,
    library: `ac`,
    summary: `A thermostatic expansion valve that meters refrigerant to hold a target superheat.`,
    tags: [`txv`, `component`, `ac`, `acausal`],
    ports: [`in`, `out`, `bulb`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Kv`, isString: false, isSelector: false, isMap: false, unit: `m^2/K`, description: `Opening gain: flow area added per kelvin of superheat above SH_set [m²/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `SH_set`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Target superheat [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `CdA0`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Reference Cd·A [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `tau_valve`, isString: false, isSelector: false, isMap: false, unit: `s`, description: `Valve time constant [s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `tau_bulb`, isString: false, isSelector: false, isMap: false, unit: `s`, description: `Bulb time constant [s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `PIThermostat`,
    library: `control`,
    summary: `A proportional–integral thermostat controller driving an actuator to a setpoint.`,
    tags: [`pithermostat`, `component`, `control`, `acausal`],
    ports: [`port`],
    params: [
      { name: `Kp`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Proportional gain [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Ki`, isString: false, isSelector: false, isMap: false, unit: `W/K-s`, description: `Integral gain [W/K·s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Tref`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Reference (setpoint) temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Battery`,
    library: `electrical`,
    summary: `An electrical battery modeled as an EMF in series with an internal resistance.`,
    tags: [`battery`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `Voc`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Open-circuit voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R0`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Series (ohmic) resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Battery2RC`,
    library: `electrical`,
    summary: `A battery with two RC branches for second-order transient terminal behavior.`,
    tags: [`battery2rc`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `Voc`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Open-circuit voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R0`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Series (ohmic) resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R1`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `First RC-branch resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C1`, isString: false, isSelector: false, isMap: false, unit: `farad`, description: `First RC-branch capacitance [farad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R2`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Second RC-branch resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C2`, isString: false, isSelector: false, isMap: false, unit: `farad`, description: `Second RC-branch capacitance [farad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vrc1_0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Initial first-RC voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vrc2_0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Initial second-RC voltage [V].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `BatteryCellMap`,
    library: `electrical`,
    summary: `Map-based battery cell — the real ECM rung: open-circuit voltage from an OCV(SOC) TABLE, ohmic resistance with an Arrhenius temperature law, and the Bernardi heat Q = I²R − I·T·(dU/dT)(SOC) (entropic term from a dU/dT map).`,
    tags: [`batterycellmap`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `heat`],
    params: [
      { name: `ocv$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the open-circuit-voltage table, SOC → V.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dudt$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the entropic-coefficient table, SOC → dU/dT in V/K.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R0ref`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Ohmic resistance at the reference temperature [ohm].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Tref`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Reference temperature of R0ref [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Ea`, isString: false, isSelector: false, isMap: false, unit: `J/mol`, description: `Arrhenius activation energy of the ohmic resistance [J/mol].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Q0`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Rated capacity in ampere-hours, as a bare number [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C_th`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Cell heat capacity [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `SOC0`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Initial state of charge, 0 to 1 [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial cell temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `k_age`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Capacity lost per ampere-hour of throughput (\`aging\`, \`aging_cal\`) [-].`, required: true, values: [], variants: [`aging`, `aging_cal`], defaultValue: `` },
      { name: `R1`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `RC-branch resistance (\`rc_map\`) [ohm].`, required: true, values: [], variants: [`rc_map`], defaultValue: `` },
      { name: `C1`, isString: false, isSelector: false, isMap: false, unit: `farad`, description: `RC-branch capacitance (\`rc_map\`) [farad].`, required: true, values: [], variants: [`rc_map`], defaultValue: `` },
      { name: `k_cal`, isString: false, isSelector: false, isMap: false, unit: `1/s`, description: `Calendar-fade rate prefactor (\`aging_cal\`) [1/s].`, required: true, values: [], variants: [`aging_cal`], defaultValue: `` },
      { name: `Ea_cal`, isString: false, isSelector: false, isMap: false, unit: `J/mol`, description: `Calendar-fade activation energy (\`aging_cal\`) [J/mol].`, required: true, values: [], variants: [`aging_cal`], defaultValue: `` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: `Variant — \`static\` (default), \`aging\`, \`rc_map\` or \`aging_cal\`.`, required: false, values: [`static`, `aging`, `rc_map`, `aging_cal`], variants: [], defaultValue: `static` }
    ],
    variants: [{ name: `static`, requires: [] }, { name: `aging`, requires: [`k_age`] }, { name: `rc_map`, requires: [`R1`, `C1`] }, { name: `aging_cal`, requires: [`k_age`, `k_cal`, `Ea_cal`] }],
  },
  {
    type: `BatteryPack`,
    library: `electrical`,
    summary: `Battery pack: Ns series × Np parallel of the map cell, lumped (uniform SOC and temperature — the standard pack-level rung).`,
    tags: [`batterypack`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `heat`],
    params: [
      { name: `Ns`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Cells in series [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Np`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Parallel strings [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `ocv$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the cell open-circuit-voltage table, SOC → V.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dudt$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the cell entropic-coefficient table, SOC → dU/dT in V/K.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R0ref`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Cell ohmic resistance at the reference temperature [ohm].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Tref`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Reference temperature of R0ref [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Ea`, isString: false, isSelector: false, isMap: false, unit: `J/mol`, description: `Arrhenius activation energy of the ohmic resistance [J/mol].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Q0`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Cell rated capacity in ampere-hours, as a bare number [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C_th`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Pack heat capacity [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `SOC0`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Initial state of charge, 0 to 1 [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial pack temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `BatteryRC`,
    library: `electrical`,
    summary: `A battery with one RC branch for first-order transient terminal behavior.`,
    tags: [`batteryrc`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `Voc`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Open-circuit voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R0`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Series (ohmic) resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R1`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `First RC-branch resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C1`, isString: false, isSelector: false, isMap: false, unit: `farad`, description: `First RC-branch capacitance [farad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vrc0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Initial RC-branch voltage [V].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `BatteryThermal`,
    library: `electrical`,
    summary: `A battery with a coupled thermal model relating losses to temperature.`,
    tags: [`batterythermal`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `heat`],
    params: [
      { name: `Voc`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Open-circuit voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R0`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Series (ohmic) resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `BatteryTransient`,
    library: `electrical`,
    summary: `A transient battery model carrying state-of-charge dynamics.`,
    tags: [`batterytransient`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `heat`],
    params: [
      { name: `Voc`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Open-circuit voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R0`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Series (ohmic) resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Q0`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Rated capacity in ampere-hours, entered as a plain number (the model converts it with 3600 A·s per A·h) [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C_th`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Thermal capacitance [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `SOC0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial state of charge (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Reference/initial temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Capacitor`,
    library: `electrical`,
    summary: `A capacitor storing charge, with i = C dV/dt.`,
    tags: [`capacitor`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `farad`, description: `Capacitance [farad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Initial voltage [V].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ChargerCCCV`,
    library: `electrical`,
    summary: `CC-CV charger: sources Imax until the terminal voltage approaches Vmax, then tapers (tanh, width epsV) — the constant-current / constant-voltage profile with no mode switch.`,
    tags: [`chargercccv`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `Imax`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Constant-current charging limit [A].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vmax`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Constant-voltage set point [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsV`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Smoothing width of the CC-to-CV taper [V].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `CurrentSource`,
    library: `electrical`,
    summary: `An ideal current source.`,
    tags: [`currentsource`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `I`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Current [A].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `DCDCConverter`,
    library: `electrical`,
    summary: `Ideal-transformer DC/DC converter with a fixed voltage ratio and a four-quadrant efficiency (forward power / eta, reverse power · eta).`,
    tags: [`dcdcconverter`, `component`, `electrical`, `acausal`],
    ports: [`in_p`, `in_n`, `out_p`, `out_n`],
    params: [
      { name: `ratio`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Output-to-input voltage ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Conversion efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsP`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Smoothing width of the power-direction switch [W].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `DCMotor`,
    library: `electrical`,
    summary: `A DC motor — an electrical-to-mechanical transducer (back-EMF and torque constants).`,
    tags: [`dcmotor`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `shaft`],
    params: [
      { name: `Kt`, isString: false, isSelector: false, isMap: false, unit: `N-m/A`, description: `Torque constant [N·m/A].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Ke`, isString: false, isSelector: false, isMap: false, unit: `V-s/rad`, description: `Back-EMF constant [V·s/rad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Diode`,
    library: `electrical`,
    summary: `A nonlinear diode with an exponential current–voltage characteristic.`,
    tags: [`diode`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `Gon`, isString: false, isSelector: false, isMap: false, unit: `siemens`, description: `On-state conductance [siemens].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Conduction smoothing voltage [V] — the tanh transition width around zero bias.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Electrolyzer`,
    library: `electrical`,
    summary: `PEM electrolyzer stack (reverse fuel cell): reversible potential + activation (ln(i/i0 + 1), regular at zero current) + ohmic overpotentials; hydrogen production from Faraday's law; heat above the thermoneutral voltage Eth.`,
    tags: [`electrolyzer`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `heat`],
    params: [
      { name: `ncells`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Cells in the stack [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `area`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Active area per cell [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `i0`, isString: false, isSelector: false, isMap: false, unit: `A/m^2`, description: `Exchange current density [A/m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Rohm`, isString: false, isSelector: false, isMap: false, unit: `ohm-m^2`, description: `Area-specific ohmic resistance [ohm-m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `E0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Reversible cell voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `alpha`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Charge-transfer coefficient [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Eth`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Thermoneutral cell voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Stack temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ElectrolyzerThermal`,
    library: `electrical`,
    summary: `Electrolyzer with a coolant jacket (same pattern as the cooled stack).`,
    tags: [`electrolyzerthermal`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `cool_in`, `cool_out`],
    params: [
      { name: `ncells`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Cells in the stack [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `area`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Active area per cell [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `i0`, isString: false, isSelector: false, isMap: false, unit: `A/m^2`, description: `Exchange current density [A/m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Rohm`, isString: false, isSelector: false, isMap: false, unit: `ohm-m^2`, description: `Area-specific ohmic resistance [ohm-m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `E0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Reversible cell voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `alpha`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Charge-transfer coefficient [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Eth`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Thermoneutral cell voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Stack temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Coolant name (e.g. Water, EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Stack-to-coolant conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `FuelCellStack`,
    library: `electrical`,
    summary: `A PEM fuel-cell stack producing voltage from its polarization curve.`,
    tags: [`fuelcellstack`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `heat`],
    params: [
      { name: `ncells`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Number of cells.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `area`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Area [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `i0`, isString: false, isSelector: false, isMap: false, unit: `A/m^2`, description: `Exchange current density [A/m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `ilim`, isString: false, isSelector: false, isMap: false, unit: `A/m^2`, description: `Limiting current density [A/m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Rohm`, isString: false, isSelector: false, isMap: false, unit: `ohm-m^2`, description: `Area-specific ohmic resistance [Ω·m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `E0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Reference EMF [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `alpha`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Void fraction / coefficient.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Eth`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Thermoneutral cell voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `FuelCellStackCooled`,
    library: `electrical`,
    summary: `PEM stack with a coolant jacket: the electrochemical stack's waste heat crosses into a liquid loop through a UA wall (drop-in for FuelCellStack when the thermal loop matters).`,
    tags: [`fuelcellstackcooled`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `cool_in`, `cool_out`],
    params: [
      { name: `ncells`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Cells in the stack [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `area`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Active area per cell [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `i0`, isString: false, isSelector: false, isMap: false, unit: `A/m^2`, description: `Exchange current density [A/m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `ilim`, isString: false, isSelector: false, isMap: false, unit: `A/m^2`, description: `Limiting current density [A/m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Rohm`, isString: false, isSelector: false, isMap: false, unit: `ohm-m^2`, description: `Area-specific ohmic resistance [ohm-m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `E0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Reversible cell voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `alpha`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Charge-transfer coefficient [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Eth`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Thermoneutral cell voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Stack temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Coolant name (e.g. Water, EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Stack-to-coolant conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Ground`,
    library: `electrical`,
    summary: `The electrical reference node (V = 0).`,
    tags: [`ground`, `component`, `electrical`, `acausal`],
    ports: [`port`],
    params: [

    ],
    variants: [],
  },
  {
    type: `HarnessResistance`,
    library: `electrical`,
    summary: `Harness/busbar resistance with the copper temperature coefficient, sensing its temperature on the heat port and dissipating I²R there.`,
    tags: [`harnessresistance`, `component`, `electrical`, `acausal`],
    ports: [`a`, `b`, `heat`],
    params: [
      { name: `R20`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Resistance at 20 °C [ohm].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `alphaT`, isString: false, isSelector: false, isMap: false, unit: `1/K`, description: `Temperature coefficient of resistance [1/K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `HeatingResistor`,
    library: `electrical`,
    summary: `A resistor that dissipates its electrical power as heat (electrical→thermal transducer).`,
    tags: [`heatingresistor`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `heat`],
    params: [
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Inductor`,
    library: `electrical`,
    summary: `An inductor storing magnetic energy, with V = L di/dt.`,
    tags: [`inductor`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `henry`, description: `Inductance [henry].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `I0`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Saturation current [A].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `InverterLoss`,
    library: `electrical`,
    summary: `Series inverter loss element: conduction (device drop V0 + r·I) plus switching loss folded into an equivalent drop Vsw = Esw·fsw·Vnom/(Iref·Vref) — energy-consistent (Q = ΔV·I exactly), tanh-smooth through zero current.`,
    tags: [`inverterloss`, `component`, `electrical`, `acausal`],
    ports: [`in_p`, `out_p`, `heat`],
    params: [
      { name: `V0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Switch threshold voltage drop [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `r`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Conduction slope resistance [ohm].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Esw`, isString: false, isSelector: false, isMap: false, unit: `J`, description: `Switching energy per event at Iref and Vref [J].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `fsw`, isString: false, isSelector: false, isMap: false, unit: `Hz`, description: `Switching frequency [Hz].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Iref`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Current at which Esw was measured [A].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vref`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Voltage at which Esw was measured [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vnom`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Operating DC-link voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsI`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Smoothing width of the current-direction switch [A].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `MotorMap`,
    library: `electrical`,
    summary: `Map-efficiency e-machine: torque command on the signal port u [N·m], losses from a 2-D efficiency map eff$(ω, τ).`,
    tags: [`motormap`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `shaft`, `heat`, `u`],
    params: [
      { name: `eff$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the efficiency table, (ω, τ) → η.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsP`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Smoothing width of the motor/generator switch [W].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `MPPTBlock`,
    library: `electrical`,
    summary: `Map-referenced maximum-power-point command: Vmp from an irradiance map (perturb-free analytic tracking; pair with PVSingleDiode + a DC-DC stage).`,
    tags: [`mpptblock`, `component`, `electrical`, `acausal`],
    ports: [`G`, `out`],
    params: [
      { name: `vmp$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the table mapping irradiance to the maximum-power-point voltage.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `PMSM`,
    library: `electrical`,
    summary: `A permanent-magnet synchronous motor.`,
    tags: [`pmsm`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `shaft`],
    params: [
      { name: `Rs`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Series resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `lambda_pm`, isString: false, isSelector: false, isMap: false, unit: `Wb`, description: `PM flux linkage [Wb].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `poles`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Number of magnetic pole pairs.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `PVSingleDiode`,
    library: `electrical`,
    summary: `Single-diode PV module: I = Iph − I0·(exp(Vd/(n·Vt)) − 1) − Vd/Rsh with the series-resistance diode voltage Vd = V + I·Rs — the physics rung above SolarArray's clamp model.`,
    tags: [`pvsinglediode`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `G`],
    params: [
      { name: `Isc_ref`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Short-circuit current at the reference irradiance [A].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Gref`, isString: false, isSelector: false, isMap: false, unit: `W/m^2`, description: `Reference irradiance [W/m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `I0d`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Diode saturation current [A].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `n_d`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Diode ideality factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vt`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Thermal voltage of the series-connected cells [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Rs`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Series resistance [ohm].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Rsh`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Shunt resistance [ohm].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Resistor`,
    library: `electrical`,
    summary: `An Ohmic resistor, V = R·I.`,
    tags: [`resistor`, `component`, `electrical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Resistance [Ω].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SolarArray`,
    library: `electrical`,
    summary: `Solar array: photocurrent proportional to the irradiance signal G [W/m²], with a smooth open-circuit clamp at Voc — the constant-current PV rung.`,
    tags: [`solararray`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`, `G`],
    params: [
      { name: `Isc_ref`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Short-circuit current at the reference irradiance [A].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Gref`, isString: false, isSelector: false, isMap: false, unit: `W/m^2`, description: `Reference irradiance [W/m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Voc`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Open-circuit voltage [V].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsV`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Smoothing width of the knee near Voc [V].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Supercapacitor`,
    library: `electrical`,
    summary: `Supercapacitor: ideal capacitance with an equivalent series resistance.`,
    tags: [`supercapacitor`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `farad`, description: `Capacitance [farad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R_esr`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Equivalent series resistance [ohm].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V0`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `Initial capacitor voltage [V].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ThermalFuse`,
    library: `electrical`,
    summary: `Thermal fuse: the element resistance multiplies by (1 + kR) once |I| exceeds the blow rating (tanh, width epsI) — a continuous overcurrent trip.`,
    tags: [`thermalfuse`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `R0`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Intact resistance [ohm].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Iblow`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Blow current [A].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `kR`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fractional resistance rise once blown [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsI`, isString: false, isSelector: false, isMap: false, unit: `A`, description: `Smoothing width of the blow transition [A].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `VoltageSource`,
    library: `electrical`,
    summary: `An ideal voltage source.`,
    tags: [`voltagesource`, `component`, `electrical`, `acausal`],
    ports: [`p`, `n`],
    params: [
      { name: `E`, isString: false, isSelector: false, isMap: false, unit: `V`, description: `EMF / voltage [V].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Accumulator`,
    library: `fluid`,
    summary: `A fluid accumulator — a compliance volume that stores fluid under pressure and buffers flow transients.`,
    tags: [`accumulator`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `kg/Pa`, description: `Hydraulic capacitance, stored mass per unit pressure [kg/Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Reference/initial pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `AtmosphereSource`,
    library: `fluid`,
    summary: `ISA atmosphere boundary: the 1976 standard atmosphere state at altitude, as a flow source (use with ram/propulsion models).`,
    tags: [`atmospheresource`, `component`, `fluid`, `acausal`],
    ports: [`out`],
    params: [
      { name: `alt`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Geometric altitude of the 1976 standard atmosphere [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mdot`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow delivered [kg/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Boiler`,
    library: `fluid`,
    summary: `Adds heat to a fluid stream, raising its enthalpy (and generating vapor at saturation).`,
    tags: [`boiler`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `Combustor`,
    library: `fluid`,
    summary: `Combustor: fuel mass addition with combustion efficiency on the lower heating value and a rated pressure loss.`,
    tags: [`combustor`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `mdot_f`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Fuel mass flow [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `LHV`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Fuel lower heating value [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_b`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Combustion efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure loss across the combustor [Pa].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `CombustorSpecies`,
    library: `fluid`,
    summary: `Combustor emitting product composition: complete combustion of a CxHy fuel stream into the E3 species riders — CO2/H2O produced and O2 consumed by stoichiometry per kg of fuel; N2 passes as the balance.`,
    tags: [`combustorspecies`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `mdot_f`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Fuel mass flow [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `LHV`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Fuel lower heating value [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_b`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Combustion efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure loss across the combustor [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `xC`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Carbon atoms per molecule of the CxHy fuel [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `yH`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Hydrogen atoms per molecule of the CxHy fuel [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `Compressor`,
    library: `fluid`,
    summary: `Raises the pressure of a fluid stream, computing the work from an isentropic efficiency.`,
    tags: [`compressor`, `compressor-family`, `data:eta`, `ports:in-out`, `flow-closed`, `energy-work`, `steady`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Efficiency (0–1).`, required: true, values: [], variants: [`isentropic`, `volumetric`], defaultValue: `` },
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_v`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`volumetric`], defaultValue: `` },
      { name: `disp`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`volumetric`], defaultValue: `` },
      { name: `rpm`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`volumetric`, `map`], defaultValue: `` },
      { name: `map_eta$`, isString: true, isSelector: false, isMap: true, unit: ``, description: ``, required: true, values: [], variants: [`map`], defaultValue: `` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: `Model variant — selects the physics body (see Model Variants).`, required: false, values: [`isentropic`, `volumetric`, `map`], variants: [], defaultValue: `isentropic` }
    ],
    variants: [{ name: `isentropic`, requires: [`eta`] }, { name: `volumetric`, requires: [`eta`, `eta_v`, `disp`, `rpm`] }, { name: `map`, requires: [`map_eta$`, `rpm`] }],
  },
  {
    type: `CompressorMap`,
    library: `fluid`,
    summary: `A compressor whose isentropic efficiency comes from a tabulated map (eta vs pressure ratio).`,
    tags: [`compressor`, `compressor-family`, `compressormap`, `map`, `data:map-eta`, `ports:in-out`, `flow-closed`, `energy-work`, `steady`, `map-driven`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `map_eta$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of a TABLE/FUNCTION giving isentropic efficiency (0–1) vs pressure ratio (out.P/in.P).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `map_mdot$`, isString: true, isSelector: false, isMap: true, unit: ``, description: ``, required: true, values: [], variants: [`flow`], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: ``, required: false, values: [], variants: [], defaultValue: `fluid` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: ``, required: false, values: [`eta`, `flow`], variants: [], defaultValue: `eta` }
    ],
    variants: [{ name: `eta`, requires: [] }, { name: `flow`, requires: [`map_mdot$`] }],
  },
  {
    type: `Condenser`,
    library: `fluid`,
    summary: `Rejects heat from a fluid stream to a coolant/ambient, condensing it.`,
    tags: [`condenser`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `Duct`,
    library: `fluid`,
    summary: `A flow passage that imposes a pressure drop on the stream.`,
    tags: [`duct`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mu`, isString: false, isSelector: false, isMap: false, unit: `Pa-s`, description: `Dynamic viscosity [Pa·s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rough`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Absolute wall roughness [m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ExpansionValve`,
    library: `fluid`,
    summary: `Throttles a fluid to a lower pressure isenthalpically (Joule–Thomson).`,
    tags: [`expansionvalve`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `CdA`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Discharge coefficient × area Cd·A [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho_in`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Inlet density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Fan`,
    library: `fluid`,
    summary: `Adds a pressure rise to a gas/air stream, computing the fan work.`,
    tags: [`fan`, `fan-family`, `constant-rise`, `data:dP0-Q0-eta`, `ports:in-out`, `flow-closed`, `energy-work`, `steady`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Reference pressure drop [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Q0`, isString: false, isSelector: false, isMap: false, unit: `m^3/s`, description: `Free-delivery volume flow, where the pressure rise falls to zero [m³/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Efficiency (0–1).`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `FanCurve`,
    library: `fluid`,
    summary: `A fan whose pressure rise follows a tabulated pressure–flow performance curve.`,
    tags: [`fan`, `fan-family`, `fancurve`, `curve`, `data:rho-dP0-Q0`, `ports:in-out`, `flow-closed`, `energy-pressure`, `steady`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Reference pressure drop [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Q0`, isString: false, isSelector: false, isMap: false, unit: `m^3/s`, description: `Free-delivery volume flow, where the pressure rise falls to zero [m³/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `FanMap`,
    library: `fluid`,
    summary: `A fan whose pressure rise comes from a tabulated performance map (ΔP vs volumetric flow).`,
    tags: [`fan`, `fan-family`, `fanmap`, `map`, `data:rho-map`, `ports:in-out`, `flow-closed`, `energy-pressure`, `steady`, `map-driven`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `map$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of a TABLE/FUNCTION giving pressure rise [Pa] vs volumetric flow [m³/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `FlowSensor`,
    library: `fluid`,
    summary: `Measures the mass flow of a stream (a pass-through sensor).`,
    tags: [`flowsensor`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `HeatedDuct`,
    library: `fluid`,
    summary: `Heated duct: single-stream ε-NTU heat pickup from a wall node (ε = 1 − e^(−UA/ṁcp)), the exact single-stream limit.`,
    tags: [`heatedduct`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Wall-to-stream conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `HeatExchanger`,
    library: `fluid`,
    summary: `Transfers heat between two fluid streams across a wall.`,
    tags: [`heatexchanger`, `component`, `fluid`, `acausal`],
    ports: [`hot_in`, `hot_out`, `cold_in`, `cold_out`],
    params: [
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Overall conductance UA [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `hot$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Hot-side fluid name (e.g. Water).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cold$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Cold-side fluid name (e.g. EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `arr$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Flow arrangement (passed to hx_effectiveness) — one of \`counterflow\`, \`parallel\`.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Mixer`,
    library: `fluid`,
    summary: `Combines two fluid streams into one, with flow-weighted enthalpy mixing.`,
    tags: [`mixer`, `component`, `fluid`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `Nozzle`,
    library: `fluid`,
    summary: `Accelerates a flow, converting enthalpy into kinetic energy.`,
    tags: [`nozzle`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Stiffness / conductivity.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Specific gas constant [J/kg·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `A_throat`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Throat area [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `A_exit`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Exit area [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P_amb`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Ambient pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Reference/initial temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Pipe`,
    library: `fluid`,
    summary: `A flow passage that imposes a frictional pressure drop.`,
    tags: [`pipe`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rough`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Absolute wall roughness [m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Propeller`,
    library: `fluid`,
    summary: `Propeller (actuator-line map form): thrust Ct(J)·ρn²D⁴ and shaft power Cp(J)·ρn³D⁵ from advance-ratio maps J = v/(nD) — bridges the shaft to the vehicle's translational port.`,
    tags: [`propeller`, `component`, `fluid`, `acausal`],
    ports: [`shaft`, `veh`],
    params: [
      { name: `Dp`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Propeller diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rhoA`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Air density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `ct$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the thrust-coefficient table, advance ratio J → Ct.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cpw$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the power-coefficient table, advance ratio J → Cp.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsn`, isString: false, isSelector: false, isMap: false, unit: `m/s`, description: `Regularization added to n·D so J stays finite at rest [m/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Pump`,
    library: `fluid`,
    summary: `Raises the pressure of a liquid stream, computing the work from a pump efficiency.`,
    tags: [`pump`, `pump-family`, `data:eta`, `ports:in-out`, `flow-closed`, `energy-work`, `steady`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Efficiency (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `PumpMap`,
    library: `fluid`,
    summary: `A pump whose head comes from a tabulated performance map (head vs volumetric flow).`,
    tags: [`pump`, `pump-family`, `pumpmap`, `map`, `data:rho-map`, `ports:in-out`, `flow-closed`, `energy-pressure`, `steady`, `map-driven`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `map$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of a TABLE/FUNCTION giving head [m] vs volumetric flow [m³/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Regenerator`,
    library: `fluid`,
    summary: `Effectiveness-rated regenerator/recuperator: Q = ε·Cmin·(Th − Tc) with ε given directly (rate it from the ε-NTU functions for a geometry design).`,
    tags: [`regenerator`, `component`, `fluid`, `acausal`],
    ports: [`hot_in`, `hot_out`, `cold_in`, `cold_out`],
    params: [
      { name: `hot$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Hot-stream fluid name.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cold$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Cold-stream fluid name.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Effectiveness on the minimum capacity rate [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Sink`,
    library: `fluid`,
    summary: `A fluid boundary that absorbs a stream at a set pressure.`,
    tags: [`sink`, `component`, `fluid`, `acausal`],
    ports: [`in`],
    params: [

    ],
    variants: [],
  },
  {
    type: `Source`,
    library: `fluid`,
    summary: `A fluid boundary that supplies a stream at set conditions.`,
    tags: [`source`, `component`, `fluid`, `acausal`],
    ports: [`out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mdot`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow rate [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Splitter`,
    library: `fluid`,
    summary: `Divides a fluid stream into two branches.`,
    tags: [`splitter`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out1`, `out2`],
    params: [

    ],
    variants: [],
  },
  {
    type: `Throttle`,
    library: `fluid`,
    summary: `An isenthalpic pressure-reducing restriction.`,
    tags: [`throttle`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `Turbine`,
    library: `fluid`,
    summary: `Extracts work from an expanding fluid stream, computing it from an isentropic efficiency.`,
    tags: [`turbine`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Efficiency (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Turbocharger`,
    library: `fluid`,
    summary: `A turbine-driven compressor pair coupled on a common shaft.`,
    tags: [`turbocharger`, `component`, `fluid`, `acausal`],
    ports: [`t_in`, `t_out`, `c_in`, `c_out`],
    params: [
      { name: `cp`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Specific heat [J/kg·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_t`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Turbine efficiency (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_c`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Compressor efficiency (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `gam`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Ratio of specific heats.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TwoZoneHX`,
    library: `fluid`,
    summary: `A two-zone heat exchanger resolving distinct thermal regions.`,
    tags: [`twozonehx`, `component`, `fluid`, `acausal`],
    ports: [`hot_in`, `hot_out`, `cold_in`, `cold_out`],
    params: [
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Overall conductance UA [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `hot$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Hot-side fluid name (e.g. Water).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cold$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Cold-side fluid name (e.g. EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `arr$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Flow arrangement (passed to hx_effectiveness) — one of \`counterflow\`, \`parallel\`.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Valve`,
    library: `fluid`,
    summary: `A flow restriction characterized by a flow/pressure-drop coefficient.`,
    tags: [`valve`, `component`, `fluid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `Cv`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Flow coefficient: ṁ`, required: true, values: [], variants: [`fixed`, `linear`, `eqpct`], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `u`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`linear`, `eqpct`], defaultValue: `` },
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`eqpct`], defaultValue: `` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: ``, required: false, values: [`fixed`, `linear`, `eqpct`], variants: [], defaultValue: `fixed` }
    ],
    variants: [{ name: `fixed`, requires: [`Cv`] }, { name: `linear`, requires: [`Cv`, `u`] }, { name: `eqpct`, requires: [`Cv`, `u`, `R`] }],
  },
  {
    type: `CellToPackThermal`,
    library: `heat`,
    summary: `Cell-to-plate thermal path: contact/interface resistance into the cold-plate mass — the network that makes pack gradients (cell hot spot vs plate) real.`,
    tags: [`celltopackthermal`, `component`, `heat`, `acausal`],
    ports: [`cell`, `plate`],
    params: [
      { name: `Rcc`, isString: false, isSelector: false, isMap: false, unit: `K/W`, description: `Cell-to-plate contact resistance [K/W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Cpl`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Cold-plate heat capacity [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial plate temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Conduction`,
    library: `heat`,
    summary: `A conductive thermal resistance (Fourier), Q̇ = (T1 − T2)/R.`,
    tags: [`conduction`, `component`, `heat`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: `W/m-K`, description: `Thermal conductivity [W/m·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `area`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Area [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ContactResistance`,
    library: `heat`,
    summary: `A thermal contact resistance between two surfaces.`,
    tags: [`contactresistance`, `component`, `heat`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `Rth`, isString: false, isSelector: false, isMap: false, unit: `K/W`, description: `Thermal resistance [K/W].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Convection`,
    library: `heat`,
    summary: `A convective link (Newton’s law of cooling), Q̇ = h·A·ΔT.`,
    tags: [`convection`, `component`, `heat`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `htc`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Heat-transfer coefficient [W/m²·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `area`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Area [m²].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `HeatPipe`,
    library: `heat`,
    summary: `Heat pipe: a very high effective conductance saturating smoothly at the transport limit Qmax (capillary/sonic), so overload degrades instead of diverging.`,
    tags: [`heatpipe`, `component`, `heat`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `G`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Effective conductance below the transport limit [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Qmax`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Transport (capillary or sonic) limit [W].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `HeatSource`,
    library: `heat`,
    summary: `A prescribed heat input to a thermal node.`,
    tags: [`heatsource`, `component`, `heat`, `acausal`],
    ports: [`port`],
    params: [
      { name: `Q`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Heat input [W].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `MassGen`,
    library: `heat`,
    summary: `A mass/heat generation source term.`,
    tags: [`massgen`, `component`, `heat`, `acausal`],
    ports: [`port`],
    params: [
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Heat capacity [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Qgen`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Generated heat [W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Reference/initial temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `MultiZoneWall`,
    library: `heat`,
    summary: `Two-zone partition wall: surface films (h_a, h_b) into two face masses with U·A conduction between them.`,
    tags: [`multizonewall`, `component`, `heat`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `h_a`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Film coefficient on side a [W/m^2-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `h_b`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Film coefficient on side b [W/m^2-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `U`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Conductance between the two face masses, per area [W/m^2-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `A`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Wall area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C1`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Heat capacity of face 1 (side a) [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C2`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Heat capacity of face 2 (side b) [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T10`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial temperature of face 1 [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T20`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial temperature of face 2 [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `PCMMass`,
    library: `heat`,
    summary: `Phase-change-material mass: latent heat L released over a Gaussian mushy zone of width dTm around the melt point (∫cp_eff dT = cp·ΔT + L exactly).`,
    tags: [`pcmmass`, `component`, `heat`, `acausal`],
    ports: [`port`],
    params: [
      { name: `m`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Mass of phase-change material [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cp`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Sensible specific heat [J/kg-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Latent heat of fusion [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Tm`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Melting temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dTm`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Width of the mushy zone [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `PeltierTEC`,
    library: `heat`,
    summary: `Peltier thermoelectric module: Seebeck voltage + ohmic drop electrically; Peltier pumping ± half-Joule and back-conduction thermally.`,
    tags: [`peltiertec`, `component`, `heat`, `acausal`],
    ports: [`p`, `n`, `hot`, `cold`],
    params: [
      { name: `Sab`, isString: false, isSelector: false, isMap: false, unit: `V/K`, description: `Module Seebeck coefficient [V/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Rel`, isString: false, isSelector: false, isMap: false, unit: `ohm`, description: `Module electrical resistance [ohm].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Kth`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Module thermal conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Radiation`,
    library: `heat`,
    summary: `A radiative exchange link (Stefan–Boltzmann), Q̇ = εσA(T1⁴ − T2⁴).`,
    tags: [`radiation`, `component`, `heat`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `emis`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Emissivity (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `area`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Area [m²].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `RadiationTwoSurface`,
    library: `heat`,
    summary: `Two-surface radiation enclosure: surface resistances (1−ε)/(εA) in series with the view-factor space resistance 1/(A1·F12), on the σ(T⁴−T⁴) potential.`,
    tags: [`radiationtwosurface`, `component`, `heat`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `e1`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Emissivity of surface 1 [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `e2`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Emissivity of surface 2 [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `A1`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Area of surface 1 [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `A2`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Area of surface 2 [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `F12`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `View factor from surface 1 to surface 2 [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ThermalMass`,
    library: `heat`,
    summary: `A lumped thermal capacitance, C dT/dt = Q̇.`,
    tags: [`thermalmass`, `component`, `heat`, `acausal`],
    ports: [`port`],
    params: [
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Heat capacity [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Reference/initial temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ThermalSensor`,
    library: `heat`,
    summary: `A temperature sensor (pass-through).`,
    tags: [`thermalsensor`, `component`, `heat`, `acausal`],
    ports: [`port`],
    params: [

    ],
    variants: [],
  },
  {
    type: `ThermalSource`,
    library: `heat`,
    summary: `A prescribed-temperature boundary.`,
    tags: [`thermalsource`, `component`, `heat`, `acausal`],
    ports: [`port`],
    params: [
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ThermalSwitch`,
    library: `heat`,
    summary: `Thermal switch / bimetal thermostat: a conductance that engages smoothly above the trip temperature (sensed on side a).`,
    tags: [`thermalswitch`, `component`, `heat`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `G`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Conductance when engaged [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Ton`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Trip temperature, sensed on side a [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `band`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Width of the engagement transition [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `WallRC`,
    library: `heat`,
    summary: `Two-node transient wall: capacitance–conduction–capacitance, the classic RC warm-up wall between two heat ports.`,
    tags: [`wallrc`, `component`, `heat`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `C1`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Heat capacity of node 1 (side a) [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C2`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Heat capacity of node 2 (side b) [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `K/W`, description: `Conduction resistance between the nodes [K/W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T10`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial temperature of node 1 [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T20`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial temperature of node 2 [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `CounterbalanceValve`,
    library: `hydraulic`,
    summary: `Counterbalance (overcenter) valve: opens on the spring-referenced blend of load pressure and pilot assist (ratio R_p), then meters with the square law — controlled load lowering.`,
    tags: [`counterbalancevalve`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`, `pilot`],
    params: [
      { name: `CdA_max`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Fully open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P_set`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Cracking pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R_p`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Pilot area ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_o`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Width of the opening transition [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicAccumulator`,
    library: `hydraulic`,
    summary: `Gas-charged accumulator: precharge P0 filling gas volume V0; the oil drives the gas polytropically (P·V^γ = P0·V0^γ) with the gas volume as the state.`,
    tags: [`hydraulicaccumulator`, `component`, `hydraulic`, `acausal`],
    ports: [`port`],
    params: [
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Gas precharge pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V0`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Gas volume at the precharge pressure [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `gamma`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Polytropic exponent of the gas [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vg0`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Initial gas volume [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicCheckValve`,
    library: `hydraulic`,
    summary: `Check valve: square-law orifice gated smoothly to forward ΔP (width eps).`,
    tags: [`hydrauliccheckvalve`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `CdA`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Width of the opening transition [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicCylinder`,
    library: `hydraulic`,
    summary: `A hydraulic actuator converting flow/pressure to motion/force.`,
    tags: [`hydrauliccylinder`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `rod`],
    params: [
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `beta`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Oil bulk modulus [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V0`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Dead volume of the chamber at zero stroke [m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `area`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Area [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Patm`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Atmospheric pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Reference/initial pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicDoubleActingCylinder`,
    library: `hydraulic`,
    summary: `Double-acting cylinder: two bulk-modulus chambers (piston/rod areas Aa, Ab) and the rod force balance.`,
    tags: [`hydraulicdoubleactingcylinder`, `component`, `hydraulic`, `acausal`],
    ports: [`a`, `b`, `rod`],
    params: [
      { name: `Aa`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Piston area on the cap side (port a) [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Ab`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Annulus area on the rod side (port b) [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `beta`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Oil bulk modulus [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Va0`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Chamber volume on side a [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vb0`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Chamber volume on side b [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Pa0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Initial pressure in chamber a [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Pb0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Initial pressure in chamber b [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicFlowControl`,
    library: `hydraulic`,
    summary: `Ideal pressure-compensated flow control: holds the set volumetric flow regardless of ΔP (within authority — rate it against the circuit).`,
    tags: [`hydraulicflowcontrol`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `Qset`, isString: false, isSelector: false, isMap: false, unit: `m^3/s`, description: `Regulated volume flow [m^3/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicFlowDivider`,
    library: `hydraulic`,
    summary: `Ideal spool flow divider: forces the flow split frac/(1-frac) regardless of the branch loads; the inlet pressure is the power-conserving mix.`,
    tags: [`hydraulicflowdivider`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `outa`, `outb`],
    params: [
      { name: `frac`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fraction of the inflow sent to outa [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicMotor`,
    library: `hydraulic`,
    summary: `Fixed-displacement motor: the exact dual of HydraulicPump (volumetric slip divides the flow, mechanical efficiency multiplies the torque).`,
    tags: [`hydraulicmotor`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`, `shaft`],
    params: [
      { name: `disp`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Displacement per revolution [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_v`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Volumetric efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_m`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Mechanical efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicOrifice`,
    library: `hydraulic`,
    summary: `A hydraulic orifice metering flow by ṁ ∝ √Δp.`,
    tags: [`hydraulicorifice`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `CdA`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Discharge coefficient × area Cd·A [m²].`, required: true, values: [], variants: [`turbulent`], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `A`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`cq_lambda`], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`cq_lambda`], defaultValue: `` },
      { name: `nu`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`cq_lambda`], defaultValue: `` },
      { name: `Cqmax`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`cq_lambda`], defaultValue: `` },
      { name: `lamc`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`cq_lambda`], defaultValue: `` },
      { name: `epsP`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`cq_lambda`], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: ``, required: false, values: [`turbulent`, `cq_lambda`], variants: [], defaultValue: `turbulent` }
    ],
    variants: [{ name: `turbulent`, requires: [`CdA`] }, { name: `cq_lambda`, requires: [`A`, `D`, `nu`, `Cqmax`, `lamc`, `epsP`] }],
  },
  {
    type: `HydraulicPilotCheckValve`,
    library: `hydraulic`,
    summary: `Pilot-operated check valve: a pilot pressure (ratio rp) can hold the poppet open against reverse ΔP — the load-holding valve.`,
    tags: [`hydraulicpilotcheckvalve`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`, `pilot`],
    params: [
      { name: `CdA`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rp`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Pilot area ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Width of the opening transition [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicPipe`,
    library: `hydraulic`,
    summary: `Hydraulic line with Darcy friction on the oil kinematic viscosity (laminar-turbulent via the Colebrook friction factor, sign-safe).`,
    tags: [`hydraulicpipe`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `nu`, isString: false, isSelector: false, isMap: false, unit: `m^2/s`, description: `Kinematic viscosity [m^2/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Inner diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rough`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Absolute wall roughness [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicPump`,
    library: `hydraulic`,
    summary: `A hydraulic pump delivering flow against pressure.`,
    tags: [`hydraulicpump`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`, `shaft`],
    params: [
      { name: `disp`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Displacement volume [m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_v`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Volumetric efficiency (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_m`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Mechanical efficiency (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicResistance`,
    library: `hydraulic`,
    summary: `Generic K-factor resistance (bend, tee, sudden expansion — set K from the standard flow-network loss correlations).`,
    tags: [`hydraulicresistance`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `K`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Loss coefficient on the dynamic pressure [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Reference diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicSequenceValve`,
    library: `hydraulic`,
    summary: `Sequence valve: passes flow to the secondary circuit only above the primary pressure setpoint (tanh gate).`,
    tags: [`hydraulicsequencevalve`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `Pset`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Inlet pressure at which the valve opens [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `CdA`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Width of the opening transition [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicSupply`,
    library: `hydraulic`,
    summary: `A hydraulic pressure supply.`,
    tags: [`hydraulicsupply`, `component`, `hydraulic`, `acausal`],
    ports: [`out`],
    params: [
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicTank`,
    library: `hydraulic`,
    summary: `A hydraulic reservoir at (near) atmospheric pressure.`,
    tags: [`hydraulictank`, `component`, `hydraulic`, `acausal`],
    ports: [`port`],
    params: [
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicThermalVolume`,
    library: `hydraulic`,
    summary: `Oil volume with pressure AND temperature states plus a heat port — the thermal-hydraulic node for warm-up and cooling-loop studies.`,
    tags: [`hydraulicthermalvolume`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cp_o`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Oil specific heat [J/kg-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `beta`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Oil bulk modulus [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `hA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Oil-to-wall conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Initial pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial oil temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Pvap`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Vapour pressure where the bulk modulus collapses (\`cav\`) [Pa].`, required: true, values: [], variants: [`cav`], defaultValue: `` },
      { name: `eps_c`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Width of the cavitation transition (\`cav\`) [Pa].`, required: true, values: [], variants: [`cav`], defaultValue: `` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: `Variant — \`stiff\` (default) or \`cav\`.`, required: false, values: [`stiff`, `cav`], variants: [], defaultValue: `stiff` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [{ name: `stiff`, requires: [] }, { name: `cav`, requires: [`Pvap`, `eps_c`] }],
  },
  {
    type: `HydraulicValve`,
    library: `hydraulic`,
    summary: `A hydraulic valve metering flow vs. pressure drop.`,
    tags: [`hydraulicvalve`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `CdA_max`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Maximum Cd·A [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `u`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Valve opening, 0 (shut) to 1 (fully open) [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicValveCmd`,
    library: `hydraulic`,
    summary: `Signal-commanded proportional valve: spool command u.sig ∈ [0,1] scales the orifice CdA — the closed-loop counterpart of HydraulicValve.`,
    tags: [`hydraulicvalvecmd`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`, `u`],
    params: [
      { name: `CdA_max`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Fully open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `HydraulicVolume`,
    library: `hydraulic`,
    summary: `Standalone bulk-modulus volume (the hydraulic C-node): der(P) from the net flow against the oil stiffness beta.`,
    tags: [`hydraulicvolume`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `beta`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Oil bulk modulus [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Initial pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `LoadSensingPump`,
    library: `hydraulic`,
    summary: `Load-sensing pump: the displacement fraction integrates the compensator error (LS pressure + margin vs outlet), soft-clamped to 0..1 by a logistic; delivery is the effective displacement at the drive speed.`,
    tags: [`loadsensingpump`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`, `ls`],
    params: [
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Dv`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Displacement per revolution at full stroke [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `w_p`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Shaft speed [rad/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP_margin`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Margin held above the load-sense pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `tau`, isString: false, isSelector: false, isMap: false, unit: `s`, description: `Stroke-control time constant [s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `d0`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Initial stroke-control state [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `ReliefValve`,
    library: `hydraulic`,
    summary: `A pressure-relief valve that opens above its set pressure.`,
    tags: [`reliefvalve`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `Pcrack`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Cracking (relief) pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `K`, isString: false, isSelector: false, isMap: false, unit: `kg/s-Pa`, description: `Flow gain once open: ṁ = K·(P_in − P_out) [kg/s·Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Opening smoothing width [Pa] — the tanh transition around \`Pcrack\`.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `ServoValveDynamic`,
    library: `hydraulic`,
    summary: `Servo valve with 2nd-order spool dynamics: the spool position tracks the command through (wn, zeta) and gates the odd-symmetric square-law flow — the dynamic rung above HydraulicValveCmd.`,
    tags: [`servovalvedynamic`, `component`, `hydraulic`, `acausal`],
    ports: [`in`, `out`, `u`],
    params: [
      { name: `CdA_max`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Fully open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Oil density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `wn`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Spool natural frequency [rad/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `zeta`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Spool damping ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `xs0`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Initial spool opening [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `oil` }
    ],
    variants: [],
  },
  {
    type: `CoolingTower`,
    library: `liquid`,
    summary: `Cooling tower (Merkel-lite): heat rejection on the enthalpy potential between saturated air at the water inlet temperature and ambient air at its wet-bulb (signal port), with a tower effectiveness and design air flow.`,
    tags: [`coolingtower`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`, `wb`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Liquid name (e.g. Water, EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_t`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Tower effectiveness on the enthalpy potential [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mdot_a`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Air mass flow [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Patm`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Atmospheric pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `GravityDrain`,
    library: `liquid`,
    summary: `Gravity drain (Torricelli): the C1 odd-symmetric flow law mdot|mdot| = (Cd*A)^2 * 2*rho*dP — smooth through zero head, reversible.`,
    tags: [`gravitydrain`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `Cd`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Discharge coefficient [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `A_d`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Drain flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Liquid density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `HydroTurbine`,
    library: `liquid`,
    summary: `Hydro turbine: shaft power eta·(V̇·ΔP) from the head across it, efficiency from a flow map; the extracted work leaves the stream enthalpy.`,
    tags: [`hydroturbine`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`, `shaft`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Liquid name (e.g. Water, EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Liquid density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the efficiency table, mass flow → η.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsw`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Regularization added to the shaft speed so torque stays finite at rest [rad/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `IceStorageBrine`,
    library: `liquid`,
    summary: `Ice/PCM storage on a brine loop: the latent mass sits behind a UA wall in the brine stream — charge below the melt band, discharge above it.`,
    tags: [`icestoragebrine`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Brine name (e.g. EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Brine-to-ice conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `m`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Mass of the storage medium [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cp_p`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Sensible specific heat of the storage medium [J/kg-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Latent heat of fusion [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Tm`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Melting temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dTm`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Width of the mushy zone [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial storage temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `LiquidCheckValve`,
    library: `liquid`,
    summary: `Check valve: the square-law orifice gated smoothly to forward ΔP only (tanh gate of width eps [Pa]); reverse flow decays to zero, no branch switch.`,
    tags: [`liquidcheckvalve`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `CdA`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Liquid density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Width of the opening transition [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidColdPlate`,
    library: `liquid`,
    summary: `A liquid cold plate cooling an electronics/heat load.`,
    tags: [`liquidcoldplate`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `Q`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Heat input [W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidExpansionTank`,
    library: `liquid`,
    summary: `Expansion tank / degas bottle: pins the loop pressure datum — the one pressure reference every CLOSED coolant loop needs.`,
    tags: [`liquidexpansiontank`, `component`, `liquid`, `acausal`],
    ports: [`port`],
    params: [
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure the tank holds at its port [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidMixer`,
    library: `liquid`,
    summary: `Mixes two single-phase liquid streams.`,
    tags: [`liquidmixer`, `component`, `liquid`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidOrifice`,
    library: `liquid`,
    summary: `A liquid orifice metering flow vs. pressure drop.`,
    tags: [`liquidorifice`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `CdA`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Discharge coefficient × area Cd·A [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: `Model variant — selects the physics body (see Model Variants).`, required: false, values: [`incompressible`, `cavitating`], variants: [], defaultValue: `incompressible` },
      { name: `Pvap`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`cavitating`], defaultValue: `` }
    ],
    variants: [{ name: `incompressible`, requires: [] }, { name: `cavitating`, requires: [`Pvap`] }],
  },
  {
    type: `LiquidPipe`,
    library: `liquid`,
    summary: `A single-phase liquid pipe with frictional pressure drop.`,
    tags: [`liquidpipe`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rough`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Absolute wall roughness [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidPump`,
    library: `liquid`,
    summary: `A single-phase liquid pump.`,
    tags: [`pump`, `liquid-pump-family`, `liquidpump`, `data:eta`, `ports:in-out`, `flow-closed`, `energy-work`, `steady`, `liquid`, `component`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Efficiency (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Pvap`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`npsh`], defaultValue: `` },
      { name: `NPSHr`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`npsh`], defaultValue: `` },
      { name: `eps_n`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`npsh`], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: ``, required: false, values: [`basic`, `npsh`], variants: [], defaultValue: `basic` }
    ],
    variants: [{ name: `basic`, requires: [] }, { name: `npsh`, requires: [`Pvap`, `NPSHr`, `eps_n`] }],
  },
  {
    type: `LiquidPumpMap`,
    library: `liquid`,
    summary: `Head-curve pump: rise from a tabulated head map [m] vs volumetric flow, with the hydraulic inefficiency heating the coolant (out.h mirrors LiquidPump).`,
    tags: [`pump`, `liquid-pump-family`, `liquidpumpmap`, `map`, `data:rho-map`, `ports:in-out`, `flow-closed`, `energy-work`, `steady`, `map-driven`, `liquid`, `component`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Liquid density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Pump efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `map$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the head table, volume flow in m³/s → head in m.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidSink`,
    library: `liquid`,
    summary: `A liquid boundary absorbing a stream.`,
    tags: [`liquidsink`, `component`, `liquid`, `acausal`],
    ports: [`in`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidSource`,
    library: `liquid`,
    summary: `A liquid boundary supplying a stream of set state.`,
    tags: [`liquidsource`, `component`, `liquid`, `acausal`],
    ports: [`out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mdot`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow rate [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidTank`,
    library: `liquid`,
    summary: `Thermal-mass tank (m kg of coolant, perfectly mixed): the outlet leaves at the tank temperature state Tt; a wall heat port exchanges UA·(T_wall − Tt).`,
    tags: [`liquidtank`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Liquid name (e.g. Water, EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `m`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Liquid mass held in the tank [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Tank-to-wall conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial tank temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidThermostat`,
    library: `liquid`,
    summary: `Wax thermostat: the element opens smoothly over a temperature band (Topen ± Tband) sensed on the inlet coolant — the engine warm-up bypass switch, no discrete event.`,
    tags: [`liquidthermostat`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Liquid name (e.g. Water, EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `CdA`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Fully open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Liquid density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Topen`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Opening temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Tband`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Width of the opening transition [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidThreeWayValve`,
    library: `liquid`,
    summary: `Diverting three-way valve: routes fraction u of the inlet to outa, the rest to outb, both at the inlet pressure — the TMS loop-splitting staple.`,
    tags: [`liquidthreewayvalve`, `component`, `liquid`, `acausal`],
    ports: [`in`, `outa`, `outb`],
    params: [
      { name: `u`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fraction of the inflow sent to outa, 0 to 1 [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidVolume`,
    library: `liquid`,
    summary: `A single-phase liquid control volume.`,
    tags: [`liquidvolume`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `kg/Pa`, description: `Hydraulic capacitance, stored mass per unit pressure [kg/Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Reference/initial pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `LiquidWallHX`,
    library: `liquid`,
    summary: `A liquid-to-wall heat exchanger.`,
    tags: [`liquidwallhx`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Overall conductance UA [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `OpenTank`,
    library: `liquid`,
    summary: `Open (vented) tank: level state from the flow imbalance; the inlet sees the free surface (P0), the outlet the gravity head at the base.`,
    tags: [`opentank`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `A_t`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Tank cross-section [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure on the free surface [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Liquid density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L0`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Initial liquid level [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `ThermalStorageTank`,
    library: `liquid`,
    summary: `Stratified thermal-storage tank: three plug-flow nodes top→bottom with inter-node mixing conductance and shell losses; charge enters the top node, draw leaves the bottom at its temperature.`,
    tags: [`thermalstoragetank`, `component`, `liquid`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Liquid name (e.g. Water, EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `m_node`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Liquid mass in each of the three nodes [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cp_f`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Liquid specific heat [J/kg-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA_loss`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Loss conductance of each node to ambient [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T_amb`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Ambient temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `kmix`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Mixing conductance between adjacent nodes [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T10`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial top-node temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T20`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial middle-node temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T30`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial bottom-node temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `liquid` }
    ],
    variants: [],
  },
  {
    type: `BeltDrive`,
    library: `mechanical`,
    summary: `Belt/chain drive: speed ratio with a torque-transfer efficiency (Transmission's translational-free cousin, named for the application).`,
    tags: [`beltdrive`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `ratio`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Speed ratio, ω_a / ω_b [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Transmission efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Brake`,
    library: `mechanical`,
    summary: `Commanded friction brake: clamp fraction from the signal port u scales the capacity, tanh-smooth through zero slip.`,
    tags: [`brake`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`, `u`],
    params: [
      { name: `Tmax`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Braking torque at full command [N-m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Slip-speed smoothing width [rad/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Cam`,
    library: `mechanical`,
    summary: `Cam: rotational-to-translational profile drive.`,
    tags: [`cam`, `component`, `mechanical`, `acausal`],
    ports: [`shaft`, `rod`],
    params: [
      { name: `prof$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the lift table, cam angle in rad → lift in m.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `theta0`, isString: false, isSelector: false, isMap: false, unit: `rad`, description: `Initial cam angle [rad].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `CamFollower`,
    library: `mechanical`,
    summary: `Spring-loaded cam follower: mass held on the profile by a preloaded return spring to ground — pair with Cam for valvetrain/profile-driven kinematics.`,
    tags: [`camfollower`, `component`, `mechanical`, `acausal`],
    ports: [`rod`],
    params: [
      { name: `m`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Follower mass [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `kspring`, isString: false, isSelector: false, isMap: false, unit: `N/m`, description: `Return-spring stiffness [N/m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `x0`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Initial spring deflection [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `v0`, isString: false, isSelector: false, isMap: false, unit: `m/s`, description: `Initial follower velocity [m/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Clutch`,
    library: `mechanical`,
    summary: `A friction clutch coupling/decoupling two rotational shafts.`,
    tags: [`clutch`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `Tmax`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Maximum transmissible torque [N·m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eng`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Engagement fraction (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Slip smoothing speed [rad/s] — regularizes the sign of the slip speed.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ClutchCmd`,
    library: `mechanical`,
    summary: `Signal-commanded clutch: engagement fraction from a signal port \`u\` (u.sig ∈ [0,1]) instead of a fixed \`eng\` parameter — launch/shift schedules.`,
    tags: [`clutchcmd`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`, `u`],
    params: [
      { name: `Tmax`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Transmissible torque at full command [N-m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Slip-speed smoothing width [rad/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `EndStop`,
    library: `mechanical`,
    summary: `Translational end stop at x = gap: spring-damper contact engaged smoothly beyond the gap (penetration hinge + tanh-gated damping).`,
    tags: [`endstop`, `component`, `mechanical`, `acausal`],
    ports: [`port`],
    params: [
      { name: `gap`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Position where contact begins [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: `N/m`, description: `Contact stiffness [N/m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `c`, isString: false, isSelector: false, isMap: false, unit: `N-s/m`, description: `Contact damping [N-s/m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Smoothing width of the contact onset [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `x0`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Initial position [m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ForceSource`,
    library: `mechanical`,
    summary: `A prescribed translational force.`,
    tags: [`forcesource`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `F`, isString: false, isSelector: false, isMap: false, unit: `N`, description: `Force [N].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Freewheel`,
    library: `mechanical`,
    summary: `One-way clutch (freewheel/overrunning sprag): transmits a stiff viscous torque only while the driver overruns the driven side (dw > 0) — the C1 smooth-max hinge of width eps; free in the reverse direction.`,
    tags: [`freewheel`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: `N-m-s`, description: `Torque per unit overrun speed when engaged [N-m-s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Smoothing width of the engagement [rad/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Friction`,
    library: `mechanical`,
    summary: `A friction element opposing motion.`,
    tags: [`friction`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `Fc`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Coulomb (kinetic) friction torque [N·m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Fs`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Static (breakaway) friction torque [N·m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `vs`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Stribeck speed [rad/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `bv`, isString: false, isSelector: false, isMap: false, unit: `N-m-s`, description: `Viscous friction coefficient [N·m·s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Stick–slip smoothing speed [rad/s] — regularizes the sign of the slip speed.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Gear`,
    library: `mechanical`,
    summary: `A gear pair imposing a fixed speed/torque ratio between two shafts.`,
    tags: [`gear`, `component`, `mechanical`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `ratio`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Gear / split ratio.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Inertia`,
    library: `mechanical`,
    summary: `A rotational inertia, τ = J dω/dt.`,
    tags: [`inertia`, `component`, `mechanical`, `acausal`],
    ports: [`port`],
    params: [
      { name: `J`, isString: false, isSelector: false, isMap: false, unit: `kg-m^2`, description: `Inertia [kg·m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `w0`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Natural frequency [rad/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Lever`,
    library: `mechanical`,
    summary: `Ideal lever (translational ratio).`,
    tags: [`lever`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `ratio`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Velocity ratio, v_a / v_b [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `MechGround`,
    library: `mechanical`,
    summary: `The rotational reference (ω = 0).`,
    tags: [`mechground`, `component`, `mechanical`, `acausal`],
    ports: [`port`],
    params: [

    ],
    variants: [],
  },
  {
    type: `Planetary`,
    library: `mechanical`,
    summary: `A planetary gearset relating sun, ring, and carrier speeds.`,
    tags: [`planetary`, `component`, `mechanical`, `acausal`],
    ports: [`sun`, `ring`, `carrier`],
    params: [
      { name: `g`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Ring-to-sun tooth ratio [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `RackPinion`,
    library: `mechanical`,
    summary: `Ideal rack and pinion of pitch radius r.`,
    tags: [`rackpinion`, `component`, `mechanical`, `acausal`],
    ports: [`shaft`, `rod`],
    params: [
      { name: `r`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Pinion pitch radius [m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `RotationalDamper`,
    library: `mechanical`,
    summary: `A rotational viscous damper, τ = c·ω.`,
    tags: [`rotationaldamper`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `c`, isString: false, isSelector: false, isMap: false, unit: `N-m-s`, description: `Rotational damping coefficient [N·m·s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `RotationalSpring`,
    library: `mechanical`,
    summary: `A torsional spring, τ = k·θ.`,
    tags: [`rotationalspring`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Torsional stiffness, torque per radian [N·m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `theta0`, isString: false, isSelector: false, isMap: false, unit: `rad`, description: `Initial angle [rad].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ScrewDrive`,
    library: `mechanical`,
    summary: `Ideal power-conserving screw drive: lead [m/rev] couples rotation to translation (τ·ω + F·v = 0).`,
    tags: [`screwdrive`, `component`, `mechanical`, `acausal`],
    ports: [`shaft`, `rod`],
    params: [
      { name: `lead`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Axial travel per revolution [m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SpeedSource`,
    library: `mechanical`,
    summary: `A prescribed angular velocity.`,
    tags: [`speedsource`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `w`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Frequency [rad/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TorqueSource`,
    library: `mechanical`,
    summary: `A prescribed torque.`,
    tags: [`torquesource`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Applied torque [N·m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TorsionalBacklash`,
    library: `mechanical`,
    summary: `Torsional backlash: a torsional spring dead over ±half of relative wind-up (the C¹ two-hinge deadband, width eps) — gear lash, spline play.`,
    tags: [`torsionalbacklash`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Torsional stiffness, per radian, once the gap closes [N-m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `half`, isString: false, isSelector: false, isMap: false, unit: `rad`, description: `Half of the backlash gap [rad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `rad`, description: `Smoothing width of the gap edges [rad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `theta0`, isString: false, isSelector: false, isMap: false, unit: `rad`, description: `Initial twist [rad].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TransDamper`,
    library: `mechanical`,
    summary: `A translational viscous damper, F = c·v.`,
    tags: [`transdamper`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `c`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Damping coefficient, force per unit speed [kg/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TransGround`,
    library: `mechanical`,
    summary: `The translational reference (v = 0).`,
    tags: [`transground`, `component`, `mechanical`, `acausal`],
    ports: [`port`],
    params: [

    ],
    variants: [],
  },
  {
    type: `TransMass`,
    library: `mechanical`,
    summary: `A translational mass, F = m dv/dt.`,
    tags: [`transmass`, `component`, `mechanical`, `acausal`],
    ports: [`port`],
    params: [
      { name: `m`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Mass [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `v0`, isString: false, isSelector: false, isMap: false, unit: `m/s`, description: `Initial velocity [m/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TransSpring`,
    library: `mechanical`,
    summary: `Translational spring (the missing twin of TransDamper/TransMass).`,
    tags: [`transspring`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`],
    params: [
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: `N/m`, description: `Stiffness [N/m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `x0`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Initial deflection [m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `WheelBrakeThermal`,
    library: `mechanical`,
    summary: `Commanded friction brake with rotor thermal state and temperature fade: friction power heats the rotor mass (convecting hA to ambient) and the available torque derates through a C1 sigmoid above T_fade (fade studies).`,
    tags: [`wheelbrakethermal`, `component`, `mechanical`, `acausal`],
    ports: [`a`, `b`, `u`],
    params: [
      { name: `Tmax`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Braking torque at full command, before fade [N-m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Slip-speed smoothing width [rad/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Rotor heat capacity [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `hA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Rotor-to-ambient conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T_amb`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Ambient temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T_fade`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Rotor temperature where fade sets in [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `k_fade`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fraction of torque lost once fully faded [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_f`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Width of the fade transition [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial rotor temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `AHU`,
    library: `moistair`,
    summary: `Air-handling unit: mixing box + filter + cooling coil + reheat coil + supply fan in one block (all stateless stages, replaceable by editing the source).`,
    tags: [`ahu`, `component`, `moistair`, `acausal`],
    ports: [`ret_in`, `oa_in`, `sup_out`],
    params: [
      { name: `Kf`, isString: false, isSelector: false, isMap: false, unit: `Pa-s^2/kg^2`, description: `Clean-filter resistance, Δp per (mass flow)² [Pa-s^2/kg^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `foul`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Filter fouling multiplier (1 = clean) [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Tc`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Cooling-coil leaving air temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Qh`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Heating-coil duty [W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dPfan`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Fan pressure rise [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_fan`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fan efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `AirFilter`,
    library: `moistair`,
    summary: `Air filter: quadratic loss with a fouling multiplier (foul = 1 clean; scale it up as the filter loads — fan-energy studies).`,
    tags: [`airfilter`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `K`, isString: false, isSelector: false, isMap: false, unit: `Pa-s^2/kg^2`, description: `Clean-filter resistance, Δp per (mass flow)² [Pa-s^2/kg^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `foul`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fouling multiplier (1 = clean) [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `ApparatusDewPointCoil`,
    library: `moistair`,
    summary: `Cooling coil stated the way a designer actually sizes one: by its APPARATUS DEW POINT and its BYPASS FACTOR, not by an imposed leaving temperature.`,
    tags: [`apparatusdewpointcoil`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `T_adp`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Apparatus dew point (\`wet\`) or mean surface temperature (\`dry\`) [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `BF`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Bypass factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: `Variant — \`wet\` (default) or \`dry\`.`, required: false, values: [`wet`, `dry`], variants: [], defaultValue: `wet` }
    ],
    variants: [{ name: `wet`, requires: [] }, { name: `dry`, requires: [] }],
  },
  {
    type: `CabinZone`,
    library: `moistair`,
    summary: `Cabin zone: a perfectly-mixed air volume Vz with temperature and humidity STATES, occupant sensible/moisture loads, a solar/auxiliary heat input, and a wall heat port (couple it to ThermalMass walls or an evaporator AirCoil).`,
    tags: [`cabinzone`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `Vz`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Zone air volume [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial zone temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `W0`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Initial zone humidity ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `n_occ`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Number of occupants [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `q_sens`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Sensible heat per occupant [W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mw_occ`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Moisture release per occupant [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Q_aux`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Other internal sensible gains [W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `ChilledBeam`,
    library: `moistair`,
    summary: `Chilled beam, active or passive.`,
    tags: [`chilledbeam`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Effectiveness against the chilled-water wall temperature [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `CoolingCoil`,
    library: `moistair`,
    summary: `Cools and (below dew point) dehumidifies a humid-air stream.`,
    tags: [`coolingcoil`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `Tout`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Outlet temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `DesiccantWheel`,
    library: `moistair`,
    summary: `Solid desiccant wheel: the process air leaves warmer and drier at near-constant enthalpy, with latent effectiveness against the sorbent equilibrium humidity ratio.`,
    tags: [`desiccantwheel`, `component`, `moistair`, `acausal`],
    ports: [`proc_in`, `proc_out`, `reg_in`, `reg_out`],
    params: [
      { name: `eff_L`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Latent effectiveness toward W_eq [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `W_eq`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Equilibrium humidity ratio of the desiccant [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `f_carry`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fraction of the regeneration enthalpy difference carried into the process air [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `Diffuser`,
    library: `moistair`,
    summary: `Diffuser/recovery section: converts velocity head to static pressure with a recovery efficiency between inlet area A1 and outlet area A2.`,
    tags: [`diffuser`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `A1`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Inlet area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `A2`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Outlet area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_rec`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Static-pressure recovery efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `DOAS`,
    library: `moistair`,
    summary: `Dedicated outdoor air system: recovery wheel, cooling coil sized by apparatus dew point, and reheat, conditioning the VENTILATION air on its own.`,
    tags: [`doas`, `component`, `moistair`, `acausal`],
    ports: [`oa_in`, `sup_out`, `exh_in`, `exh_out`],
    params: [
      { name: `eff_h`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Energy-recovery wheel enthalpy effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eff_w`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Energy-recovery wheel moisture effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T_adp`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Cooling-coil apparatus dew point [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `BF`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Cooling-coil bypass factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Q_reheat`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Reheat-coil duty [W].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Economizer`,
    library: `moistair`,
    summary: `Airside economizer: a mixing box whose outdoor-air fraction is decided by a dry-bulb or enthalpy changeover against the return air and a high limit.`,
    tags: [`economizer`, `component`, `moistair`, `acausal`],
    ports: [`oa_in`, `ret_in`, `mix_out`],
    params: [
      { name: `mdot_sup`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Supply air mass flow [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `f_min`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Minimum outdoor-air fraction [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `lim`, isString: false, isSelector: false, isMap: false, unit: ``, description: `High limit — outdoor dry-bulb temperature in K (\`drybulb\`) or outdoor enthalpy in J/kg (\`enthalpy\`); left untyped because the unit depends on the variant.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `band`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Width of the switching transitions, in the unit of \`lim\`.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: `Variant — \`drybulb\` (default) or \`enthalpy\`.`, required: false, values: [`drybulb`, `enthalpy`], variants: [], defaultValue: `drybulb` }
    ],
    variants: [{ name: `drybulb`, requires: [] }, { name: `enthalpy`, requires: [] }],
  },
  {
    type: `EnthalpyWheel`,
    library: `moistair`,
    summary: `Rotary enthalpy wheel: effectiveness recovery of both enthalpy and moisture between exhaust and supply, with exact water and energy balances on the dry-air basis.`,
    tags: [`enthalpywheel`, `component`, `moistair`, `acausal`],
    ports: [`sup_in`, `sup_out`, `exh_in`, `exh_out`],
    params: [
      { name: `eff_h`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Enthalpy effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eff_w`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Moisture effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `EvaporativeCooler`,
    library: `moistair`,
    summary: `Adiabatic evaporative cooler: constant-enthalpy humidification toward saturation with effectiveness eff (eff=1 reaches the adiabatic-saturation state, W directly from the (h, P, R=1) property call — no implicit outlet temperature to iterate).`,
    tags: [`evaporativecooler`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `eff`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Saturation effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `FaceAndBypassCoil`,
    library: `moistair`,
    summary: `Face-and-bypass coil: the airstream splits at a damper, the face fraction passes over the coil and the rest bypasses it untouched, and the two remix adiabatically downstream.`,
    tags: [`faceandbypasscoil`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `u_face`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fraction of the air sent across the coil face [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Coil effectiveness against the wall temperature [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `FanCoilUnit`,
    library: `moistair`,
    summary: `Fan coil unit: a room terminal that recirculates air through a filter and a wet coil with a blow-through fan, so the fan heat adds to the coil load.`,
    tags: [`fancoilunit`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `K`, isString: false, isSelector: false, isMap: false, unit: `Pa-s^2/kg^2`, description: `Clean-filter resistance, Δp per (mass flow)² [Pa-s^2/kg^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `foul`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Filter fouling multiplier (1 = clean) [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Fan pressure rise [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fan efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Coil effectiveness against the wall temperature [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `FanPoweredBox`,
    library: `moistair`,
    summary: `Fan-powered terminal box.`,
    tags: [`fanpoweredbox`, `component`, `moistair`, `acausal`],
    ports: [`pri_in`, `ind_in`, `out`],
    params: [
      { name: `Q_fan`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Fan heat added to the mixed air [W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Q_reheat`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Reheat-coil duty [W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `HeatingCoil`,
    library: `moistair`,
    summary: `Heats a humid-air stream at constant humidity ratio.`,
    tags: [`heatingcoil`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `Q`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Heat input [W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `HeatPipeWrapAround`,
    library: `moistair`,
    summary: `Heat-pipe wrap-around, and the pumped run-around recuperative loop that is the same idea with a glycol circuit: a PASSIVE loop that takes sensible heat out of the air entering the cooling coil and puts exactly that heat back into the air leaving it.`,
    tags: [`heatpipewraparound`, `component`, `moistair`, `acausal`],
    ports: [`pre_in`, `pre_out`, `re_in`, `re_out`],
    params: [
      { name: `eff`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Sensible effectiveness between precool and reheat streams [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `Humidifier`,
    library: `moistair`,
    summary: `Adds moisture to a humid-air stream, raising its humidity ratio.`,
    tags: [`humidifier`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `mdot_w`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Water/coolant mass flow [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `h_w`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Specific enthalpy of the injected water or steam [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `IndirectDirectEvaporativeCooler`,
    library: `moistair`,
    summary: `Indirect/direct two-stage evaporative cooler.`,
    tags: [`indirectdirectevaporativecooler`, `component`, `moistair`, `acausal`],
    ports: [`pri_in`, `pri_out`, `sec_in`, `sec_out`],
    params: [
      { name: `wbde`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Wet-bulb depression efficiency of the indirect stage [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eff_sec`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Saturation effectiveness of the secondary (wet) stream [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eff_dir`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Saturation effectiveness of the direct stage [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `IndirectEvaporativeCooler`,
    library: `moistair`,
    summary: `Indirect evaporative cooler.`,
    tags: [`indirectevaporativecooler`, `component`, `moistair`, `acausal`],
    ports: [`pri_in`, `pri_out`, `sec_in`, `sec_out`],
    params: [
      { name: `wbde`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Wet-bulb depression efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eff_sec`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Saturation effectiveness of the secondary (wet) stream [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `InductionUnit`,
    library: `moistair`,
    summary: `Induction unit — and the ACTIVE chilled beam, which is the same machine under a newer name.`,
    tags: [`inductionunit`, `component`, `moistair`, `acausal`],
    ports: [`pri_in`, `ind_in`, `out`, `wall`],
    params: [
      { name: `ratio`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Induced-to-primary mass flow ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Coil effectiveness on the induced air against the wall temperature [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `Infiltration`,
    library: `moistair`,
    summary: `Infiltration: pressure-driven leakage path (power-law crack flow, C1-smooth odd law) between two humid-air nodes — zone to ambient, zone to zone.`,
    tags: [`infiltration`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `C_inf`, isString: false, isSelector: false, isMap: false, unit: `kg/s-Pa`, description: `Flow coefficient of the leakage path [kg/s-Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `n_exp`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Flow exponent (0.5 orifice to 1 laminar) [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Regularization of the pressure difference near zero [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `LiquidDesiccantContactor`,
    library: `moistair`,
    summary: `Liquid-desiccant contactor: air contacts a sorbent solution (lithium chloride, lithium bromide, glycol) whose surface water-vapour pressure is set by its CONCENTRATION and TEMPERATURE, not by a wheel position.`,
    tags: [`liquiddesiccantcontactor`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `eff_L`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Latent effectiveness toward W_eq [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `W_eq`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Equilibrium humidity ratio over the solution [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_T`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Thermal effectiveness against the solution temperature (\`cooled\`) [-].`, required: true, values: [], variants: [`cooled`], defaultValue: `` },
      { name: `f_excess`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Dry-bulb gain beyond pure latent-to-sensible conversion, 0.20 to 0.30 (\`adiabatic\`) [-].`, required: true, values: [], variants: [`adiabatic`], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: `Variant — \`cooled\` (default) or \`adiabatic\`.`, required: false, values: [`cooled`, `adiabatic`], variants: [], defaultValue: `cooled` }
    ],
    variants: [{ name: `cooled`, requires: [`eps_T`] }, { name: `adiabatic`, requires: [`f_excess`] }],
  },
  {
    type: `MembraneHumidifier`,
    library: `moistair`,
    summary: `Membrane humidifier: effectiveness exchange of BOTH enthalpy and moisture between a wet (cathode exhaust) and a dry (supply) stream; water and energy balances close exactly on the dry-air basis.`,
    tags: [`membranehumidifier`, `component`, `moistair`, `acausal`],
    ports: [`dry_in`, `dry_out`, `wet_in`, `wet_out`],
    params: [
      { name: `eff_h`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Enthalpy effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eff_w`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Moisture effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `MixingBox`,
    library: `moistair`,
    summary: `Mixes two humid-air streams with flow-weighted enthalpy and humidity ratio.`,
    tags: [`mixingbox`, `component`, `moistair`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `MoistAirDamper`,
    library: `moistair`,
    summary: `Diverting damper: routes fraction u of the air to outa, the rest to outb (both riders carried).`,
    tags: [`moistairdamper`, `component`, `moistair`, `acausal`],
    ports: [`in`, `outa`, `outb`],
    params: [
      { name: `u`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fraction of the inflow sent to outa, 0 to 1 [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `MoistAirDuct`,
    library: `moistair`,
    summary: `Humid-air duct: Darcy friction pressure drop on the total (moist) mass flow; composition and enthalpy pass through.`,
    tags: [`moistairduct`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Hydraulic diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rough`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Absolute wall roughness [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mu_a`, isString: false, isSelector: false, isMap: false, unit: `Pa-s`, description: `Air dynamic viscosity [Pa-s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `MoistAirFan`,
    library: `moistair`,
    summary: `Blower: fixed pressure rise dP with motor+aero inefficiency heating the stream (shaft power = V̇·ΔP/η, all of it ends up in the air).`,
    tags: [`moistairfan`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `dP`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure rise [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fan efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `MoistAirSink`,
    library: `moistair`,
    summary: `A humid-air boundary absorbing a stream.`,
    tags: [`moistairsink`, `component`, `moistair`, `acausal`],
    ports: [`in`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `MoistAirSource`,
    library: `moistair`,
    summary: `A humid-air boundary supplying a stream of set state.`,
    tags: [`moistairsource`, `component`, `moistair`, `acausal`],
    ports: [`out`],
    params: [
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `W`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Humidity ratio, kg water per kg dry air [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mdot`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow rate [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `MoistAirWallHX`,
    library: `moistair`,
    summary: `A humid-air-to-wall heat exchanger.`,
    tags: [`moistairwallhx`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Heat-exchanger effectiveness (0–1), used by the \`eps_t\` variant.`, required: true, values: [], variants: [`eps_t`], defaultValue: `` },
      { name: `NTU`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`ntu_wet`], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: ``, required: false, values: [`eps_t`, `ntu_wet`], variants: [], defaultValue: `eps_t` }
    ],
    variants: [{ name: `eps_t`, requires: [`eps`] }, { name: `ntu_wet`, requires: [`NTU`] }],
  },
  {
    type: `RadiantPanel`,
    library: `moistair`,
    summary: `Radiant panel or chilled ceiling.`,
    tags: [`radiantpanel`, `component`, `moistair`, `acausal`],
    ports: [`zone`, `wall`],
    params: [
      { name: `A`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Panel area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Panel output coefficient [W/m^2-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `n`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Output exponent on the temperature difference [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_dT`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Regularization of the temperature difference near zero [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `W_room`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Room humidity ratio, for the dew-point margin [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P_room`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Room pressure, for the dew-point margin [Pa].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SensibleAirToAirHX`,
    library: `moistair`,
    summary: `Sensible air-to-air exchanger: the shared physics of every sensible-only recovery device.`,
    tags: [`sensibleairtoairhx`, `component`, `moistair`, `acausal`],
    ports: [`sup_in`, `sup_out`, `exh_in`, `exh_out`],
    params: [
      { name: `eff`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Sensible effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eatr`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Exhaust air transfer ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `oacf`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Outdoor air correction factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `SteamHumidifier`,
    library: `moistair`,
    summary: `Steam (isothermal) humidifier.`,
    tags: [`steamhumidifier`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `W_set`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Leaving humidity ratio set point [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `h_steam`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Enthalpy of the injected steam [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `TotalEnergyExchanger`,
    library: `moistair`,
    summary: `Total-energy exchanger in the ASHRAE Standard 84 form: separate sensible and latent effectivenesses plus the EATR and OACF leakage terms.`,
    tags: [`totalenergyexchanger`, `component`, `moistair`, `acausal`],
    ports: [`sup_in`, `sup_out`, `exh_in`, `exh_out`],
    params: [
      { name: `eps_s`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Sensible effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_L`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Latent effectiveness [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eatr`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Exhaust air transfer ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `oacf`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Outdoor air correction factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `VAVBox`,
    library: `moistair`,
    summary: `VAV terminal box: a flow-determining (R) element — the damper command sets the supply flow directly (u in 0..1 of mdot_max) and the reheat command adds coil heat.`,
    tags: [`vavbox`, `component`, `moistair`, `acausal`],
    ports: [`in`, `out`, `u`, `ur`],
    params: [
      { name: `mdot_max`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Air mass flow at full damper command [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Qr_max`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Reheat duty at full reheat command [W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `moistair` }
    ],
    variants: [],
  },
  {
    type: `AnodeRecirc`,
    library: `pneumatic`,
    summary: `Anode recirculation: the supply ejector entrains stack return (H2 loop) — the VacuumEjector law as a named balance-of-plant stage (direct equations).`,
    tags: [`anoderecirc`, `component`, `pneumatic`, `acausal`],
    ports: [`sup_in`, `ret_in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Gas name (e.g. Air, Nitrogen, Hydrogen).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `m^3/s-Pa`, description: `ISO 6358 sonic conductance [m^3/s-Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `b`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `ISO 6358 critical pressure ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `ER`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Entrainment ratio, recirculated per supplied mass flow [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `GasMixer`,
    library: `pneumatic`,
    summary: `Mixes pneumatic gas streams, carrying the species composition rider.`,
    tags: [`gasmixer`, `component`, `pneumatic`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `GasMixerN`,
    library: `pneumatic`,
    summary: `Species-conserving mixer: merges two gas branches, flow-weighting enthalpy and every named species fraction exactly (the junction rule for the E3 multi-species rider).`,
    tags: [`gasmixern`, `component`, `pneumatic`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `GasPipe`,
    library: `pneumatic`,
    summary: `A pneumatic pipe with compressible-flow pressure drop.`,
    tags: [`gaspipe`, `component`, `pneumatic`, `acausal`],
    ports: [`in`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `GasSource`,
    library: `pneumatic`,
    summary: `A boundary supplying gas at set conditions.`,
    tags: [`gassource`, `component`, `pneumatic`, `acausal`],
    ports: [`out`],
    params: [
      { name: `y`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Position / fraction.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mdot`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow rate [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `h0`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Reference enthalpy [J/kg].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `PneumaticActuator`,
    library: `pneumatic`,
    summary: `A pneumatic cylinder/actuator converting pressure to force.`,
    tags: [`pneumaticactuator`, `component`, `pneumatic`, `acausal`],
    ports: [`in`, `rod`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `area`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Area [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Patm`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Atmospheric pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticAtmosphere`,
    library: `pneumatic`,
    summary: `An atmospheric (ambient-pressure) pneumatic boundary.`,
    tags: [`pneumaticatmosphere`, `component`, `pneumatic`, `acausal`],
    ports: [`port`],
    params: [
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticCheckValve`,
    library: `pneumatic`,
    summary: `Pneumatic check valve: ISO 6358 flow gated to forward ΔP.`,
    tags: [`pneumaticcheckvalve`, `component`, `pneumatic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Gas name (e.g. Air, Nitrogen, Hydrogen).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `m^3/s-Pa`, description: `ISO 6358 sonic conductance [m^3/s-Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `b`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `ISO 6358 critical pressure ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Width of the opening transition [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticDoubleActingCylinder`,
    library: `pneumatic`,
    summary: `Double-acting pneumatic cylinder: two isothermal ideal-gas chambers at mid-stroke volumes and the rod force balance.`,
    tags: [`pneumaticdoubleactingcylinder`, `component`, `pneumatic`, `acausal`],
    ports: [`a`, `b`, `rod`],
    params: [
      { name: `Aa`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Piston area on the cap side (port a) [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Ab`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Annulus area on the rod side (port b) [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Specific gas constant [J/kg-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Gas temperature, held isothermal [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Va0`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Chamber volume on side a [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Vb0`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Chamber volume on side b [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Pa0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Initial pressure in chamber a [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Pb0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Initial pressure in chamber b [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticOrifice`,
    library: `pneumatic`,
    summary: `A pneumatic orifice metering flow by ISO 6358 (sonic conductance).`,
    tags: [`pneumaticorifice`, `component`, `pneumatic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `m^3/s-Pa`, description: `Sonic conductance (ISO 6358) [m³/s·Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `b`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Critical pressure ratio / coefficient.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticServoValve`,
    library: `pneumatic`,
    summary: `A pneumatic servo valve with a commanded spool position.`,
    tags: [`pneumaticservovalve`, `component`, `pneumatic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Cmax`, isString: false, isSelector: false, isMap: false, unit: `m^3/s-Pa`, description: `Sonic conductance when fully open (ISO 6358) [m³/s·Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `b`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Critical pressure ratio / coefficient.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `u`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Valve opening, 0 (shut) to 1 (fully open) [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticServoValveCmd`,
    library: `pneumatic`,
    summary: `Signal-commanded servo valve: ISO 6358 flow with the sonic conductance scaled by the spool command u.sig ∈ [0,1] — the closed-loop counterpart of PneumaticServoValve.`,
    tags: [`pneumaticservovalvecmd`, `component`, `pneumatic`, `acausal`],
    ports: [`in`, `out`, `u`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Gas name (e.g. Air, Nitrogen, Hydrogen).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Cmax`, isString: false, isSelector: false, isMap: false, unit: `m^3/s-Pa`, description: `ISO 6358 sonic conductance at full command [m^3/s-Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `b`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `ISO 6358 critical pressure ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticSupply`,
    library: `pneumatic`,
    summary: `A pneumatic pressure supply.`,
    tags: [`pneumaticsupply`, `component`, `pneumatic`, `acausal`],
    ports: [`out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticThermalVolume`,
    library: `pneumatic`,
    summary: `Thermal gas volume: mass AND temperature states with a heat port — the non-isothermal receiver (charge heating, blow-down cooling); pressure from the ideal-gas law.`,
    tags: [`pneumaticthermalvolume`, `component`, `pneumatic`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Gas name (e.g. Air, Nitrogen, Hydrogen).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Specific gas constant [J/kg-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cv`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Specific heat at constant volume [J/kg-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cp`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Specific heat at constant pressure [J/kg-K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `m0`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Initial gas mass [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial gas temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticValve32`,
    library: `pneumatic`,
    summary: `3/2 directional valve: the spool command u blends supply->work (u·C) against work->exhaust ((1-u)·C), both ISO 6358 paths — u=1 pressurizes, u=0 vents.`,
    tags: [`pneumaticvalve32`, `component`, `pneumatic`, `acausal`],
    ports: [`sup_in`, `work`, `exh_out`, `u`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Gas name (e.g. Air, Nitrogen, Hydrogen).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `m^3/s-Pa`, description: `ISO 6358 sonic conductance [m^3/s-Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `b`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `ISO 6358 critical pressure ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticValve52`,
    library: `pneumatic`,
    summary: `5/2 directional valve: u=1 routes supply->A and B->exhaust; u=0 routes supply->B and A->exhaust (four ISO 6358 paths, complementary commands).`,
    tags: [`pneumaticvalve52`, `component`, `pneumatic`, `acausal`],
    ports: [`sup_in`, `wa`, `wb`, `ea_out`, `eb_out`, `u`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Gas name (e.g. Air, Nitrogen, Hydrogen).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `m^3/s-Pa`, description: `ISO 6358 sonic conductance [m^3/s-Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `b`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `ISO 6358 critical pressure ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `PneumaticVolume`,
    library: `pneumatic`,
    summary: `A pneumatic control volume (compressible capacitance).`,
    tags: [`pneumaticvolume`, `component`, `pneumatic`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Specific gas constant [J/kg·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Reference/initial pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `VacuumEjector`,
    library: `pneumatic`,
    summary: `Vacuum ejector: motive ISO 6358 flow entrains ER times its mass flow from the suction port; mass and energy mix exactly at the exhaust.`,
    tags: [`vacuumejector`, `component`, `pneumatic`, `acausal`],
    ports: [`sup_in`, `suc_in`, `exh_out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Gas name (e.g. Air, Nitrogen, Hydrogen).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `m^3/s-Pa`, description: `ISO 6358 sonic conductance [m^3/s-Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `b`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `ISO 6358 critical pressure ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `ER`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Entrainment ratio, suction per supply mass flow [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `gas` }
    ],
    variants: [],
  },
  {
    type: `AutomaticTransmission`,
    library: `powertrain`,
    summary: `Automatic transmission: torque converter + scheduled gearbox + a commanded lockup clutch bridging pump and turbine (lock = 0 open, 1 locked).`,
    tags: [`automatictransmission`, `component`, `powertrain`, `acausal`],
    ports: [`in`, `out`, `gear`, `lock`],
    params: [
      { name: `Kmap$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the capacity-factor table, speed ratio → K = ω_pump/√τ_pump.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `TRmap$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the torque-ratio table, speed ratio → τ_turbine/τ_pump.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Gearbox efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Tlock`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Lock-up clutch torque capacity at full command [N-m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Lock-up clutch slip-speed smoothing width [rad/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `CatalystLightOff`,
    library: `powertrain`,
    summary: `Catalyst light-off: brick thermal mass heated by the exhaust stream (effectiveness-free UA link) plus the exotherm of converted feed once the brick passes light-off; conversion is a C1 sigmoid in brick temperature.`,
    tags: [`catalystlightoff`, `component`, `powertrain`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Exhaust gas name (e.g. Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Brick heat capacity [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Gas-to-brick conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T50`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Light-off temperature, 50 % conversion [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Width of the light-off transition [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `q_exo`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Exotherm released per kilogram of exhaust at full conversion [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial brick temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Differential`,
    library: `powertrain`,
    summary: `Open differential: splits torque evenly, averages speeds through the final ratio (power-conserving).`,
    tags: [`differential`, `component`, `powertrain`, `acausal`],
    ports: [`in`, `left`, `right`],
    params: [
      { name: `ratio`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Final-drive ratio, input speed over mean wheel speed [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `DriveCycleSource`,
    library: `powertrain`,
    summary: `Drive-cycle source: imposes a tabulated speed trace v = map$(t) on a translational port (WLTP, NEDC, any TABLE over time).`,
    tags: [`drivecyclesource`, `component`, `powertrain`, `acausal`],
    ports: [`port`],
    params: [
      { name: `map$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the TABLE or FUNCTION mapping time in s to vehicle speed in m/s.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Engine`,
    library: `powertrain`,
    summary: `An internal-combustion engine acting as a torque source.`,
    tags: [`engine`, `component`, `powertrain`, `acausal`],
    ports: [`shaft`],
    params: [
      { name: `Tmax`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Maximum (full-throttle) torque [N·m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `throttle`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Throttle (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `bf`, isString: false, isSelector: false, isMap: false, unit: `N-m-s`, description: `Viscous friction coefficient [N·m·s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ExhaustPipeThermal`,
    library: `powertrain`,
    summary: `Exhaust pipe with thermal wall: gas duct exchanging with a two-node RC wall whose outer face convects (hA) to the ambient heat port (underhood soak studies).`,
    tags: [`exhaustpipethermal`, `component`, `powertrain`, `acausal`],
    ports: [`in`, `out`, `amb`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Exhaust gas name (e.g. Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Gas-to-wall conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `hA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Outer-wall-to-ambient conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C1`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Heat capacity of the inner wall node [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C2`, isString: false, isSelector: false, isMap: false, unit: `J/K`, description: `Heat capacity of the outer wall node [J/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `K/W`, description: `Conduction resistance through the wall [K/W].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T10`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial inner-wall temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T20`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Initial outer-wall temperature [K].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `GearboxScheduled`,
    library: `powertrain`,
    summary: `Scheduled gearbox: the ratio arrives on a signal port (a shift schedule via SigMap on speed, or any command source); torque transfer with efficiency.`,
    tags: [`gearboxscheduled`, `component`, `powertrain`, `acausal`],
    ports: [`in`, `out`, `u`],
    params: [
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Gearbox efficiency; the ratio arrives on the signal port u [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `GradeProfile`,
    library: `powertrain`,
    summary: `Road grade vs distance: the travelled distance integrates from the vehicle speed and the grade (rad) is looked up from a profile TABLE over distance — hilly-route load without scripting time profiles.`,
    tags: [`gradeprofile`, `component`, `powertrain`, `acausal`],
    ports: [`port`],
    params: [
      { name: `m`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Vehicle mass [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `g`, isString: false, isSelector: false, isMap: false, unit: `m/s^2`, description: `Gravitational acceleration [m/s^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `map$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the TABLE or FUNCTION mapping distance in m to grade angle in rad.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `s0`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Initial distance along the route [m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `GradeRoadLoad`,
    library: `powertrain`,
    summary: `A vehicle road load including the road-grade contribution.`,
    tags: [`graderoadload`, `component`, `powertrain`, `acausal`],
    ports: [`shaft`],
    params: [
      { name: `Crr`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Rolling-resistance coefficient [N·m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Caero`, isString: false, isSelector: false, isMap: false, unit: `kg-m^2`, description: `Aerodynamic drag term ½ρCdA [kg·m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `m`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Mass [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `g`, isString: false, isSelector: false, isMap: false, unit: `m/s^2`, description: `Gravitational acceleration [m/s²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `grade`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Road grade (rise/run).`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `HybridPowerSplit`,
    library: `powertrain`,
    summary: `Power-split e-CVT: planetary with the engine on the carrier, MG1 on the sun (speeder) and MG2 on the ring/output (torquer), both motors on one DC bus.`,
    tags: [`hybridpowersplit`, `component`, `powertrain`, `acausal`],
    ports: [`eng`, `out`, `sun`, `p`, `n`, `u1`, `u2`, `heat`],
    params: [
      { name: `g`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Planetary ring-to-sun tooth ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eff1$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the MG1 efficiency table, (ω, τ) → η.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eff2$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the MG2 efficiency table, (ω, τ) → η.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsP`, isString: false, isSelector: false, isMap: false, unit: `W`, description: `Smoothing width of the motor/generator switch [W].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `MeanValueEngine`,
    library: `powertrain`,
    summary: `A mean-value engine model (cycle-averaged torque and flows).`,
    tags: [`meanvalueengine`, `component`, `powertrain`, `acausal`],
    ports: [`shaft`],
    params: [
      { name: `throttle`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Throttle (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Tpeak`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Peak wide-open-throttle torque [N·m].`, required: true, values: [], variants: [`parabolic`, `chenflynn`], defaultValue: `` },
      { name: `w_peak`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Peak frequency [rad/s].`, required: true, values: [], variants: [`parabolic`, `chenflynn`], defaultValue: `` },
      { name: `FMEP_a`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Constant friction torque [N·m].`, required: true, values: [], variants: [`parabolic`, `wotmap`, `bsfc`, `chenflynn`], defaultValue: `` },
      { name: `FMEP_b`, isString: false, isSelector: false, isMap: false, unit: `N-m-s`, description: `Speed-proportional friction coefficient [N·m·s].`, required: true, values: [], variants: [`parabolic`, `wotmap`, `bsfc`, `chenflynn`], defaultValue: `` },
      { name: `FMEP_c`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`chenflynn`], defaultValue: `` },
      { name: `map_wot$`, isString: true, isSelector: false, isMap: true, unit: ``, description: ``, required: true, values: [], variants: [`wotmap`, `bsfc`], defaultValue: `` },
      { name: `bsfc$`, isString: true, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`bsfc`], defaultValue: `` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: ``, required: false, values: [`parabolic`, `wotmap`, `bsfc`, `chenflynn`], variants: [], defaultValue: `parabolic` }
    ],
    variants: [{ name: `parabolic`, requires: [`Tpeak`, `w_peak`, `FMEP_a`, `FMEP_b`] }, { name: `wotmap`, requires: [`map_wot$`, `FMEP_a`, `FMEP_b`] }, { name: `bsfc`, requires: [`map_wot$`, `bsfc$`, `FMEP_a`, `FMEP_b`] }, { name: `chenflynn`, requires: [`Tpeak`, `w_peak`, `FMEP_a`, `FMEP_b`, `FMEP_c`] }],
  },
  {
    type: `QuarterCar`,
    library: `powertrain`,
    summary: `Quarter-car suspension: sprung/unsprung masses, suspension spring+damper, tire stiffness — a composite of the translational primitives; excite \`road\` with a speed source or drive-cycle profile.`,
    tags: [`quartercar`, `component`, `powertrain`, `acausal`],
    ports: [`road`],
    params: [
      { name: `ms`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Sprung mass [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mu`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Unsprung mass [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `ks`, isString: false, isSelector: false, isMap: false, unit: `N/m`, description: `Suspension stiffness [N/m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cs`, isString: false, isSelector: false, isMap: false, unit: `N-s/m`, description: `Suspension damping [N-s/m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `kt`, isString: false, isSelector: false, isMap: false, unit: `N/m`, description: `Tyre vertical stiffness [N/m].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `RoadLoad`,
    library: `powertrain`,
    summary: `A vehicle road load (aerodynamic drag + rolling resistance).`,
    tags: [`roadload`, `component`, `powertrain`, `acausal`],
    ports: [`shaft`],
    params: [
      { name: `Crr`, isString: false, isSelector: false, isMap: false, unit: `N-m`, description: `Rolling-resistance coefficient [N·m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Caero`, isString: false, isSelector: false, isMap: false, unit: `kg-m^2`, description: `Aerodynamic drag term ½ρCdA [kg·m²].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TireLongitudinal`,
    library: `powertrain`,
    summary: `Longitudinal tire (Pacejka-lite magic formula on longitudinal slip): bridges the wheel (rotational) to the vehicle (translational).`,
    tags: [`tirelongitudinal`, `component`, `powertrain`, `acausal`],
    ports: [`wheel`, `veh`],
    params: [
      { name: `r`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Rolling radius [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Fz`, isString: false, isSelector: false, isMap: false, unit: `N`, description: `Normal load [N].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `B`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Magic-formula stiffness factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Magic-formula shape factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Peak friction coefficient [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsv`, isString: false, isSelector: false, isMap: false, unit: `m/s`, description: `Regularization of the slip denominator at standstill [m/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TirePacejka`,
    library: `powertrain`,
    summary: `Full Pacejka magic formula on longitudinal slip (B stiffness, C shape, D peak, E curvature) — the fidelity rung above TireLongitudinal, which is recovered exactly at E = 0.`,
    tags: [`tirepacejka`, `component`, `powertrain`, `acausal`],
    ports: [`wheel`, `veh`],
    params: [
      { name: `r`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Rolling radius [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Fz`, isString: false, isSelector: false, isMap: false, unit: `N`, description: `Normal load [N].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `B`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Magic-formula stiffness factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Magic-formula shape factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Peak friction coefficient [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `E`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Magic-formula curvature factor [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsv`, isString: false, isSelector: false, isMap: false, unit: `m/s`, description: `Regularization of the slip denominator at standstill [m/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TorqueConverter`,
    library: `powertrain`,
    summary: `Torque converter (K-factor form): pump torque (ω_p/K(SR))², torque ratio TR(SR), SR = ω_turbine/ω_pump — both from 1-D TABLEs of the converter sheet.`,
    tags: [`torqueconverter`, `component`, `powertrain`, `acausal`],
    ports: [`pump`, `turb`],
    params: [
      { name: `Kmap$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the capacity-factor table, speed ratio → K = ω_pump/√τ_pump.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `TRmap$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the torque-ratio table, speed ratio → τ_turbine/τ_pump.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `Transmission`,
    library: `powertrain`,
    summary: `A gearbox/transmission imposing a ratio between engine and wheels.`,
    tags: [`transmission`, `component`, `powertrain`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `ratio`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Gear / split ratio.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Efficiency (0–1).`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `VehicleBody`,
    library: `powertrain`,
    summary: `Longitudinal vehicle body: mass with aero drag, rolling resistance (tanh-signed) and grade load; velocity is the state.`,
    tags: [`vehiclebody`, `component`, `powertrain`, `acausal`],
    ports: [`port`],
    params: [
      { name: `m`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Vehicle mass [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Cd`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Aerodynamic drag coefficient [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Af`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Frontal area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rhoA`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Air density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Crr`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Rolling-resistance coefficient [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `grade`, isString: false, isSelector: false, isMap: false, unit: `rad`, description: `Road grade angle [rad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `v0`, isString: false, isSelector: false, isMap: false, unit: `m/s`, description: `Initial speed [m/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `WindRotor`,
    library: `powertrain`,
    summary: `Wind rotor: Cp(λ, pitch) from a 2-D map turns the swept-area wind power into shaft torque; tip-speed ratio and torque are eps-regularized at rest.`,
    tags: [`windrotor`, `component`, `powertrain`, `acausal`],
    ports: [`shaft`, `wind`, `pitch`],
    params: [
      { name: `rho`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Air density [kg/m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `R`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Rotor radius [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cp$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Name of the power-coefficient table, (tip-speed ratio, pitch) → Cp.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsv`, isString: false, isSelector: false, isMap: false, unit: `m/s`, description: `Regularization added to the wind speed [m/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `epsw`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Regularization added to the shaft speed [rad/s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigAbs`,
    library: `signal`,
    summary: `Absolute value of the input signal, |in|.`,
    tags: [`sigabs`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigBias`,
    library: `signal`,
    summary: `Adds a constant offset b to the input signal.`,
    tags: [`sigbias`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `b`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Offset added to the input, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigConstant`,
    library: `signal`,
    summary: `Constant signal source of value k.`,
    tags: [`sigconstant`, `component`, `signal`, `acausal`],
    ports: [`out`],
    params: [
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Output value, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigDeadband`,
    library: `signal`,
    summary: `Symmetric deadband of half-width w: zero inside ±w, unity-slope outside — the C¹ smooth composition of a positive and a negative hinge (width eps).`,
    tags: [`sigdeadband`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `w`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Half-width of the dead zone, in the input’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Smoothing width of the hinges, in the input’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigDerivative`,
    library: `signal`,
    summary: `Filtered derivative s/(1+τs): exact derivative in the limit τ→0, realizable (proper) for τ>0.`,
    tags: [`sigderivative`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `tau`, isString: false, isSelector: false, isMap: false, unit: `s`, description: `Derivative filter time constant [s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `y0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial filter state, in the input’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigDiff`,
    library: `signal`,
    summary: `Difference in1 − in2 (the feedback comparator: connect the setpoint to in1, the measurement to in2).`,
    tags: [`sigdiff`, `component`, `signal`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigDivide`,
    library: `signal`,
    summary: `Quotient of two signals, in1 / in2.`,
    tags: [`sigdivide`, `component`, `signal`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigFirstOrder`,
    library: `signal`,
    summary: `First-order lag 1/(1+τs).`,
    tags: [`sigfirstorder`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `tau`, isString: false, isSelector: false, isMap: false, unit: `s`, description: `Time constant [s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `y0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial output, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigGain`,
    library: `signal`,
    summary: `Multiplies the input signal by a constant gain k.`,
    tags: [`siggain`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `k`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Gain, output per unit input.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigIntegrator`,
    library: `signal`,
    summary: `Integrates the input signal over time from the initial value y0.`,
    tags: [`sigintegrator`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `y0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial output, in the output’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigLeadLag`,
    library: `signal`,
    summary: `Lead-lag (1+T1·s)/(1+T2·s), the classical compensator.`,
    tags: [`sigleadlag`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `T1`, isString: false, isSelector: false, isMap: false, unit: `s`, description: `Lead (numerator) time constant [s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T2`, isString: false, isSelector: false, isMap: false, unit: `s`, description: `Lag (denominator) time constant [s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `y0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial state, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigMap`,
    library: `signal`,
    summary: `1-D lookup: sig = map$(in).`,
    tags: [`sigmap`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `map$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the TABLE or FUNCTION mapping the input to the output.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigMap2`,
    library: `signal`,
    summary: `2-D lookup: sig = map$(in1, in2) on a curve-family TABLE (\`TABLE name(x : y = y1, y2, …)\`) — a torque map, a compressor map slice.`,
    tags: [`sigmap2`, `component`, `signal`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [
      { name: `map$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the TABLE or FUNCTION of two arguments, (in1, in2) → out.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigMax`,
    library: `signal`,
    summary: `Larger of two signals, max(in1, in2).`,
    tags: [`sigmax`, `component`, `signal`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigMin`,
    library: `signal`,
    summary: `Smaller of two signals, min(in1, in2).`,
    tags: [`sigmin`, `component`, `signal`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigPID`,
    library: `signal`,
    summary: `PID controller on the (sp − pv) error with an integrator state and a realizable filtered derivative (filter τ).`,
    tags: [`sigpid`, `component`, `signal`, `acausal`],
    ports: [`sp`, `pv`, `out`],
    params: [
      { name: `Kp`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Proportional gain, output per unit error.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Ki`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Integral gain, output per unit error per second.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Kd`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Derivative gain, output per unit error rate.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `tau`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Derivative filter time constant, in seconds; untyped because the gains carry the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `i0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial integral of the error.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `d0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial derivative-filter state, in the error’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: `Variant — \`basic\` (default) or \`clamped\`, which also requires \`umin\`, \`umax\` and the anti-windup reset time \`Taw\` in seconds.`, required: false, values: [`basic`, `clamped`], variants: [], defaultValue: `basic` },
      { name: `umin`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`clamped`], defaultValue: `` },
      { name: `umax`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`clamped`], defaultValue: `` },
      { name: `Taw`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`clamped`], defaultValue: `` }
    ],
    variants: [{ name: `basic`, requires: [] }, { name: `clamped`, requires: [`umin`, `umax`, `Taw`] }],
  },
  {
    type: `SigProduct`,
    library: `signal`,
    summary: `Product of two signals, in1 · in2.`,
    tags: [`sigproduct`, `component`, `signal`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigPulse`,
    library: `signal`,
    summary: `Single rectangular pulse from t0 for \`width\` seconds, level \`low\`→\`high\`, with tanh edges of width eps.`,
    tags: [`sigpulse`, `component`, `signal`, `acausal`],
    ports: [`out`],
    params: [
      { name: `t0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Pulse start time, in seconds of \`time\`.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `width`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Pulse duration, in seconds of \`time\`.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `high`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Level during the pulse, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `low`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Level outside the pulse, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Edge smoothing width, in seconds of \`time\`.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigRamp`,
    library: `signal`,
    summary: `Ramp of the given slope starting at t0 (C¹ smooth-max hinge of width eps).`,
    tags: [`sigramp`, `component`, `signal`, `acausal`],
    ports: [`out`],
    params: [
      { name: `t0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Ramp start time, in seconds of \`time\`.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `slope`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Ramp rate, in the signal’s units per second.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Smoothing width of the hinge at t0, in seconds of \`time\`.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigRateLimiter`,
    library: `signal`,
    summary: `Rate limiter: tracks the input with slope bounded to ±rate (tanh-smooth; tau [s] is the tracking time constant inside the linear zone).`,
    tags: [`sigratelimiter`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `rate`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Maximum rate of change, in the signal’s units per second.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `tau`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Tracking time constant inside the linear zone, in seconds; untyped because \`rate\` carries the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `y0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial output, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigRelay`,
    library: `signal`,
    summary: `Smooth relay/comparator: \`low\` below the threshold, \`high\` above it, with a tanh transition of width eps.`,
    tags: [`sigrelay`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `thresh`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Switching threshold, in the input’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `low`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Output below the threshold.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `high`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Output above the threshold.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Width of the transition, in the input’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigSaturation`,
    library: `signal`,
    summary: `Clamps the input signal to the range [lo, hi].`,
    tags: [`sigsaturation`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `lo`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Lower limit, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `hi`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Upper limit, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigSecondOrder`,
    library: `signal`,
    summary: `Second-order tracking filter ωn²/(s² + 2ζωn·s + ωn²).`,
    tags: [`sigsecondorder`, `component`, `signal`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `wn`, isString: false, isSelector: false, isMap: false, unit: `rad/s`, description: `Natural frequency [rad/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `zeta`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Damping ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `y0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial output, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `v0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial output rate, in the signal’s units per second.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigSine`,
    library: `signal`,
    summary: `Sine: bias + amp·sin(2π·freq·t + phase).`,
    tags: [`sigsine`, `component`, `signal`, `acausal`],
    ports: [`out`],
    params: [
      { name: `amp`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Amplitude, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `freq`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Frequency in hertz; left untyped so a steady document may pin a bare \`time\`.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `phase`, isString: false, isSelector: false, isMap: false, unit: `rad`, description: `Phase offset [rad].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `bias`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Mean value, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigSpeedProbe`,
    library: `signal`,
    summary: `Shaft-speed probe (torque-free).`,
    tags: [`sigspeedprobe`, `component`, `signal`, `acausal`],
    ports: [`shaft`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigStep`,
    library: `signal`,
    summary: `Smooth step from \`before\` to \`after\` at t0.`,
    tags: [`sigstep`, `component`, `signal`, `acausal`],
    ports: [`out`],
    params: [
      { name: `t0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Step time, in seconds of \`time\`.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `before`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Level before the step, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `after`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Level after the step, in the signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Edge smoothing width, in seconds of \`time\`.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigSum`,
    library: `signal`,
    summary: `Sum of two signals, in1 + in2.`,
    tags: [`sigsum`, `component`, `signal`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigSwitch`,
    library: `signal`,
    summary: `Smooth 2-way switch: routes in1 when ctrl > thresh, in2 below, blended over a tanh width eps.`,
    tags: [`sigswitch`, `component`, `signal`, `acausal`],
    ports: [`in1`, `in2`, `ctrl`, `out`],
    params: [
      { name: `thresh`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Control level above which in1 is routed, in the control signal’s units.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Width of the blend, in the control signal’s units.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigTable`,
    library: `signal`,
    summary: `Tabulated source: sig = map$(time).`,
    tags: [`sigtable`, `component`, `signal`, `acausal`],
    ports: [`out`],
    params: [
      { name: `map$`, isString: true, isSelector: false, isMap: true, unit: ``, description: `Name of the TABLE or FUNCTION mapping time to the output.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `SigThermalProbe`,
    library: `signal`,
    summary: `Temperature probe: reads the heat-node temperature onto a signal wire, drawing no heat.`,
    tags: [`sigthermalprobe`, `component`, `signal`, `acausal`],
    ports: [`port`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigTime`,
    library: `signal`,
    summary: `The clock: emits the simulation time itself.`,
    tags: [`sigtime`, `component`, `signal`, `acausal`],
    ports: [`out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SigVelProbe`,
    library: `signal`,
    summary: `Translational velocity probe (force-free).`,
    tags: [`sigvelprobe`, `component`, `signal`, `acausal`],
    ports: [`port`, `out`],
    params: [

    ],
    variants: [],
  },
  {
    type: `SupervisoryECMS`,
    library: `signal`,
    summary: `ECMS-lite torque-split supervisor: a C1 blend between engine-lean and motor-lean operation driven by battery SOC around its reference — an honest smooth surrogate for the argmin equivalence-cost rule (documented as such).`,
    tags: [`supervisoryecms`, `component`, `signal`, `acausal`],
    ports: [`soc`, `dem`, `eng`, `mot`],
    params: [
      { name: `soc_ref`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Reference state of charge [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Width of the blend around soc_ref [-].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `ZoneCO2`,
    library: `signal`,
    summary: `Zone CO2 / IAQ balance (well-mixed): ventilation dilutes toward the ambient concentration while occupants generate.`,
    tags: [`zoneco2`, `component`, `signal`, `acausal`],
    ports: [`vent`, `occ`, `out`],
    params: [
      { name: `Vz`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Zone air volume [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `c_amb`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Ambient concentration, e.g. ppm or kg/m³.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `gen_occ`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Generation per occupant, in concentration × m³/s.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `c0`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Initial zone concentration, in the unit of c_amb.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `BlendMixer`,
    library: `twophase`,
    summary: `A gas-blend (mixture) mixing junction carrying the species rider.`,
    tags: [`blendmixer`, `component`, `twophase`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `BlendSensor`,
    library: `twophase`,
    summary: `A sensor reading the state of a gas-blend stream.`,
    tags: [`blendsensor`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `BlendSink`,
    library: `twophase`,
    summary: `A boundary absorbing a gas-blend stream.`,
    tags: [`blendsink`, `component`, `twophase`, `acausal`],
    ports: [`in`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `BlendSource`,
    library: `twophase`,
    summary: `A boundary supplying a gas-blend stream of set composition.`,
    tags: [`blendsource`, `component`, `twophase`, `acausal`],
    ports: [`out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mdot`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow rate [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `x`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Vapor quality / fraction (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `z`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Overall (feed) composition carried by the stream [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `BoilingVessel`,
    library: `twophase`,
    summary: `A rigid vessel boiling a two-phase fluid (rigid two-phase boil-off).`,
    tags: [`boilingvessel`, `component`, `twophase`, `acausal`],
    ports: [`vent`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `m0`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Initial mass [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T0`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Reference/initial temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `CapillaryTube`,
    library: `twophase`,
    summary: `Capillary tube: the empirical power-law rating m = C·ΔP_eff^n (n ≈ 0.5), with the same flashing choke as the short tube (ΔP_eff clamps at the upstream saturation pressure).`,
    tags: [`capillarytube`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow at a 1 Pa effective pressure difference [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `n`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Exponent on the effective pressure difference [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `EjectorMomentum`,
    library: `twophase`,
    summary: `Momentum-based two-phase ejector: the motive stream expands (nozzle efficiency) to the suction pressure, momentum-mixes with the entrained stream at constant area, and the mixed velocity head recovers as the diffuser lift.`,
    tags: [`ejectormomentum`, `component`, `twophase`, `acausal`],
    ports: [`mot_in`, `suc_in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_n`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Motive-nozzle isentropic efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta_m`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Mixing momentum efficiency [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `FewCellCondenser`,
    library: `twophase`,
    summary: `Packaged 3-cell condenser: the same private-state C-R chain (heat leaves through the walls when they run colder than the refrigerant).`,
    tags: [`fewcellcondenser`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `w1`, `w2`, `w3`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Refrigerant volume of each of the three cells [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Cc`, isString: false, isSelector: false, isMap: false, unit: `kg/Pa`, description: `Mass capacitance of each cell [kg/Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Wall conductance of each cell [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Kv`, isString: false, isSelector: false, isMap: false, unit: `kg/s-Pa`, description: `Flow conductance between adjacent cells [kg/s-Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Initial pressure of every cell [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `h0`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Initial enthalpy of every cell [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `FewCellEvaporator`,
    library: `twophase`,
    summary: `Packaged 3-cell evaporator: three well-mixed cells with their own pressure and enthalpy states, inter-cell conductances and a wall port per cell.`,
    tags: [`fewcellevaporator`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `w1`, `w2`, `w3`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Refrigerant volume of each of the three cells [m^3].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Cc`, isString: false, isSelector: false, isMap: false, unit: `kg/Pa`, description: `Mass capacitance of each cell [kg/Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Wall conductance of each cell [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Kv`, isString: false, isSelector: false, isMap: false, unit: `kg/s-Pa`, description: `Flow conductance between adjacent cells [kg/s-Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Initial pressure of every cell [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `h0`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Initial enthalpy of every cell [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `FlashTank`,
    library: `twophase`,
    summary: `Flash tank / economizer separator: splits a two-phase inlet into saturated liquid and saturated vapor streams at the tank pressure, conserving mass and energy (the split ratio IS the inlet quality).`,
    tags: [`flashtank`, `component`, `twophase`, `acausal`],
    ports: [`in`, `liq`, `vap`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `GasCooler`,
    library: `twophase`,
    summary: `Transcritical gas cooler: supercritical single-phase cooling against a wall (no saturation clamp — the R744 high side has none); effectiveness on the local cp, LiquidWallHX sign conventions.`,
    tags: [`gascooler`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Refrigerant-to-wall conductance [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure drop [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `MovingBoundaryCondenser`,
    library: `twophase`,
    summary: `A moving-boundary condenser tracking the two-phase/subcooled zone lengths.`,
    tags: [`movingboundarycondenser`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `U_cond`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Condenser-zone overall coefficient [W/m²·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `U_sc`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Subcool-zone overall coefficient [W/m²·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_zone`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Zone-collapse smoothing width [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `MovingBoundaryEvaporator`,
    library: `twophase`,
    summary: `A moving-boundary evaporator tracking the two-phase/superheat zone lengths.`,
    tags: [`movingboundaryevaporator`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `U_tp`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Two-phase-zone overall coefficient [W/m²·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `U_sh`, isString: false, isSelector: false, isMap: false, unit: `W/m^2-K`, description: `Superheat-zone overall coefficient [W/m²·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps_zone`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Zone-collapse smoothing width [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `OilSeparator`,
    library: `twophase`,
    summary: `Oil separator: bleeds a mass fraction f off the discharge line as saturated liquid (the oil-rich film) back toward the compressor sump; the main stream's enthalpy follows from the exact energy balance.`,
    tags: [`oilseparator`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `bleed`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `f`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fraction of the inflow bled off as saturated liquid [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `ProportionalReliefValve`,
    library: `twophase`,
    summary: `A pressure-relief valve whose opening rises proportionally above the set pressure.`,
    tags: [`proportionalreliefvalve`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Pcrack`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Cracking (relief) pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `grad`, isString: false, isSelector: false, isMap: false, unit: `kg/s-Pa`, description: `Flow gain above the set pressure [kg/s·Pa]: ṁ ≈ grad · (P − Pcrack).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Smoothing width [Pa] of the max(0, P − Pcrack) regularization.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `ReversingValve`,
    library: `twophase`,
    summary: `Four-way reversing valve (heat pump mode switch).`,
    tags: [`reversingvalve`, `component`, `twophase`, `acausal`],
    ports: [`d`, `s`, `i`, `o`],
    params: [
      { name: `mode`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Valve position, 0 for cooling and 1 for heating [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `SteamReliefValve`,
    library: `twophase`,
    summary: `A steam relief valve venting above the set pressure.`,
    tags: [`steamreliefvalve`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `A`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Area [m²].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Pset`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Set pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Cd`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Discharge coefficient.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `kgas`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Gas specific-heat ratio.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Rgas`, isString: false, isSelector: false, isMap: false, unit: `J/kg-K`, description: `Specific gas constant [J/kg·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Opening smoothing width [Pa] — the tanh transition around \`Pset\`.`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `SuctionAccumulator`,
    library: `twophase`,
    summary: `Suction accumulator: traps liquid carryover and delivers SATURATED VAPOR to the compressor.`,
    tags: [`suctionaccumulator`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `m0`, isString: false, isSelector: false, isMap: false, unit: `kg`, description: `Initial liquid inventory [kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `ThreeZoneHX`,
    library: `twophase`,
    summary: `A three-zone (subcooled / two-phase / superheat) heat exchanger.`,
    tags: [`threezonehx`, `component`, `twophase`, `acausal`],
    ports: [`hot_in`, `hot_out`, `cold_in`, `cold_out`],
    params: [
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Overall conductance UA [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `hot$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Hot-side fluid name (e.g. Water).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `cold$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Cold-side fluid name (e.g. EG50).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `arr$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Flow arrangement (passed to hx_effectiveness) — one of \`counterflow\`, \`parallel\`.`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TranscriticalBackPressureValve`,
    library: `twophase`,
    summary: `Transcritical back-pressure valve: signal-commanded high-side pressure control (CO2 cycles) — commanded-area odd-symmetric square law.`,
    tags: [`transcriticalbackpressurevalve`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `u`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `CdA_max`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Fully open discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseCap`,
    library: `twophase`,
    summary: `A two-phase capacitive volume (a pressure-compliance node).`,
    tags: [`twophasecap`, `component`, `twophase`, `acausal`],
    ports: [`in`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseChamber`,
    library: `twophase`,
    summary: `A two-phase control volume.`,
    tags: [`twophasechamber`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `kg/Pa`, description: `Capacitance, stored mass per unit pressure [kg/Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Overall conductance UA [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Reference/initial pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `h0`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Reference enthalpy [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseCompressor`,
    library: `twophase`,
    summary: `A refrigerant compressor with selectable isentropic/volumetric variants.`,
    tags: [`compressor`, `compressor-family`, `twophasecompressor`, `ports:in-out`, `flow-closed`, `energy-work`, `steady`, `twophase`, `component`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eta`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Efficiency (0–1).`, required: true, values: [], variants: [`isentropic`, `volumetric`], defaultValue: `` },
      { name: `eta_v`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`volumetric`], defaultValue: `` },
      { name: `disp`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`volumetric`, `map2d`], defaultValue: `` },
      { name: `rpm`, isString: false, isSelector: false, isMap: false, unit: ``, description: ``, required: true, values: [], variants: [`volumetric`, `map2d`], defaultValue: `` },
      { name: `map_etas$`, isString: true, isSelector: false, isMap: true, unit: ``, description: ``, required: true, values: [], variants: [`map2d`], defaultValue: `` },
      { name: `map_etav$`, isString: true, isSelector: false, isMap: true, unit: ``, description: ``, required: true, values: [], variants: [`map2d`], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` },
      { name: `model$`, isString: true, isSelector: true, isMap: false, unit: ``, description: `Model variant — selects the physics body (see Model Variants).`, required: false, values: [`isentropic`, `volumetric`, `map2d`], variants: [], defaultValue: `isentropic` }
    ],
    variants: [{ name: `isentropic`, requires: [`eta`] }, { name: `volumetric`, requires: [`eta`, `eta_v`, `disp`, `rpm`] }, { name: `map2d`, requires: [`map_etas$`, `map_etav$`, `disp`, `rpm`] }],
  },
  {
    type: `TwoPhaseCondenser`,
    library: `twophase`,
    summary: `A two-phase condenser rejecting heat from the refrigerant.`,
    tags: [`twophasecondenser`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `SC_set`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Target subcooling [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Nominal pressure drop [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseCondenserFloat`,
    library: `twophase`,
    summary: `A two-phase condenser whose pressure floats with the charge/ambient balance.`,
    tags: [`twophasecondenserfloat`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Overall conductance UA [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T_amb`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Ambient temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseCondenserUA`,
    library: `twophase`,
    summary: `A two-phase condenser sized by an overall conductance UA.`,
    tags: [`twophasecondenserua`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Overall conductance UA [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `T_amb`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Ambient temperature [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseEjector`,
    library: `twophase`,
    summary: `Two-phase ejector, lumped: motive m entrains suction s; mass and energy mix exactly, and the diffuser recovers a pressure lift parameterized as the pressure-lift ratio PLR = P_out / P_suction (rate it from CFD/test data).`,
    tags: [`twophaseejector`, `component`, `twophase`, `acausal`],
    ports: [`m`, `s`, `out`],
    params: [
      { name: `PLR`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Pressure lift ratio, outlet over suction pressure [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseEnthalpySource`,
    library: `twophase`,
    summary: `A two-phase boundary fixing the stream enthalpy.`,
    tags: [`twophaseenthalpysource`, `component`, `twophase`, `acausal`],
    ports: [`out`],
    params: [
      { name: `mdot`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow rate [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `h`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Specific enthalpy [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseEvaporator`,
    library: `twophase`,
    summary: `A two-phase evaporator absorbing heat into the refrigerant.`,
    tags: [`twophaseevaporator`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `SH_set`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Target superheat [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Nominal pressure drop [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseEvaporatorUA`,
    library: `twophase`,
    summary: `A two-phase evaporator sized by an overall conductance UA.`,
    tags: [`twophaseevaporatorua`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `wall`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `UA`, isString: false, isSelector: false, isMap: false, unit: `W/K`, description: `Overall conductance UA [W/K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `dP`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Nominal pressure drop [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `SH`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Superheat [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseExpansionValve`,
    library: `twophase`,
    summary: `A refrigerant expansion valve (isenthalpic throttle).`,
    tags: [`twophaseexpansionvalve`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Cv`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Flow coefficient: ṁ`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseFlowRes`,
    library: `twophase`,
    summary: `A two-phase flow resistance relating pressure drop to mass flow.`,
    tags: [`twophaseflowres`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseInternalHX`,
    library: `twophase`,
    summary: `Internal (suction-line) heat exchanger: subcools the liquid line against the suction vapor at an effectiveness on the vapor side (the usual Cmin side).`,
    tags: [`twophaseinternalhx`, `component`, `twophase`, `acausal`],
    ports: [`liq_in`, `liq_out`, `vap_in`, `vap_out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `eps`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Effectiveness on the vapour-side capacity rate [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseInventory`,
    library: `twophase`,
    summary: `Tracks the refrigerant charge inventory across the circuit.`,
    tags: [`twophaseinventory`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseMixer`,
    library: `twophase`,
    summary: `Mixes two two-phase streams with flow-weighted enthalpy.`,
    tags: [`twophasemixer`, `component`, `twophase`, `acausal`],
    ports: [`in1`, `in2`, `out`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseOilRider`,
    library: `twophase`,
    summary: `Oil-circulation-rate rider: declares the oil mass fraction on the stream (it rides every downstream pass-through node like W/z) and exposes the documented HTC degradation factor f_deg = 1 - k_deg*OCR to inject into downstream UA parameters.`,
    tags: [`twophaseoilrider`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `oc_set`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Oil circulation ratio imposed on the stream [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `k_deg`, isString: false, isSelector: false, isMap: false, unit: `-`, description: `Fractional performance loss per unit oil circulation ratio [-].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhasePipe`,
    library: `twophase`,
    summary: `A two-phase pipe with a Lockhart–Martinelli frictional pressure drop.`,
    tags: [`twophasepipe`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `L`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Length [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `D`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Diameter [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rough`, isString: false, isSelector: false, isMap: false, unit: `m`, description: `Absolute wall roughness [m].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `x`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Vapor quality / fraction (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho_l`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Liquid density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `rho_g`, isString: false, isSelector: false, isMap: false, unit: `kg/m^3`, description: `Vapor density [kg/m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mu_l`, isString: false, isSelector: false, isMap: false, unit: `Pa-s`, description: `Liquid viscosity [Pa·s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mu_g`, isString: false, isSelector: false, isMap: false, unit: `Pa-s`, description: `Vapor viscosity [Pa·s].`, required: true, values: [], variants: [], defaultValue: `` }
    ],
    variants: [],
  },
  {
    type: `TwoPhasePressureSink`,
    library: `twophase`,
    summary: `A two-phase boundary fixing the pressure (sink).`,
    tags: [`twophasepressuresink`, `component`, `twophase`, `acausal`],
    ports: [`in`],
    params: [
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhasePressureSource`,
    library: `twophase`,
    summary: `A two-phase boundary fixing the pressure (source).`,
    tags: [`twophasepressuresource`, `component`, `twophase`, `acausal`],
    ports: [`out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `x`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Vapor quality / fraction (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseReceiver`,
    library: `twophase`,
    summary: `A liquid receiver buffering refrigerant charge at saturation.`,
    tags: [`twophasereceiver`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseSensor`,
    library: `twophase`,
    summary: `A sensor reading the two-phase stream state.`,
    tags: [`twophasesensor`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseShortTube`,
    library: `twophase`,
    summary: `Short-tube (fixed) orifice that chokes on flashing: below the upstream saturation pressure the flow depends on P_up − P_sat(T_up), not on the evaporator pressure.`,
    tags: [`twophaseshorttube`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Refrigerant name (e.g. R134a, R744, R1234yf).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `CdA`, isString: false, isSelector: false, isMap: false, unit: `m^2`, description: `Discharge coefficient times flow area [m^2].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseSink`,
    library: `twophase`,
    summary: `A boundary absorbing a two-phase stream.`,
    tags: [`twophasesink`, `component`, `twophase`, `acausal`],
    ports: [`in`],
    params: [
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseSource`,
    library: `twophase`,
    summary: `A boundary supplying a two-phase stream.`,
    tags: [`twophasesource`, `component`, `twophase`, `acausal`],
    ports: [`out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `mdot`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow rate [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `x`, isString: false, isSelector: false, isMap: false, unit: ``, description: `Vapor quality / fraction (0–1).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseSourcePH`,
    library: `twophase`,
    summary: `A two-phase source specified by pressure and enthalpy (P, h).`,
    tags: [`twophasesourceph`, `component`, `twophase`, `acausal`],
    ports: [`out`],
    params: [
      { name: `mdot`, isString: false, isSelector: false, isMap: false, unit: `kg/s`, description: `Mass flow rate [kg/s].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `h`, isString: false, isSelector: false, isMap: false, unit: `J/kg`, description: `Specific enthalpy [J/kg].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TwoPhaseVolume`,
    library: `twophase`,
    summary: `A finite-volume two-phase control volume with mass and energy states ((p, h) states).`,
    tags: [`twophasevolume`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `V`, isString: false, isSelector: false, isMap: false, unit: `m^3`, description: `Volume [m³].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `C`, isString: false, isSelector: false, isMap: false, unit: `kg/Pa`, description: `Capacitance, stored mass per unit pressure [kg/Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `P0`, isString: false, isSelector: false, isMap: false, unit: `Pa`, description: `Reference/initial pressure [Pa].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  },
  {
    type: `TXVSuperheat`,
    library: `twophase`,
    summary: `A thermostatic expansion valve that meters flow to hold a target superheat.`,
    tags: [`txvsuperheat`, `component`, `twophase`, `acausal`],
    ports: [`in`, `out`, `bulb`],
    params: [
      { name: `fluid$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Fluid name (e.g. Water, R134a, Air).`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `Kv`, isString: false, isSelector: false, isMap: false, unit: `kg/s-K`, description: `Mass-flow gain per kelvin of superheat above SH_set [kg/s·K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `SH_set`, isString: false, isSelector: false, isMap: false, unit: `K`, description: `Target superheat [K].`, required: true, values: [], variants: [], defaultValue: `` },
      { name: `domain$`, isString: true, isSelector: false, isMap: false, unit: ``, description: `Connector fluid family — one of \`fluid\`, \`gas\`, \`oil\`, \`moistair\`, \`liquid\`, \`twophase\`.`, required: false, values: [], variants: [], defaultValue: `twophase` }
    ],
    variants: [],
  }
];
