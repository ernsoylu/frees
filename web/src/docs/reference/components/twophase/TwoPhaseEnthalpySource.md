---
name: TwoPhaseEnthalpySource
category: Component (twophase)
summary: A two-phase boundary fixing the stream enthalpy.
related: []
examples: []
tags: [twophaseenthalpysource, component, twophase, acausal]
---

# TwoPhaseEnthalpySource

A two-phase boundary fixing the stream enthalpy.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
TwoPhaseEnthalpySource inst(mdot, h, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `mdot` | Number | Mass flow rate [kg/s]. |
| `h` | Number | Heat-transfer coefficient [W/m²·K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= mdot \\
out.h &= h
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
