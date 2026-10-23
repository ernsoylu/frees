---
name: FlashTank
category: Component (twophase)
summary: "Flash tank / economizer separator: splits a two-phase inlet into saturated liquid and saturated vapor streams at the tank pressure, conserving mass and energy (the split ratio IS the inlet quality)."
related: []
examples: []
tags: [flashtank, component, twophase, acausal]
references: []
---

# FlashTank

Flash tank / economizer separator: splits a two-phase inlet into saturated liquid and saturated vapor streams at the tank pressure, conserving mass and energy (the split ratio IS the inlet quality).

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FlashTank inst(fluid$, domain$)
```

## Ports

`in`, `liq`, `vap`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Refrigerant name (e.g. R134a, R744, R1234yf). |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
liq.p &= in.p \\
vap.p &= in.p \\
liq.h &= \text{Enthalpy}\left(\mathrm{fluid\$}, p=in.p, x=0\right) \\
vap.h &= \text{Enthalpy}\left(\mathrm{fluid\$}, p=in.p, x=1\right) \\
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
TwoPhaseSource SRC(fluid$=R134a, mdot=1 [kg/s], P=400000 [Pa], x=0.4)
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
