---
name: LiquidSink
category: Component (liquid)
summary: A liquid boundary absorbing a stream.
related: []
examples: [ev-thermal-management]
tags: [liquidsink, component, liquid, acausal]
---

# LiquidSink

A liquid boundary absorbing a stream.

## Domain

A reusable **acausal liquid-domain** component — its single-phase liquid-coolant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`

## Usage

```
LiquidSink inst(domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
mdot &= in.mdot \\
p &= in.p \\
h &= in.h
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
LiquidSource S(fluid$=Water, mdot=0.1, P=200000, T=300)
LiquidColdPlate CP(Q=2000)
LiquidSink K()
connect(S.out, CP.in)
connect(CP.out, K.in)

{ CHECK cp.in.h 112745.7491 0.11274574907657911 }
{ CHECK cp.in.mdot 0.1 1e-7 }
{ CHECK cp.in.p 200000 0.19999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cp.in.h = 112745.7491
cp.in.mdot = 0.1
cp.in.p = 200000
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: ev-thermal-management]
