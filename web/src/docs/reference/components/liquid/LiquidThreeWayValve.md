---
name: LiquidThreeWayValve
category: Component (liquid)
summary: Acausal liquid-domain component LiquidThreeWayValve with ports in, outa, outb.
related: []
examples: []
tags: [liquidthreewayvalve, component, liquid, acausal]
references: []
generated: true
---

# LiquidThreeWayValve

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidThreeWayValve inst(u, domain$)
```

## Ports

`in`, `outa`, `outb`

## Parameters

| Parameter | Type |
| --- | --- |
| `u` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
outa.p &= in.p \\
outb.p &= in.p \\
outa.h &= in.h \\
outb.h &= in.h \\
outa.mdot &= u\cdot in.mdot \\
outb.mdot &= \left(1 - u\right)\cdot in.mdot
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Domain family: LIQUID single-phase coolant loop (liquid.frees), separated
// from thermofluid by `domain$ = liquid`. Water is one of the two tabulated
// fluids.
//
// The B-branch orifice area is left as the top-level unknown `cda_b`: the
// mixer's `in2.P = in1.P` closes the loop and the solver sizes the orifice
// that balances the two legs. That is the acausal property the component layer
// exists for - nothing here says which way the computation runs.
LiquidSource        LS(l1, fluid$ = Water, mdot = 0.8, P = 200000, T = 310)
LiquidThreeWayValve TW(l1, l2, l3, u = 0.65)
LiquidOrifice       OA(l2, l4, CdA = 4e-5, rho = 993, model$ = incompressible)
LiquidOrifice       OB(l3, l5, CdA = cda_b, rho = 993, model$ = incompressible)
LiquidMixer         LM(l4, l5, l6)
LiquidSink          LK(l6)

mdot_a = l2.mdot
mdot_b = l3.mdot
p_mix  = l6.P
h_out  = LK.h

{ CHECK cda_b 0.00002153846154 1e-8 }
{ CHECK h_out 154539.6834 0.15453968341654012 }
{ CHECK l1.h 154539.6834 0.15453968341654012 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cda_b = 0.00002153846154 [kg^0.5 m^0.5]
h_out = 154539.6834 [J/kg]
l1.h = 154539.6834
```

<!-- verified-reference-example:end -->
