---
name: Accumulator
category: Component (fluid)
summary: A fluid accumulator — a compliance volume that stores fluid under pressure and buffers flow transients.
related: []
examples: []
tags: [accumulator, component, fluid, acausal]
---

# Accumulator

A fluid accumulator — a compliance volume that stores fluid under pressure and buffers flow transients.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Accumulator inst(C, P0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `C` | Number | Capacitance [F]. |
| `P0` | Number | Reference/initial pressure [Pa]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.p &= in.p \\
out.h &= in.h \\
\text{der}\left(in.p\right) &= \frac{in.mdot - out.mdot}{c} \\
\text{init}\left(in.p\right) &= p0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Accumulator with no DYNAMIC block: der(in.P) takes the steady branch,
// which recovers in.mdot = out.mdot; the node passes P and h through.
Accumulator AC(a1, a2, C = 1e-6, P0 = 300000)

a1.P    = 300000
a1.h    = 120000
a1.mdot = 0.25
p_out   = a2.P
m_out   = a2.mdot

{ CHECK a2.h 120000 0.12 }
{ CHECK a2.mdot 0.25 2.5e-7 }
{ CHECK a2.p 300000 0.3 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a2.h = 120000
a2.mdot = 0.25
a2.p = 300000
```

<!-- verified-reference-example:end -->
