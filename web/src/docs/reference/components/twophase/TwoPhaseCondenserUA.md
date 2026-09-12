---
name: TwoPhaseCondenserUA
category: Component (twophase)
summary: A two-phase condenser sized by an overall conductance UA.
related: []
examples: []
tags: [twophasecondenserua, component, twophase, acausal]
---

# TwoPhaseCondenserUA

A two-phase condenser sized by an overall conductance `UA`.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseCondenserUA inst(fluid$, UA, T_amb, V, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `UA` | Number | Overall conductance UA [W/K]. |
| `T_amb` | Number | Ambient temperature [K]. |
| `V` | Number | Volume [m³]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
tcond &= \text{T\_sat}\left(\mathrm{fluid}, =in.p\right) \\
q &= ua\cdot \left(tcond - t_{amb}\right) \\
q &= in.mdot\cdot \left(in.h - out.h\right) \\
rho_{in} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
rho_{out} &= \text{Density}\left(\mathrm{fluid}, =out.p, p=out.h\right) \\
m &= v\cdot 0.5\cdot \left(rho_{in} + rho_{out}\right) \\
sc &= tcond - \text{Temperature}\left(\mathrm{fluid}, =out.p, p=out.h\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhaseEnthalpySource SRC(mdot=0.02, h=435000)
TwoPhaseCondenserUA COND(fluid$=R134a, UA=400, T_amb=305, V=0.002)
TwoPhaseSink SNK()
connect(SRC.out, COND.in)
connect(COND.out, SNK.in)
COND.m = 1.200000

{ CHECK cond.in.h 435000 0.435 }
{ CHECK cond.in.mdot 0.02 2e-8 }
{ CHECK cond.in.p 1040885.197 1.0408851966633037 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cond.in.h = 435000
cond.in.mdot = 0.02
cond.in.p = 1040885.197
```

<!-- verified-reference-example:end -->
