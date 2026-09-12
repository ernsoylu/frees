---
name: CoolingCoil
category: Component (moistair)
summary: Cools and (below dew point) dehumidifies a humid-air stream.
related: []
examples: []
tags: [coolingcoil, component, moistair, acausal]
---

# CoolingCoil

Cools and (below dew point) dehumidifies a humid-air stream.

## Domain

A reusable **acausal moistair-domain** component — its humid-air ports carry pressure `P`, dry-air mass-flow `ṁ_da`, enthalpy `h`, and humidity ratio `W`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
CoolingCoil inst(Tout, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Tout` | Number | Outlet temperature [K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.w &= \text{Humrat}\left(\mathrm{airh2o}, t=tout, p=in.p, r=1\right) \\
out.h &= \text{Enthalpy}\left(\mathrm{airh2o}, t=tout, p=in.p, w=out.w\right) \\
q &= in.mdot\cdot \left(in.h - out.h\right) \\
q_{lat} &= in.mdot\cdot 2501000\cdot \left(in.w - out.w\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
MoistAirSource SRC(P=101325, T=303.15, W=0.012, mdot=1)
CoolingCoil    CC(Tout=283.15)
MoistAirSink   SNK()
connect(SRC.out, CC.in)
connect(CC.out, SNK.in)
T_out = Temperature(AirH2O, H=CC.out.h, P=101325, W=CC.out.W)

{ CHECK cc.in.h 60848.84667 0.06084884666848224 }
{ CHECK cc.in.mdot 1 0.000001 }
{ CHECK cc.in.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cc.in.h = 60848.84667
cc.in.mdot = 1
cc.in.p = 101325
```

<!-- verified-reference-example:end -->
