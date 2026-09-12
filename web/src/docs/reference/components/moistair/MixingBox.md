---
name: MixingBox
category: Component (moistair)
summary: Mixes two humid-air streams with flow-weighted enthalpy and humidity ratio.
related: []
examples: []
tags: [mixingbox, component, moistair, acausal]
---

# MixingBox

Mixes two humid-air streams with flow-weighted enthalpy and humidity ratio.

## Domain

A reusable **acausal moistair-domain** component — its humid-air ports carry pressure `P`, dry-air mass-flow `ṁ_da`, enthalpy `h`, and humidity ratio `W`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in1`, `in2`, `out`

## Usage

```
MixingBox inst(domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.p &= in1.p \\
out.mdot &= in1.mdot + in2.mdot \\
out.mdot\cdot out.w &= in1.mdot\cdot in1.w + in2.mdot\cdot in2.w \\
out.mdot\cdot out.h &= in1.mdot\cdot in1.h + in2.mdot\cdot in2.h
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
MASrc     A(W=0.010, h0=60000, mdot=2, P=101325)
MASrc     B(W=0.004, h0=30000, mdot=1, P=101325)
MixingBox MB(a, b, c)
connect(A.out, MB.in1)
connect(B.out, MB.in2)

{ CHECK a.h 60000 0.06 }
{ CHECK a.mdot 2 0.000002 }
{ CHECK a.out.h 60000 0.06 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a.h = 60000
a.mdot = 2
a.out.h = 60000
```

<!-- verified-reference-example:end -->
