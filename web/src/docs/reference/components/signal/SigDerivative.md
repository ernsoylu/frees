---
name: SigDerivative
category: Component (signal)
summary: Acausal signal-domain component SigDerivative with ports in, out.
related: []
examples: []
tags: [sigderivative, component, signal, acausal]
references: []
generated: true
---

# SigDerivative

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigDerivative inst(tau, y0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `tau` | Number |
| `y0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(y\right) &= \frac{in.sig - y}{tau} \\
\text{init}\left(y\right) &= y0 \\
out.sig &= \frac{in.sig - y}{tau}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigDerivative steady: the filter state settles on the constant input, so the
// realizable derivative reads exactly zero.
// EXPECT yd = 0 tol 1e-9
SigConstant   U(k = 4)
SigDerivative DV(tau = 0.1, y0 = 0)
connect(U.out, DV.in)
yd = DV.out.sig

{ CHECK dv.in.sig 4 0.000004 }
{ CHECK dv.out.sig 0 1e-8 }
{ CHECK dv.y 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dv.in.sig = 4
dv.out.sig = 0
dv.y = 4
```

<!-- verified-reference-example:end -->
