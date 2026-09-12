---
name: HeatingCoil
category: Component (moistair)
summary: Heats a humid-air stream at constant humidity ratio.
related: []
examples: []
tags: [heatingcoil, component, moistair, acausal]
---

# HeatingCoil

Heats a humid-air stream at constant humidity ratio.

## Domain

A reusable **acausal moistair-domain** component — its humid-air ports carry pressure `P`, dry-air mass-flow `ṁ_da`, enthalpy `h`, and humidity ratio `W`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
HeatingCoil inst(Q, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Q` | Number | Heat input [W]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.w &= in.w \\
out.h &= in.h + \frac{q}{in.mdot}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [out] = MASrc(W, h0, mdot, P, domain$ = moistair)
port(out)
  out.P    = P
  out.mdot = mdot
  out.W    = W
  out.h    = h0
end
MASrc      SRC(W=0.006, h0=40000, mdot=2, P=101325)
HeatingCoil HC(Q=10000)
connect(SRC.out, HC.in)

{ CHECK hc.in.h 40000 0.04 }
{ CHECK hc.in.mdot 2 0.000002 }
{ CHECK hc.in.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
hc.in.h = 40000
hc.in.mdot = 2
hc.in.p = 101325
```

<!-- verified-reference-example:end -->
