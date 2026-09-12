---
name: Throttle
category: Component (fluid)
summary: An isenthalpic pressure-reducing restriction.
related: []
examples: []
tags: [throttle, component, fluid, acausal]
---

# Throttle

An isenthalpic pressure-reducing restriction.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Throttle inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Vapor-Compression Refrigeration — built from standard components
T_evap = 263.15 [K]
T_cond = 313.15 [K]

Compressor K1(s1, s2, eta=0.80, fluid$=R134a)
Condenser  C1(s2, s3)
Throttle   V1(s3, s4)

P_lo = P_sat(R134a, T=T_evap)
P_hi = P_sat(R134a, T=T_cond)

s1.P    = P_lo
s1.h    = Enthalpy(R134a, T=T_evap, x=1)   { saturated vapor leaving evaporator }
s1.mdot = 1 [kg/s]
s2.P    = P_hi
s3.h    = Enthalpy(R134a, P=P_hi, x=0)     { saturated liquid leaving condenser }
s4.P    = P_lo

q_L = s1.h - s4.h            { refrigeration effect }
COP = q_L / K1.W

{ CHECK c1.q 178524.1429 0.17852414288778723 }
{ CHECK COP 3.223576735 0.0000032235767348983263 }
{ CHECK k1.h_s 426479.6927 0.42647969266969743 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c1.q = 178524.1429
COP = 3.223576735 [s/kg]
k1.h_s = 426479.6927
```

<!-- verified-reference-example:end -->
