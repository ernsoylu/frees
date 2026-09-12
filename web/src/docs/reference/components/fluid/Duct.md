---
name: Duct
category: Component (fluid)
summary: A flow passage that imposes a pressure drop on the stream.
related: []
examples: []
tags: [duct, component, fluid, acausal]
---

# Duct

A flow passage that imposes a pressure drop on the stream.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Duct inst(rho, mu, L, D, rough)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `rho` | Number | Density [kg/m³]. |
| `mu` | Number | Dynamic viscosity [Pa·s]. |
| `L` | Number | Length [m]. |
| `D` | Number | Diameter [m]. |
| `rough` | Number | Absolute wall roughness [m]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
a &= \frac{3.141592653589793}{4}\cdot d^{2} \\
v &= \frac{in.mdot}{rho\cdot a} \\
re_{d} &= \text{reynolds}\left(rho, v, d, mu\right) \\
f &= \text{friction\_factor}\left(re_{d}, \frac{rough}{d}\right) \\
out.p &= in.p - \frac{f\cdot \frac{l}{d}\cdot rho\cdot v^{2}}{2}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Fan–duct operating point (incompressible flow network)
P_atm = 101325 [Pa]

FanCurve F1(a, b, rho=1.2 [kg/m^3], dP0=500 [Pa], Q0=1.5 [m^3/s])
Duct     D1(b, c, rho=1.2 [kg/m^3], mu=1.8e-5 [Pa-s], L=100 [m], D=0.3 [m], rough=0.000045 [m])

a.P = P_atm
c.P = P_atm

{ CHECK a.mdot 0.9007597979 9.007597979250098e-7 }
{ CHECK a.p 101325 0.101325 }
{ CHECK b.mdot 0.9007597979 9.007597979250098e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a.mdot = 0.9007597979
a.p = 101325
b.mdot = 0.9007597979
```

<!-- verified-reference-example:end -->
