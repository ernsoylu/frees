---
name: Pump
category: Component (fluid)
summary: Raises the pressure of a liquid stream, computing the work from a pump efficiency.
related: [PumpMap, LiquidPump]
examples: [pump-sizing, rankine-cycle]
tags: [pump, pump-family, data:eta, ports:in-out, flow-closed, energy-work, steady, component, fluid, acausal]
---

# Pump

Raises the pressure of a liquid stream, computing the work from a pump efficiency.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Pump inst(eta, fluid$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `eta` | Number | Efficiency (0–1). |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
v &= \text{Volume}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
out.mdot &= in.mdot \\
out.h &= in.h + \frac{v\cdot \left(out.p - in.p\right)}{eta} \\
w &= in.mdot\cdot \left(out.h - in.h\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Raise 2 kg/s of 20 C water from 1 bar to 6 bar with a 75 %-efficient pump. }
Source SRC(fluid$=Water, mdot=2, P=100000, T=293.15)
Pump   P1(eta=0.75, fluid$=Water)
Sink   SNK()
connect(SRC.out, P1.in)
connect(P1.out, SNK.in)
P1.out.P = 600000

W_shaft = P1.W      { shaft power absorbed, W }
dh = P1.out.h - P1.in.h

{ CHECK W_shaft 1335.728905 0.001335728905 }
{ CHECK dh 667.8644525 0.0006678644525 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
W_shaft = 1335.728905
dh = 667.8644525
```

<!-- verified-reference-example:end -->

Related gallery example:

[Run: pump-sizing]
