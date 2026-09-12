---
name: TwoPhaseVolume
category: Component (twophase)
summary: A finite-volume two-phase control volume with mass and energy states ((p, h) states).
related: []
examples: []
tags: [twophasevolume, component, twophase, acausal]
---

# TwoPhaseVolume

A finite-volume two-phase control volume with mass and energy states (`(p, h)` states).

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseVolume inst(fluid$, V, C, P0, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `V` | Number | Volume [m³]. |
| `C` | Number | Capacitance [F]. |
| `P0` | Number | Reference/initial pressure [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.p &= in.p \\
out.h &= in.h \\
\text{der}\left(in.p\right) &= \frac{in.mdot - out.mdot}{c} \\
\text{init}\left(in.p\right) &= p0 \\
hf &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=0\right) \\
hg &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=1\right) \\
x &= \frac{in.h - hf}{hg - hf} \\
rho_{l} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=0\right) \\
rho_{g} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=1\right) \\
alpha &= \text{void\_zivi}\left(x, rho_{l}, rho_{g}\right) \\
rho_{mix} &= alpha\cdot rho_{g} + \left(1 - alpha\right)\cdot rho_{l} \\
m &= v\cdot rho_{mix}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TwoPhaseVolume: adiabatic capacitive C-node in its steady limit (no DYNAMIC
// block, so der(P) = 0 forces in.mdot = out.mdot); reports the void-weighted
// charge of 2 L of R134a at x = 0.5.
TwoPhaseSource SRC(fluid$ = R134a, mdot = 0.04, P = 400000, x = 0.5)
TwoPhaseVolume VOL(fluid$ = R134a, V = 0.002, C = 1e-7, P0 = 400000)
TwoPhaseSink   SNK()
connect(SRC.out, VOL.in)
connect(VOL.out, SNK.in)
m_charge = VOL.m
a_void   = VOL.alpha

{ CHECK a_void 0.9416100293 9.416100293291574e-7 }
{ CHECK m_charge 0.1844629667 1.8446296666302913e-7 }
{ CHECK snk.h 307915.2602 0.30791526023384824 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a_void = 0.9416100293
m_charge = 0.1844629667 [kg/m^3]
snk.h = 307915.2602
```

<!-- verified-reference-example:end -->
