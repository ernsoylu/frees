---
name: TwoPhaseChamber
category: Component (twophase)
summary: A two-phase control volume.
related: []
examples: []
tags: [twophasechamber, component, twophase, acausal]
---

# TwoPhaseChamber

A two-phase control volume.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `wall`

## Usage

```
TwoPhaseChamber inst(fluid$, V, C, UA, P0, h0, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `V` | Number | Volume [m³]. |
| `C` | Number | Capacitance [F]. |
| `UA` | Number | Overall conductance UA [W/K]. |
| `P0` | Number | Reference/initial pressure [Pa]. |
| `h0` | Number | Reference enthalpy [J/kg]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
\text{der}\left(in.p\right) &= \frac{in.mdot - out.mdot}{c} \\
\text{init}\left(in.p\right) &= p0 \\
rho &= \text{Density}\left(\mathrm{fluid}, =in.p, p=hcv\right) \\
q &= ua\cdot \left(wall.t - tcv\right) \\
\text{der}\left(hcv\right) &= \frac{in.mdot\cdot \left(in.h - hcv\right) + q}{rho\cdot v} \\
\text{init}\left(hcv\right) &= h0 \\
out.p &= in.p \\
out.h &= hcv \\
tcv &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=hcv\right) \\
wall.qdot &= q \\
m &= rho\cdot v
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TwoPhaseChamber: heated capacitive control volume in its steady limit —
// der(P)=0 gives mass balance, der(hcv)=0 gives the energy balance
// hcv = h_in + UA*(Twall - Tcv)/mdot, an evaporating chamber at 350 kPa.
TwoPhaseSourcePH SRC(mdot = 0.02, P = 350000, h = 280000)
TwoPhaseChamber  CH(fluid$ = R134a, V = 0.003, C = 1e-7, UA = 50, P0 = 350000, h0 = 320000)
ThermalSource    WALL(T = 300)
TwoPhaseSink     SNK()
connect(SRC.out, CH.in)
connect(CH.wall, WALL.port)
connect(CH.out, SNK.in)
q     = CH.Q
h_out = SNK.h
t_cv  = CH.Tcv

{ CHECK ch.hcv 334554.8197 0.33455481970517337 }
{ CHECK ch.in.h 280000 0.27999999999999997 }
{ CHECK ch.in.mdot 0.02 2e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ch.hcv = 334554.8197
ch.in.h = 280000
ch.in.mdot = 0.02
```

<!-- verified-reference-example:end -->
