---
name: TwoPhasePipe
category: Component (twophase)
summary: A two-phase pipe with a Lockhart–Martinelli frictional pressure drop.
related: []
examples: []
tags: [twophasepipe, component, twophase, acausal]
---

# TwoPhasePipe

A two-phase pipe with a Lockhart–Martinelli frictional pressure drop.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhasePipe inst(fluid$, L, D, rough, x, rho_l, rho_g, mu_l, mu_g)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `L` | Number | Length [m]. |
| `D` | Number | Diameter [m]. |
| `rough` | Number | Absolute wall roughness [m]. |
| `x` | Number | Vapor quality / fraction (0–1). |
| `rho_l` | Number | Liquid density [kg/m³]. |
| `rho_g` | Number | Vapor density [kg/m³]. |
| `mu_l` | Number | Liquid viscosity [Pa·s]. |
| `mu_g` | Number | Vapor viscosity [Pa·s]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
a &= \frac{3.141592653589793}{4}\cdot d^{2} \\
v_{l} &= \frac{in.mdot\cdot \left(1 - x\right)}{rho_{l}\cdot a} \\
re_{l} &= \text{reynolds}\left(rho_{l}, v_{l}, d, mu_{l}\right) \\
f_{l} &= \text{friction\_factor}\left(re_{l}, \frac{rough}{d}\right) \\
dp_{l} &= \frac{f_{l}\cdot \frac{l}{d}\cdot rho_{l}\cdot v_{l}^{2}}{2} \\
x_{tt} &= \text{lm\_martinelli\_tt}\left(x, rho_{l}, rho_{g}, mu_{l}, mu_{g}\right) \\
phi2 &= \text{lm\_phi2}\left(x_{tt}, 20\right) \\
out.p &= in.p - phi2\cdot dp_{l}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [out] = RSrc(P, h0, mdot)
port(out)
  out.P = P
  out.h = h0
  out.mdot = mdot
end
function [in] = PSink(P)
port(in)
  in.P = P
end
RSrc        SRC(P=500000, h0=250000, mdot=0.05)
TwoPhasePipe TP(fluid$=R134a, L=2, D=0.01, rough=1e-5, x=0.3, rho_l=1200, rho_g=20, mu_l=2e-4, mu_g=1e-5)
Sink        SNK()
connect(SRC.out, TP.in)
connect(TP.out, SNK.in)

{ CHECK snk.h 250000 0.25 }
{ CHECK snk.in.h 250000 0.25 }
{ CHECK snk.in.mdot 0.05 5e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
snk.h = 250000
snk.in.h = 250000
snk.in.mdot = 0.05
```

<!-- verified-reference-example:end -->
