---
name: LiquidPipe
category: Component (liquid)
summary: A single-phase liquid pipe with frictional pressure drop.
related: []
examples: []
tags: [liquidpipe, component, liquid, acausal]
---

# LiquidPipe

A single-phase liquid pipe with frictional pressure drop.

## Domain

A reusable **acausal liquid-domain** component — its single-phase liquid-coolant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
LiquidPipe inst(fluid$, L, D, rough, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `L` | Number | Length [m]. |
| `D` | Number | Diameter [m]. |
| `rough` | Number | Absolute wall roughness [m]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

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
// LiquidPipe: Darcy drop with properties off the fluid (rho, mu from Water
// at the inlet state). 1 kg/s through 8 m of DN20: V ~ 3.2 m/s, Re ~ 7e4.
LiquidSource LS(l1, fluid$ = Water, mdot = 1.0, P = 300000, T = 300)
LiquidPipe   LP(l1, l2, fluid$ = Water, L = 8, D = 0.02, rough = 1.5e-5)
LiquidSink   SK(l2)

dp_pipe = l1.P - l2.P
p_out   = SK.P
h_out   = SK.h

{ CHECK dp_pipe 44833.41712 0.04483341711722139 }
{ CHECK h_out 112837.8113 0.1128378113292524 }
{ CHECK l1.h 112837.8113 0.1128378113292524 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dp_pipe = 44833.41712 [Pa]
h_out = 112837.8113 [J/kg]
l1.h = 112837.8113
```

<!-- verified-reference-example:end -->
