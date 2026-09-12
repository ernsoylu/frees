---
name: FuelCellStackCooled
category: Component (electrical)
summary: Acausal electrical-domain component FuelCellStackCooled with ports p, n, cool_in, cool_out.
related: []
examples: []
tags: [fuelcellstackcooled, component, electrical, acausal]
references: []
generated: true
---

# FuelCellStackCooled

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FuelCellStackCooled inst(ncells, area, i0, ilim, Rohm, E0, alpha, Eth, T, fluid$, UA)
```

## Ports

`p`, `n`, `cool_in`, `cool_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `ncells` | Number |
| `area` | Number |
| `i0` | Number |
| `ilim` | Number |
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
FuelCellStack FC(ncells=ncells, area=area, i0=i0, ilim=ilim, Rohm=Rohm, E0=E0, alpha=alpha, Eth=Eth, T=T)
LiquidWallHX  HX(fluid$=fluid$, UA=UA)
connect(p, FC.p)
connect(n, FC.n)
connect(FC.heat, HX.wall)
connect(cool_in, HX.in)
connect(HX.out, cool_out)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// FuelCellStackCooled: the ex05 10-cell stack clamped to a 7.5 V DC bus
// (V_cell = 0.75 -> i ~ 5375 A/m2, I ~ 53.7 A), its ~392 W of waste heat
// crossing the internal UA = 500 wall into a 0.2 kg/s water loop at 330 K.
// (Voltage-clamped on purpose: a current-source load makes the solver's
// matching solve the ln law backwards and the retry ladder stalls.)
FuelCellStackCooled FC(ncells = 10, area = 0.01, i0 = 10, ilim = 20000, Rohm = 1e-5, E0 = 1.18, alpha = 0.5, Eth = 1.48, T = 343, fluid$ = Water, UA = 500)
VoltageSource BUS(E = 7.5)
Ground        G()
LiquidSource  SRC(fluid$ = Water, mdot = 0.2, P = 200000, T = 330)
LiquidSink    SNK()
connect(FC.p, BUS.p)
connect(FC.n, BUS.n, G.port)
connect(SRC.out, FC.cool_in)
connect(FC.cool_out, SNK.in)
i_stack = BUS.p.I
h_out = SNK.h

{ CHECK bus.n.i 53.74668195 0.00005374668194675808 }
{ CHECK bus.n.v 0 1e-8 }
{ CHECK bus.p.i -53.74668195 0.00005374668194675808 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bus.n.i = 53.74668195
bus.n.v = 0
bus.p.i = -53.74668195
```

<!-- verified-reference-example:end -->
