---
name: LiquidPump
category: Component (liquid)
summary: A single-phase liquid pump.
related: [LiquidPumpMap, Pump]
examples: [ev-thermal-management]
tags: [pump, liquid-pump-family, liquidpump, data:eta, ports:in-out, flow-closed, energy-work, steady, liquid, component, acausal]
---

# LiquidPump

A single-phase liquid pump.

## Domain

A reusable **acausal liquid-domain** component — its single-phase liquid-coolant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
LiquidPump inst(eta, fluid$, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `eta` | Number | Efficiency (0–1). |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
v &= \text{Volume}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
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
LiquidSource S(fluid$=Water, mdot=0.1, P=200000, T=300)
LiquidPump P(eta=0.7, fluid$=Water)
LiquidSink K()
connect(S.out, P.in)
connect(P.out, K.in)
P.out.P = 400000

{ CHECK k.h 113032.4378 0.11303243775057979 }
{ CHECK k.in.h 113032.4378 0.11303243775057979 }
{ CHECK k.in.mdot 0.1 1e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
k.h = 113032.4378
k.in.h = 113032.4378
k.in.mdot = 0.1
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: ev-thermal-management]
