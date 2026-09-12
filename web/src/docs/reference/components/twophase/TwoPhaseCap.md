---
name: TwoPhaseCap
category: Component (twophase)
summary: A two-phase capacitive volume (a pressure-compliance node).
related: []
examples: []
tags: [twophasecap, component, twophase, acausal]
---

# TwoPhaseCap

A two-phase capacitive volume (a pressure-compliance node).

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`

## Usage

```
TwoPhaseCap inst(domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
in.mdot &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TwoPhaseCap: dead-end cap on a pressure reservoir — zero through-flow.
TwoPhasePressureSource PS(fluid$ = R134a, P = 500000, x = 0.2)
TwoPhaseCap            CAP()
connect(PS.out, CAP.in)
m_dead = CAP.in.mdot
p_dead = CAP.in.P
h_dead = CAP.in.h

{ CHECK cap.in.h 258695.6082 0.2586956081583675 }
{ CHECK cap.in.mdot 0 1e-8 }
{ CHECK cap.in.p 500000 0.5 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cap.in.h = 258695.6082
cap.in.mdot = 0
cap.in.p = 500000
```

<!-- verified-reference-example:end -->
