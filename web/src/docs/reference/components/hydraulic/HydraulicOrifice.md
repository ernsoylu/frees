---
name: HydraulicOrifice
category: Component (hydraulic)
summary: A hydraulic orifice metering flow by ṁ ∝ √Δp.
related: []
examples: [hydraulic-metering-restriction]
tags: [hydraulicorifice, component, hydraulic, acausal]
---

# HydraulicOrifice

A hydraulic orifice metering flow by `ṁ ∝ √Δp`.

## Domain

A reusable **acausal hydraulic-domain** component — its oil-hydraulic ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
HydraulicOrifice inst(CdA, rho, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `CdA` | Number | Discharge coefficient × area Cd·A [m²]. |
| `rho` | Number | Density [kg/m³]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
in.mdot\cdot \left|in.mdot\right| &= cda^{2}\cdot 2\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
HydraulicSupply  SUP(P=10000000)
HydraulicOrifice ORI(CdA=1e-5, rho=850)
HydraulicTank    TNK(P=0)
connect(SUP.out, ORI.in)
connect(ORI.out, TNK.port)

{ CHECK ori.in.h 0 1e-8 }
{ CHECK ori.in.mdot 1.303840481 0.00000130384048104053 }
{ CHECK ori.in.p 10000000 10 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ori.in.h = 0
ori.in.mdot = 1.303840481
ori.in.p = 10000000
```

<!-- verified-reference-example:end -->
