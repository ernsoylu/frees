---
name: FlashTank
category: Component (twophase)
summary: Acausal twophase-domain component FlashTank with ports in, liq, vap.
related: []
examples: []
tags: [flashtank, component, twophase, acausal]
references: []
generated: true
---

# FlashTank

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FlashTank inst(fluid$, domain$)
```

## Ports

`in`, `liq`, `vap`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
liq.p &= in.p \\
vap.p &= in.p \\
liq.h &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=0\right) \\
vap.h &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=1\right) \\
in.mdot &= liq.mdot + vap.mdot \\
in.mdot\cdot in.h &= liq.mdot\cdot liq.h + vap.mdot\cdot vap.h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Flash tank splits exactly at the inlet quality: x=0.4 of 1 kg/s -> 0.4 kg/s
// saturated vapor, 0.6 kg/s saturated liquid.
// EXPECT d_v = 0 tol 1e-9
// EXPECT d_l = 0 tol 1e-9
TwoPhaseSource SRC(fluid$=R134a, mdot=1, P=400000, x=0.4)
FlashTank      FT(fluid$=R134a)
TwoPhaseSink   SL()
TwoPhaseSink   SV()
connect(SRC.out, FT.in)
connect(FT.liq, SL.in)
connect(FT.vap, SV.in)
d_v = FT.vap.mdot - 0.4
d_l = FT.liq.mdot - 0.6

{ CHECK d_l 0 1e-8 }
{ CHECK d_v 0 1e-8 }
{ CHECK ft.in.h 288754.43 0.28875442998797074 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d_l = 0 [kg/s]
d_v = 0 [kg/s]
ft.in.h = 288754.43
```

<!-- verified-reference-example:end -->
