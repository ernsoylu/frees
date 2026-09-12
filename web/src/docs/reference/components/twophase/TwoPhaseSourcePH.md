---
name: TwoPhaseSourcePH
category: Component (twophase)
summary: A two-phase source specified by pressure and enthalpy (P, h).
related: []
examples: []
tags: [twophasesourceph, component, twophase, acausal]
---

# TwoPhaseSourcePH

A two-phase source specified by pressure and enthalpy `(P, h)`.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
TwoPhaseSourcePH inst(mdot, P, h, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `mdot` | Number | Mass flow rate [kg/s]. |
| `P` | Number | Pressure [Pa]. |
| `h` | Number | Heat-transfer coefficient [W/m²·K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= mdot \\
out.p &= p \\
out.h &= h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
MovingBoundaryCondenser CD(fluid$=R134a, U_cond=2500, U_sc=300, D=0.01, L=8, eps_zone=0.01)
TwoPhaseSourcePH SRC(mdot=0.02, P=900000, h=445000)
TwoPhaseSink SNK()
ThermalSource WALL(T=300)
connect(SRC.out, CD.in)
connect(CD.out, SNK.in)
connect(CD.wall, WALL.port)

{ CHECK cd.hf 249779.7946 0.24977979464484554 }
{ CHECK cd.in.h 445000 0.445 }
{ CHECK cd.in.mdot 0.02 2e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cd.hf = 249779.7946
cd.in.h = 445000
cd.in.mdot = 0.02
```

<!-- verified-reference-example:end -->
