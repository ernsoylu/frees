---
name: Splitter
category: Component (fluid)
summary: Divides a fluid stream into two branches.
related: []
examples: []
tags: [splitter, component, fluid, acausal]
---

# Splitter

Divides a fluid stream into two branches.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out1`, `out2`

## Usage

```
Splitter inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out1.p &= in.p \\
out2.p &= in.p \\
out1.h &= in.h \\
out2.h &= in.h \\
in.mdot &= out1.mdot + out2.mdot
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Splitter SP(s1, s2, s3)
s1.P = 300000;   s1.mdot = 5;   s1.h = 80000
s2.mdot = 2

{ CHECK s1.h 80000 0.08 }
{ CHECK s1.mdot 5 0.0000049999999999999996 }
{ CHECK s1.p 300000 0.3 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
s1.h = 80000
s1.mdot = 5
s1.p = 300000
```

<!-- verified-reference-example:end -->
