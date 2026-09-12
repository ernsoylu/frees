---
name: Condenser
category: Component (fluid)
summary: Rejects heat from a fluid stream to a coolant/ambient, condensing it.
related: []
examples: []
tags: [condenser, component, fluid, acausal]
---

# Condenser

Rejects heat from a fluid stream to a coolant/ambient, condensing it.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Condenser inst(...)
```

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
q &= in.mdot\cdot \left(in.h - out.h\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
P_hi = 8000000 [Pa]
P_lo = 10000 [Pa]
T_hot = 753.15 [K]
Pump      P1(s1, s2, eta=0.80, fluid$=Water)
Boiler    B1(s2, s3)
Turbine   T1(s3, s4, eta=0.85, fluid$=Water)
Condenser C1(s4, s5)
s1.P    = P_lo
s1.h    = Enthalpy(Water, P=P_lo, x=0)
s1.mdot = 1 [kg/s]
s2.P    = P_hi
s3.h    = Enthalpy(Water, P=P_hi, T=T_hot)
s4.P    = P_lo
s5.h    = Enthalpy(Water, P=P_lo, x=0)

{ CHECK b1.q 3147749.138 3.147749138266563 }
{ CHECK c1.q 2103624.988 2.103624988457379 }
{ CHECK p1.v 0.001010271149 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
b1.q = 3147749.138
c1.q = 2103624.988
p1.v = 0.001010271149
```

<!-- verified-reference-example:end -->
