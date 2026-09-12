---
name: GasCooler
category: Component (twophase)
summary: Acausal twophase-domain component GasCooler with ports in, out, wall.
related: []
examples: []
tags: [gascooler, component, twophase, acausal]
references: []
generated: true
---

# GasCooler

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
GasCooler inst(fluid$, UA, dP, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |
| `dP` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p - dp \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
cp_{g} &= \text{Cp}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
epsg &= 1 - e^{\frac{-ua}{in.mdot\cdot cp_{g}}} \\
q &= epsg\cdot in.mdot\cdot cp_{g}\cdot \left(t_{in} - wall.t\right) \\
out.h &= in.h - \frac{q}{in.mdot} \\
wall.qdot &= -q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// GasCooler: supercritical single-phase cooling with no saturation clamp.
// R744 is not in this build, so supercritical-region Air stands in: 3 MPa /
// 390 K gas cools against a 305 K wall at an effectiveness on the local cp.
h_in = Enthalpy(Air, T = 390, P = 3000000)
TwoPhaseSourcePH SRC(mdot = 0.1, P = 3000000, h = h_in)
GasCooler        GC(fluid$ = Air, UA = 150, dP = 50000)
ThermalSource    WALL(T = 305)
TwoPhaseSink     SNK()
connect(SRC.out, GC.in)
connect(GC.wall, WALL.port)
connect(GC.out, SNK.in)
q     = GC.Q
t_out = Temperature(Air, P = SNK.P, h = SNK.h)

{ CHECK gc.cp_g 1037.186773 0.0010371867730618652 }
{ CHECK gc.epsg 0.7645413004 7.645413004115639e-7 }
{ CHECK gc.in.h 513753.2087 0.5137532087456873 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
gc.cp_g = 1037.186773
gc.epsg = 0.7645413004
gc.in.h = 513753.2087
```

<!-- verified-reference-example:end -->
