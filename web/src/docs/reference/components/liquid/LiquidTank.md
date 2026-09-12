---
name: LiquidTank
category: Component (liquid)
summary: Acausal liquid-domain component LiquidTank with ports in, out, wall.
related: []
examples: []
tags: [liquidtank, component, liquid, acausal]
references: []
generated: true
---

# LiquidTank

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidTank inst(fluid$, m, UA, T0, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `m` | Number |
| `UA` | Number |
| `T0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.p &= in.p \\
out.mdot &= in.mdot \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=tt\right) \\
cp_{t} &= \text{Cp}\left(\mathrm{fluid}, =in.p, p=tt\right) \\
q &= ua\cdot \left(wall.t - tt\right) \\
\text{der}\left(tt\right) &= \frac{in.mdot\cdot \left(in.h - out.h\right) + q}{m\cdot cp_{t}} \\
\text{init}\left(tt\right) &= t0 \\
wall.qdot &= q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// LiquidTank at its steady point: 0.3 kg/s of 350 K water through a mixed
// 25 kg tank losing UA = 40 W/K to a 290 K wall; der(Tt) = 0 pins Tt just
// under the feed temperature.
LiquidSource  LS(l1, fluid$ = Water, mdot = 0.3, P = 200000, T = 350)
LiquidTank    TK(l1, l2, wl, fluid$ = Water, m = 25, UA = 40, T0 = 330)
ThermalSource AMB(wl, T = 290)
LiquidSink    SK(l2)

t_tank = TK.Tt
h_out  = SK.h

{ CHECK h_out 314164.874 0.31416487397799825 }
{ CHECK l1.h 321918.3569 0.32191835693112103 }
{ CHECK l1.mdot 0.3 3e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h_out = 314164.874 [J/kg]
l1.h = 321918.3569
l1.mdot = 0.3
```

<!-- verified-reference-example:end -->
