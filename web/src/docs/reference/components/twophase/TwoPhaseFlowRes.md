---
name: TwoPhaseFlowRes
category: Component (twophase)
summary: A two-phase flow resistance relating pressure drop to mass flow.
related: []
examples: []
tags: [twophaseflowres, component, twophase, acausal]
---

# TwoPhaseFlowRes

A two-phase flow resistance relating pressure drop to mass flow.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseFlowRes inst(fluid$, L, D, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `L` | Number | Length [m]. |
| `D` | Number | Diameter [m]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
hf &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=0\right) \\
hg &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=1\right) \\
x &= \frac{in.h - hf}{hg - hf} \\
rho_{l} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=0\right) \\
rho_{g} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=1\right) \\
mu_{l} &= \text{Viscosity}\left(\mathrm{fluid}, =in.p, p=0\right) \\
mu_{g} &= \text{Viscosity}\left(\mathrm{fluid}, =in.p, p=1\right) \\
sigma &= \text{Surfacetension}\left(\mathrm{fluid}, =in.p\right) \\
a &= \frac{3.141592653589793}{4}\cdot d^{2} \\
g &= \frac{in.mdot}{a} \\
v_{lo} &= \frac{g}{rho_{l}} \\
re_{lo} &= \text{reynolds}\left(rho_{l}, v_{lo}, d, mu_{l}\right) \\
f_{lo} &= \text{friction\_factor}\left(re_{lo}, 0\right) \\
dp_{lo} &= \frac{f_{lo}\cdot \frac{l}{d}\cdot rho_{l}\cdot v_{lo}^{2}}{2} \\
phi2 &= \text{friedel\_phi2}\left(x, rho_{l}, rho_{g}, mu_{l}, mu_{g}, g, d, sigma\right) \\
out.p &= in.p - phi2\cdot dp_{lo}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=500000, x=0.3)
TwoPhaseFlowRes LINE(fluid$=R134a, L=2, D=0.008)
TwoPhaseSensor SEN(fluid$=R134a)
TwoPhaseSink SNK()
connect(SRC.out, LINE.in)
connect(LINE.out, SEN.in)
connect(SEN.out, SNK.in)

{ CHECK line.a 0.00005026548246 1e-8 }
{ CHECK line.dp_lo 446.8552766 0.0004468552765849463 }
{ CHECK line.f_lo 0.02801750717 2.8017507165035196e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
line.a = 0.00005026548246
line.dp_lo = 446.8552766
line.f_lo = 0.02801750717
```

<!-- verified-reference-example:end -->
