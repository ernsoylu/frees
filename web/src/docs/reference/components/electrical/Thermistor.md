---
name: Thermistor
category: Component (electrical)
summary: "NTC thermistor, beta model R = R0·exp(B·(1/T − 1/T0)) at its heat-port temperature, with self-heating through that port."
related: [ThermalSource, Convection, ThermalMass]
examples: []
tags: [thermistor, component, electrical, acausal]
references: ["J. Fraden, Handbook of Modern Sensors, 5th ed., Springer, 2016 (NTC thermistors, the beta model and self-heating)"]
---

# Thermistor

NTC thermistor, beta model R = R0·exp(B·(1/T − 1/T0)) at its heat-port temperature, with self-heating through that port.

## What it models

A negative-temperature-coefficient thermistor. Its resistance follows the beta equation at the temperature of its `heat` port, and its Joule heat I²R leaves through that port. Connect the port to a fixed temperature to use it as a sensor, or to a thermal mass and a convection path to see self-heating. The beta model is a two-point fit; the Steinhart–Hart equation is not used.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `heat`

## Usage

```
Thermistor inst(R0, B, T0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `R0` | Number | Resistance at the reference temperature [ohm]. |
| `B` | Number | Beta constant [K]. |
| `T0` | Number | Reference temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
r &= r0\cdot e^{b\cdot \left(\frac{1}{heat.t} - \frac{1}{t0}\right)} \\
p.v - n.v &= r\cdot p.i \\
p.i + n.i &= 0 \\
heat.qdot &= -\left(p.v - n.v\right)\cdot p.i
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — a thermistor divider at 50 °C

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A 10 kΩ, B = 3950 K NTC thermistor held at 50 °C sits below a 10 kΩ
  resistor across 5 V. Its resistance is R0·exp(B·(1/T − 1/T0)) = 3588.18 Ω,
  so the divider reads 5·R/(R + 10k) = 1.32033 V; the 0.486 mW it dissipates
  leaves through its heat port into the 50 °C block. }
VoltageSource VS(E=5 [V])
Resistor      RT(R=10000 [ohm])
Thermistor    TH(R0=10000 [ohm], B=3950 [K], T0=298.15 [K])
ThermalSource BLOCK(T=323.15 [K])
Ground        G()
connect(VS.p, RT.a)
connect(RT.b, TH.p)
connect(TH.n, VS.n, G.port)
connect(TH.heat, BLOCK.port)
R_ntc = TH.R
v_ntc = TH.p.V - TH.n.V
Q_ntc = BLOCK.port.Qdot

{ CHECK r_ntc 3588.182581929083 1e-06 }
{ CHECK v_ntc 1.3203320459871526 1e-09 }
{ CHECK q_ntc 0.0004858383518275142 1e-12 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
r_ntc = 3588.182581929083
v_ntc = 1.3203320459871526
q_ntc = 0.0004858383518275142
```

<!-- verified-reference-example:end -->
