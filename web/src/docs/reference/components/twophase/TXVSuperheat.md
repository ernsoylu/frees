---
name: TXVSuperheat
category: Component (twophase)
summary: A thermostatic expansion valve that meters flow to hold a target superheat.
related: []
examples: []
tags: [txvsuperheat, component, twophase, acausal]
---

# TXVSuperheat

A thermostatic expansion valve that meters flow to hold a target superheat.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `bulb`

## Usage

```
TXVSuperheat inst(fluid$, Kv, SH_set, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `Kv` | Number | Flow coefficient. |
| `SH_set` | Number | Target superheat [K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
bulb.qdot &= 0 \\
t_{sat} &= \text{Temperature}\left(\mathrm{fluid}, =out.p, p=1\right) \\
sh &= bulb.t - t_{sat} \\
in.mdot &= kv\cdot \left(sh - sh_{set}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhasePressureSource HI(fluid$=R134a, P=900000, x=0)
TXVSuperheat V(fluid$=R134a, Kv=5e-7, SH_set=5)
TwoPhasePressureSink LO(P=350000)
ThermalSource BULB(T=288)
connect(HI.out, V.in)
connect(V.out, LO.in)
connect(V.bulb, BULB.port)

{ CHECK bulb.port.qdot 0 1e-8 }
{ CHECK bulb.port.t 288 0.000288 }
{ CHECK hi.out.h 249779.7946 0.24977979464484554 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bulb.port.qdot = 0
bulb.port.t = 288
hi.out.h = 249779.7946
```

<!-- verified-reference-example:end -->
