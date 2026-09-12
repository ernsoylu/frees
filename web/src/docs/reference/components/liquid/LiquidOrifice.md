---
name: LiquidOrifice
category: Component (liquid)
summary: A liquid orifice metering flow vs. pressure drop.
related: []
examples: [ev-thermal-management]
tags: [liquidorifice, component, liquid, acausal]
---

# LiquidOrifice

A liquid orifice metering flow vs. pressure drop.

## Domain

A reusable **acausal liquid-domain** component — its single-phase liquid-coolant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
LiquidOrifice inst(CdA, rho, domain$, model$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `CdA` | Number | Discharge coefficient × area Cd·A [m²]. |
| `rho` | Number | Density [kg/m³]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |
| `model$` | String | Model variant — selects the physics body (see Model Variants). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `incompressible`

$$
\begin{aligned}
in.mdot\cdot \left|in.mdot\right| &= cda^{2}\cdot 2\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

### `cavitating` — requires `Pvap`

$$
\begin{aligned}
dp_{eff} &= in.p - \text{max}\left(out.p, pvap\right) \\
in.mdot\cdot \left|in.mdot\right| &= cda^{2}\cdot 2\cdot rho\cdot dp_{eff}
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

Instantiated in the verified example below:

[Run: ev-thermal-management]
