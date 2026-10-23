---
name: ElectrolyzerThermal
category: Component (electrical)
summary: Electrolyzer with a coolant jacket (same pattern as the cooled stack).
related: []
examples: []
tags: [electrolyzerthermal, component, electrical, acausal]
references: []
---

# ElectrolyzerThermal

Electrolyzer with a coolant jacket (same pattern as the cooled stack).

Reusable acausal **electrical-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/electrical.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ElectrolyzerThermal inst(ncells, area, i0, Rohm, E0, alpha, Eth, T, fluid$, UA)
```

## Ports

`p`, `n`, `cool_in`, `cool_out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `ncells` | Number | Cells in the stack [-]. |
| `area` | Number | Active area per cell [m^2]. |
| `i0` | Number | Exchange current density [A/m^2]. |
| `Rohm` | Number | Area-specific ohmic resistance [ohm-m^2]. |
| `E0` | Number | Reversible cell voltage [V]. |
| `alpha` | Number | Charge-transfer coefficient [-]. |
| `Eth` | Number | Thermoneutral cell voltage [V]. |
| `T` | Number | Stack temperature [K]. |
| `fluid$` | String | Coolant name (e.g. Water, EG50). |
| `UA` | Number | Stack-to-coolant conductance [W/K]. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
Electrolyzer EL(ncells=ncells, area=area, i0=i0, Rohm=Rohm, E0=E0, alpha=alpha, Eth=Eth, T=T)
LiquidWallHX HX(fluid$=fluid$, UA=UA)
connect(p, EL.p)
connect(n, EL.n)
connect(EL.heat, HX.wall)
connect(cool_in, HX.in)
connect(HX.out, cool_out)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// ElectrolyzerThermal: the wave3 10-cell electrolyzer clamped to a 19.84 V
// bus (V_cell ~ 1.984 -> i ~ 2000 A/m2, ~20 A, ~100 W of heat), the jacket
// heat carried away by a 0.05 kg/s water loop at 325 K through a UA = 200
// wall.
ElectrolyzerThermal EL(ncells = 10, area = 0.01 [m^2], i0 = 10 [A/m^2], Rohm = 1e-4 [ohm-m^2], E0 = 1.48 [V], alpha = 0.5, Eth = 1.48 [V], T = 333 [K], fluid$ = Water, UA = 200 [W/K])
VoltageSource BUS(E = 19.84 [V])
Ground        G()
LiquidSource  SRC(fluid$ = Water, mdot = 0.05 [kg/s], P = 150000 [Pa], T = 325 [K])
LiquidSink    SNK()
connect(EL.p, BUS.p)
connect(BUS.n, EL.n, G.port)
connect(SRC.out, EL.cool_in)
connect(EL.cool_out, SNK.in)
i_stack = EL.p.I
h_out = SNK.h

{ CHECK bus.n.i 19.97290086 0.00001997290085607633 }
{ CHECK bus.n.v 0 1e-8 }
{ CHECK bus.p.i -19.97290086 0.00001997290085607633 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bus.n.i = 19.97290086
bus.n.v = 0
bus.p.i = -19.97290086
```

<!-- verified-reference-example:end -->
