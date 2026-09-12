---
name: SteamReliefValve
category: Component (twophase)
summary: A steam relief valve venting above the set pressure.
related: []
examples: []
tags: [steamreliefvalve, component, twophase, acausal]
---

# SteamReliefValve

A steam relief valve venting above the set pressure.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
SteamReliefValve inst(fluid$, A, Pset, Cd, kgas, Rgas, eps, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `A` | Number | Area [m²]. |
| `Pset` | Number | Set pressure [Pa]. |
| `Cd` | Number | Discharge coefficient. |
| `kgas` | Number | Gas specific-heat ratio. |
| `Rgas` | Number | Specific gas constant [J/kg·K]. |
| `eps` | Number | Effectiveness / roughness. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
opening &= 0.5\,\left(1 + \tanh\left(\frac{in.p - pset}{eps}\right)\right) \\
t0v &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=1\right) \\
prc &= \left(\frac{2}{kgas + 1}\right)^{\frac{kgas}{kgas - 1}} \\
mdot_{ch} &= cd\cdot a\cdot in.p\cdot \sqrt{\frac{kgas}{rgas\cdot t0v}}\cdot \left(\frac{2}{kgas + 1}\right)^{\frac{kgas + 1}{2\,\left(kgas - 1\right)}} \\
ratio &= \frac{\text{min}\left(\text{max}\left(\frac{out.p}{in.p}, prc\right), 1\right) - prc}{1 - prc} \\
efact &= 1 - ratio^{2} \\
in.mdot &= opening\cdot mdot_{ch}\cdot efact
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
