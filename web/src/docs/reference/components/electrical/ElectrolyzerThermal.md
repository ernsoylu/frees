---
name: ElectrolyzerThermal
category: Component (electrical)
summary: Acausal electrical-domain component ElectrolyzerThermal with ports p, n, cool_in, cool_out.
related: []
examples: []
tags: [electrolyzerthermal, component, electrical, acausal]
references: []
generated: true
---

# ElectrolyzerThermal

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ElectrolyzerThermal inst(ncells, area, i0, Rohm, E0, alpha, Eth, T, fluid$, UA)
```

## Ports

`p`, `n`, `cool_in`, `cool_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `ncells` | Number |
| `area` | Number |
| `i0` | Number |
| `Rohm` | Number |
| `E0` | Number |
| `alpha` | Number |
| `Eth` | Number |
| `T` | Number |
| `fluid$` | String |
| `UA` | Number |

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
ElectrolyzerThermal EL(ncells = 10, area = 0.01, i0 = 10, Rohm = 1e-4, E0 = 1.48, alpha = 0.5, Eth = 1.48, T = 333, fluid$ = Water, UA = 200)
VoltageSource BUS(E = 19.84)
Ground        G()
LiquidSource  SRC(fluid$ = Water, mdot = 0.05, P = 150000, T = 325)
LiquidSink    SNK()
connect(EL.p, BUS.p)
connect(BUS.n, EL.n, G.port)
connect(SRC.out, EL.cool_in)
connect(EL.cool_out, SNK.in)
i_stack = EL.p.I
h_out = SNK.h

{ CHECK bus.n.i -19.97290086 0.00001997290085607633 }
{ CHECK bus.n.v 0 1e-8 }
{ CHECK bus.p.i 19.97290086 0.00001997290085607633 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bus.n.i = -19.97290086
bus.n.v = 0
bus.p.i = 19.97290086
```

<!-- verified-reference-example:end -->
