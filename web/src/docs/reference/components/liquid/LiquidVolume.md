---
name: LiquidVolume
category: Component (liquid)
summary: A single-phase liquid control volume.
related: []
examples: []
tags: [liquidvolume, component, liquid, acausal]
---

# LiquidVolume

A single-phase liquid control volume.

## Domain

A reusable **acausal liquid-domain** component — its single-phase liquid-coolant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
LiquidVolume inst(C, P0, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `C` | Number | Capacitance [F]. |
| `P0` | Number | Reference/initial pressure [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.h &= in.h \\
\text{der}\left(in.p\right) &= \frac{in.mdot - out.mdot}{c} \\
\text{init}\left(in.p\right) &= p0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// LiquidVolume with no DYNAMIC block: der(in.P) takes the steady branch,
// recovering in.mdot = out.mdot through the compliance node.
LiquidSource LS(l1, fluid$ = Water, mdot = 0.5, P = 250000, T = 300)
LiquidVolume LV(l1, l2, C = 1e-8, P0 = 250000)
LiquidSink   SK(l2)

l2.P  = 250000
m_out = SK.mdot
h_out = SK.h

{ CHECK h_out 112791.7811 0.11279178109461951 }
{ CHECK l1.h 112791.7811 0.11279178109461951 }
{ CHECK l1.mdot 0.5 5e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h_out = 112791.7811 [J/kg]
l1.h = 112791.7811
l1.mdot = 0.5
```

<!-- verified-reference-example:end -->
