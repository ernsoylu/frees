---
name: BoilingVessel
category: Component (twophase)
summary: A rigid vessel boiling a two-phase fluid (rigid two-phase boil-off).
related: []
examples: [pressure-cooker]
tags: [boilingvessel, component, twophase, acausal]
---

# BoilingVessel

A rigid vessel boiling a two-phase fluid (rigid two-phase boil-off).

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`vent`, `wall`

## Usage

```
BoilingVessel inst(fluid$, V, m0, T0, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `V` | Number | Volume [m³]. |
| `m0` | Number | Initial mass [kg]. |
| `T0` | Number | Reference/initial temperature [K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
\text{der}\left(mass\right) &= -vent.mdot \\
\text{init}\left(mass\right) &= m0 \\
\text{der}\left(utot\right) &= wall.qdot - vent.mdot\cdot vent.h \\
\text{init}\left(utot\right) &= m0\cdot \text{Intenergy}\left(\mathrm{fluid}, =t0, t=0\right) \\
rho_{cv} &= \frac{mass}{v} \\
u_{cv} &= \frac{utot}{mass} \\
vent.p &= \text{Pressure}\left(\mathrm{fluid}, =rho_{cv}, d=u_{cv}\right) \\
t_{cv} &= \text{Temperature}\left(\mathrm{fluid}, =rho_{cv}, d=u_{cv}\right) \\
x_{cv} &= \text{Quality}\left(\mathrm{fluid}, =rho_{cv}, d=u_{cv}\right) \\
vent.h &= \text{Enthalpy}\left(\mathrm{fluid}, =vent.p, p=1\right) \\
wall.t &= t_{cv}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
BoilingVessel   COOK(fluid$=Water, V=0.005, m0=3.0, T0=288.15)
SteamReliefValve PRV(fluid$=Water, A=2e-6, Pset=111458, Cd=0.8, kgas=1.14, Rgas=461.5, eps=1000)
TwoPhasePressureSink ATM(P=101325)

connect(COOK.vent, PRV.in)
connect(PRV.out, ATM.in)
COOK.wall.Qdot = 3000          // 3 kW electric heater (I = 3000/220 = 13.6 A)

DYNAMIC cook (method = ida, time = 0 .. 1200, points = 25, rtol = 1e-5, atol = 1e-4)
END

{ CHECK cook.wall.qdot 3000 0.003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cook.wall.qdot = 3000
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: pressure-cooker]
