---
name: Humidifier
category: Component (moistair)
summary: Adds moisture to a humid-air stream, raising its humidity ratio.
related: []
examples: []
tags: [humidifier, component, moistair, acausal]
---

# Humidifier

Adds moisture to a humid-air stream, raising its humidity ratio.

## Domain

A reusable **acausal moistair-domain** component — its humid-air ports carry pressure `P`, dry-air mass-flow `ṁ_da`, enthalpy `h`, and humidity ratio `W`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Humidifier inst(mdot_w, h_w, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `mdot_w` | Number | Water/coolant mass flow [kg/s]. |
| `h_w` | Number | Wall heat-transfer coefficient [W/m²·K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.w &= in.w + \frac{mdot_{w}}{in.mdot} \\
out.h &= in.h + \frac{mdot_{w}\cdot h_{w}}{in.mdot}
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
