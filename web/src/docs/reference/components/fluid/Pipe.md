---
name: Pipe
category: Component (fluid)
summary: A flow passage that imposes a frictional pressure drop.
related: []
examples: []
tags: [pipe, component, fluid, acausal]
---

# Pipe

A flow passage that imposes a frictional pressure drop.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Pipe inst(fluid$, L, D, rough)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `L` | Number | Length [m]. |
| `D` | Number | Diameter [m]. |
| `rough` | Number | Absolute wall roughness [m]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
rho &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
mu &= \text{Viscosity}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
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
Source SUP(s1, fluid$=Water, mdot=2, P=300000, T=298)
Pipe   LINE(s1, s2, fluid$=Water, L=50, D=0.05, rough=0.0001)
Sink   RET(s2)

{ CHECK line.a 0.001963495408 1e-8 }
{ CHECK line.f 0.02618069139 2.618069139187325e-8 }
{ CHECK line.mu 0.0008930444195 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
line.a = 0.001963495408
line.f = 0.02618069139
line.mu = 0.0008930444195
```

<!-- verified-reference-example:end -->
