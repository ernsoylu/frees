---
name: MovingBoundaryCondenser
category: Component (twophase)
summary: A moving-boundary condenser tracking the two-phase/subcooled zone lengths.
related: []
examples: []
tags: [movingboundarycondenser, component, twophase, acausal]
---

# MovingBoundaryCondenser

A moving-boundary condenser tracking the two-phase/subcooled zone lengths.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `wall`

## Usage

```
MovingBoundaryCondenser inst(fluid$, U_cond, U_sc, D, L, eps_zone, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `U_cond` | Number | Condenser-zone overall coefficient [W/m²·K]. |
| `U_sc` | Number | Subcool-zone overall coefficient [W/m²·K]. |
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
hf &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=0\right) \\
l_{need} &= \frac{in.mdot\cdot \left(in.h - hf\right)}{u_{cond}\cdot 3.141592653589793\cdot d\cdot \left(tsat - wall.t\right)} \\
l_{cond} &= 0.5\,\left(l_{need} + l - \sqrt{\left(l_{need} - l\right)^{2} + eps_{zone}^{2}}\right) \\
q_{cond} &= u_{cond}\cdot 3.141592653589793\cdot d\cdot l_{cond}\cdot \left(tsat - wall.t\right) \\
l_{sc} &= l - l_{cond} \\
r_{sc} &= \text{zone\_ramp}\left(l_{sc}, eps_{zone}\right) \\
t_{out} &= \text{Temperature}\left(\mathrm{fluid}, =out.p, p=out.h\right) \\
q_{sc} &= u_{sc}\cdot 3.141592653589793\cdot d\cdot l_{sc}\cdot \left(0.5\,\left(tsat + t_{out}\right) - wall.t\right)\cdot r_{sc} \\
out.h &= in.h - \frac{q_{cond} + q_{sc}}{in.mdot} \\
q &= q_{cond} + q_{sc} \\
wall.qdot &= -q \\
sc &= tsat - t_{out}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
MovingBoundaryCondenser CD(fluid$=R134a, U_cond=2500, U_sc=300, D=0.01, L=8, eps_zone=0.01)
TwoPhaseSourcePH SRC(mdot=0.02, P=900000, h=445000)
TwoPhaseSink SNK()
ThermalSource WALL(T=300)
connect(SRC.out, CD.in)
connect(CD.out, SNK.in)
connect(CD.wall, WALL.port)

{ CHECK cd.hf 249779.7946 0.24977979464484554 }
{ CHECK cd.in.h 445000 0.445 }
{ CHECK cd.in.mdot 0.02 2e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cd.hf = 249779.7946
cd.in.h = 445000
cd.in.mdot = 0.02
```

<!-- verified-reference-example:end -->
