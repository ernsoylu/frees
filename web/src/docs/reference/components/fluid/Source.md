---
name: Source
category: Component (fluid)
summary: A fluid boundary that supplies a stream at set conditions.
related: []
examples: []
tags: [source, component, fluid, acausal]
---

# Source

A fluid boundary that supplies a stream at set conditions.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
Source inst(fluid$, mdot, P, T)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `mdot` | Number | Mass flow rate [kg/s]. |
| `P` | Number | Pressure [Pa]. |
| `T` | Number | Temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= mdot \\
out.p &= p \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid}, =p, p=t\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Source S(fluid$=Water, mdot=2, P=8000000, T=773.15)
Boiler B()
Sink   K()
connect(S.out, B.in)
connect(B.out, K.in)

B.Q = 1000000

{ CHECK b.in.h 3399491.652 3.3994916516347153 }
{ CHECK b.in.mdot 2 0.000002 }
{ CHECK b.in.p 8000000 8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
b.in.h = 3399491.652
b.in.mdot = 2
b.in.p = 8000000
```

<!-- verified-reference-example:end -->
