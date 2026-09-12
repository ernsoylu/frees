---
name: Mixer
category: Component (fluid)
summary: Combines two fluid streams into one, with flow-weighted enthalpy mixing.
related: []
examples: []
tags: [mixer, component, fluid, acausal]
---

# Mixer

Combines two fluid streams into one, with flow-weighted enthalpy mixing.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in1`, `in2`, `out`

## Usage

```
Mixer inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.p &= in1.p \\
out.mdot &= in1.mdot + in2.mdot \\
out.mdot\cdot out.h &= in1.mdot\cdot in1.h + in2.mdot\cdot in2.h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Splitter SP(s1, s2, s3)
Mixer    MX(s2, s3, s4)
s1.P = 100000;   s1.mdot = 4;   s1.h = 60000
s2.mdot = 1.5

{ CHECK s1.h 60000 0.06 }
{ CHECK s1.mdot 4 0.000004 }
{ CHECK s1.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
s1.h = 60000
s1.mdot = 4
s1.p = 100000
```

<!-- verified-reference-example:end -->
