# Component Authoring — the frees component factory

How to add or upgrade a built-in component so it lands **solver-verified and
documented** in one pass. This is the process that grew the library from 139
to 245 components (Waves 1–6); follow it and each new component costs one
`.frees` block, one fixture file, and one generated doc page.

## 1. Write the physics — `backend/core/src/main/resources/components/<domain>.frees`

- One `COMPONENT Name(ports…)` block. **No parameter defaults** (std-lib rule —
  a silent default for a physical input is a footgun); only `domain$` and
  `model$` carry defaults.
- Pick the connector family with `domain$`: `fluid` (default) / `liquid` /
  `twophase` / `gas` / `oil` / `moistair`. Heat, electrical, mechanical
  (rotational + translational) and **signal** ports classify automatically from
  their members (`T/Qdot`, `V/I`, `w/tau`, `vel/f`, `sig`).
- A **signal port** is any port referenced as `port.sig` — across-only, one
  writer broadcasts to any readers. Use it for every command input
  (see `EXVCmd`, `MotorMap`, `Brake`); never pin free locals externally.
- Time-driven sources reference the reserved global **`time`** (never
  namespaced; the DYNAMIC integrators pin it, steady documents pin `time = …`).
- Maps: a `map$`-style string PARAM called as `map$(x)` / `map$(x, y)` binds a
  document `TABLE`/`FUNCTION` (2-D = curve-family `TABLE f(x : y = y1, y2…)`).
- States: `der(x) = …` + `init(x) = …`. Volumes obey **never C-C** (a resistive
  element between pressure states). Keep every closure **C¹-smooth**: tanh
  gates, the `0.5·(x+√(x²+ε²))` hinge, `zone_ramp`, `ln(x/x0+1)`, odd-symmetric
  `ṁ·|ṁ| = …` flow laws. Expose an `eps` PARAM for each smoothing width.
- Fidelity rungs are **VARIANTs**: shared body + `VARIANT name REQUIRE p1, p2`
  per rung, `model$ = <default>` preserving the pre-existing behavior. A param
  required only by an unselected variant is optional.
- Cross-domain devices couple through **separate same-domain ports**
  (transducers) or shared **wall heat nodes** (hierarchical composites — see
  `Chiller`, `Radiator`, `QuarterCar`). Never a direct cross-domain connect.
- Inject UA/ΔP from the correlation functions
  instead of embedding a correlation in the component.
- New scalar functions follow the 3-site wiring: `FunctionRegistry` →
  `Evaluator` dispatch → units rule. (Note: the arctangent is `arctan`, not
  `atan`.)

## 2. Verify it — one fixture file per behavior

Drop a `.frees` circuit under
`backend/core/src/test/resources/component-fixtures/<group>/` with directives:

```
// EXPECT <var> = <value> [tol <abs>]     — hand-derived golden value
// EXPECT-ERROR <substring>               — the circuit must be rejected
```

`ComponentFixturesTest` turns every file into a JUnit case. Rules of thumb
learned the hard way:

- Assert **hand-derived physics**, or replicate the law in-fixture from
  independent property/function calls and expect the difference to be 0.
  Equality-invariants against a closed-form twin variant are ideal.
- Transient assertions: run a `DYNAMIC` block and probe with
  `FinalValue/MaxValue/MinValue/TimeAt` (there is no `ValueAt` — end the run at
  the assertion time). **Do not mix steady probe circuits into a document with
  a DYNAMIC block** — everything routes into the block; split fixtures instead.
- Electrical loops need a `Ground` **component** (it contributes the floating
  current unknown); a naked `node.V = 0` pin over-specifies the loop.
- One node = one `connect(…)`. Splitting a node across two connect statements
  double-counts the flow balance.
- A dead-end fluid cap must pin `h` only if nothing else on the node defines it.
- Humid-air states: prefer explicit HAProps triples like `(h, P, R=1)` over
  implicit outlet temperatures — Newton's default guess NaNs CoolProp.
- Update the count assert in `LiquidDomainTest` (one line per milestone).

Run: `cd backend && ./gradlew :core:test --tests "*.ComponentFixturesTest" --tests "*.LiquidDomainTest"`.

## 3. Document it — generated, never hand-copied

```
cd frontend
node scripts/build-doc-manifest.mjs        # reconcile against the backend
node scripts/scaffold-reference-pages.mjs  # verbatim page per new component
node scripts/compile-docs.js               # -> componentCatalog.ts (wizard/help/search)
node scripts/check-doc-coverage.mjs        # gate
```

The scaffolded page carries the real ports/params/equations parsed from the
`.frees` source (flagged `generated: true`); enrich it by hand (physics prose,
citation, `[Run:]` example) when the component graduates to a flagship. Add a
`componentOverrides.ts` entry when the wizard needs curated sections or variant
gating, and an `examples.ts` entry (harness-verified) for showcase systems.

## 4. Domain map (where things live)

| file | contents |
|---|---|
| `signal.frees` | sources (incl. `SigTable` drive cycles), math, dynamics, `SigPID`, lookup |
| `fluid.frees` | generic thermofluid + gas/aero breadth (ducts, regenerator, combustor, ISA, propeller) |
| `liquid.frees` | coolant/TMS (3-way valve, tank, thermostat, pump map, expansion tank) |
| `twophase.frees` | refrigerant: boundaries, moving-boundary HXs, C/R volumes, charge, VCC devices |
| `ac.frees` | application composites (Chiller, AirCoil, Radiator, HeaterCore, TXV, EXV/EXVCmd) |
| `heat.frees` | conduction/convection/radiation, transient walls, PCM, Peltier, heat pipe |
| `electrical.frees` | circuits, batteries (map cell + pack), motor/inverter/DCDC, PV, electrolyzer |
| `mechanical.frees` | rotational/translational primitives, backlash, stops, kinematic pairs |
| `powertrain.frees` | engines, transmission, torque converter, tire, vehicle, drive cycle |
| `pneumatic.frees` / `hydraulic.frees` | ISO 6358 / Cq(λ) fluid power, valves, cylinders, volumes |
| `moistair.frees` | psychrometric HVAC + cabin zone, wet coils |

New domain files must be registered in `ComponentLibrary.DOMAIN_FILES`.
