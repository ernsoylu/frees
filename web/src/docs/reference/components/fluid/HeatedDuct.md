---
name: HeatedDuct
category: Component (fluid)
summary: Acausal fluid-domain component HeatedDuct with ports in, out, wall.
related: []
examples: []
tags: [heatedduct, component, fluid, acausal]
references: []
generated: true
---

# HeatedDuct

Reusable acausal **fluid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HeatedDuct inst(fluid$, UA)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `UA` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
cp_{d} &= \text{Cp}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
epsd &= 1 - e^{\frac{-ua}{in.mdot\cdot cp_{d}}} \\
q &= epsd\cdot in.mdot\cdot cp_{d}\cdot \left(wall.t - t_{in}\right) \\
out.h &= in.h + \frac{q}{in.mdot} \\
wall.qdot &= q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// HeatedDuct: single-stream eps-NTU pickup from a 450 K wall node
// (eps = 1 - exp(-UA/(mdot*cp)) ~ 0.52 at UA = 150, mdot = 0.2 of Air).
// The wall port shares stream wl with the ThermalSource positionally.
Source        SRC(a1, fluid$ = Air, mdot = 0.2, P = 101325, T = 300)
HeatedDuct    HD(a1, a2, wl, fluid$ = Air, UA = 150)
ThermalSource WALL(wl, T = 450)
Sink          SK(a2)

q     = HD.Q
h_out = SK.h

{ CHECK a1.h 426297.7744 0.4262977743916913 }
{ CHECK a1.mdot 0.2 2e-7 }
{ CHECK a1.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a1.h = 426297.7744
a1.mdot = 0.2
a1.p = 101325
```

<!-- verified-reference-example:end -->
