---
name: GasSource
category: Component (pneumatic)
summary: A boundary supplying gas at set conditions.
related: []
examples: []
tags: [gassource, component, pneumatic, acausal]
references:
  - "ISO 6358 — Pneumatic fluid power: flow-rate characteristics"
---

# GasSource

A boundary supplying gas at set conditions.

## Domain

A reusable **acausal pneumatic-domain** component — its compressible-gas ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h` (ISO 6358 flow). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
GasSource inst(y, mdot, P, h0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `y` | Number | Position / fraction. |
| `mdot` | Number | Mass flow rate [kg/s]. |
| `P` | Number | Pressure [Pa]. |
| `h0` | Number | Reference enthalpy [J/kg]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.y &= y \\
out.mdot &= mdot \\
out.p &= p \\
out.h &= h0
\end{aligned}
$$

## References

1. ISO 6358 — Pneumatic fluid power: flow-rate characteristics.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
GasSource S(a, y=0.21, mdot=1.5, P=120000, h0=305000)
GasPipe   P(a, b)

{ CHECK a.h 305000 0.305 }
{ CHECK a.mdot 1.5 0.0000015 }
{ CHECK a.p 120000 0.12 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a.h = 305000
a.mdot = 1.5
a.p = 120000
```

<!-- verified-reference-example:end -->
