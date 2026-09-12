---
name: MoistAirSource
category: Component (moistair)
summary: A humid-air boundary supplying a stream of set state.
related: []
examples: []
tags: [moistairsource, component, moistair, acausal]
---

# MoistAirSource

A humid-air boundary supplying a stream of set state.

## Domain

A reusable **acausal moistair-domain** component — its humid-air ports carry pressure `P`, dry-air mass-flow `ṁ_da`, enthalpy `h`, and humidity ratio `W`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`out`

## Usage

```
MoistAirSource inst(P, T, W, mdot, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `P` | Number | Pressure [Pa]. |
| `T` | Number | Temperature [K]. |
| `W` | Number | Humidity ratio [kg/kg] / work [W]. |
| `mdot` | Number | Mass flow rate [kg/s]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.p &= p \\
out.mdot &= mdot \\
out.w &= w \\
out.h &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t, p=p, w=w\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
MoistAirSource SRC(P=101325, T=295, W=0.005, mdot=2)
Humidifier     HUM(mdot_w=0.002, h_w=2.5e6)
MoistAirSink   SNK()
connect(SRC.out, HUM.in)
connect(HUM.out, SNK.in)

{ CHECK hum.in.h 34682.93902 0.03468293902027844 }
{ CHECK hum.in.mdot 2 0.000002 }
{ CHECK hum.in.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
hum.in.h = 34682.93902
hum.in.mdot = 2
hum.in.p = 101325
```

<!-- verified-reference-example:end -->
