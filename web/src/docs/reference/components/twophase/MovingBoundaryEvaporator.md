---
name: MovingBoundaryEvaporator
category: Component (twophase)
summary: A moving-boundary evaporator tracking the two-phase/superheat zone lengths.
related: []
examples: []
tags: [movingboundaryevaporator, component, twophase, acausal]
---

# MovingBoundaryEvaporator

A moving-boundary evaporator tracking the two-phase/superheat zone lengths.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `wall`

## Usage

```
MovingBoundaryEvaporator inst(fluid$, U_tp, U_sh, D, L, eps_zone, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `U_tp` | Number | Two-phase-zone overall coefficient [W/m²·K]. |
| `U_sh` | Number | Superheat-zone overall coefficient [W/m²·K]. |
| `D` | Number | Diameter [m]. |
| `L` | Number | Length [m]. |
| `eps_zone` | Number | Zone-collapse smoothing width. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
tsat &= \text{T\_sat}\left(\mathrm{fluid}, =in.p\right) \\
hg &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=1\right) \\
l_{need} &= \frac{in.mdot\cdot \left(hg - in.h\right)}{u_{tp}\cdot 3.141592653589793\cdot d\cdot \left(wall.t - tsat\right)} \\
l_{tp} &= 0.5\,\left(l_{need} + l - \sqrt{\left(l_{need} - l\right)^{2} + eps_{zone}^{2}}\right) \\
q_{tp} &= u_{tp}\cdot 3.141592653589793\cdot d\cdot l_{tp}\cdot \left(wall.t - tsat\right) \\
l_{sh} &= l - l_{tp} \\
r_{sh} &= \text{zone\_ramp}\left(l_{sh}, eps_{zone}\right) \\
t_{out} &= \text{Temperature}\left(\mathrm{fluid}, =out.p, p=out.h\right) \\
q_{sh} &= u_{sh}\cdot 3.141592653589793\cdot d\cdot l_{sh}\cdot \left(wall.t - 0.5\,\left(tsat + t_{out}\right)\right)\cdot r_{sh} \\
out.h &= in.h + \frac{q_{tp} + q_{sh}}{in.mdot} \\
q &= q_{tp} + q_{sh} \\
wall.qdot &= q \\
sh &= t_{out} - tsat
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
MovingBoundaryEvaporator EV(fluid$=R134a, U_tp=2000, U_sh=200, D=0.01, L=5, eps_zone=0.01)
TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=350000, x=0.25)
TwoPhaseSink SNK()
ThermalSource WALL(T=292)
connect(SRC.out, EV.in)
connect(EV.out, SNK.in)
connect(EV.wall, WALL.port)

{ CHECK ev.hg 401508.3388 0.4015083387584498 }
{ CHECK ev.in.h 255469.7741 0.2554697741338869 }
{ CHECK ev.in.mdot 0.02 2e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ev.hg = 401508.3388
ev.in.h = 255469.7741
ev.in.mdot = 0.02
```

<!-- verified-reference-example:end -->
