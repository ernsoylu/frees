---
name: SigDerivative
category: Component (signal)
summary: "Filtered derivative s/(1+τs): exact derivative in the limit τ→0, realizable (proper) for τ>0."
related: []
examples: []
tags: [sigderivative, component, signal, acausal]
references: []
---

# SigDerivative

Filtered derivative s/(1+τs): exact derivative in the limit τ→0, realizable (proper) for τ>0.

The state tracks the input; the output is the residual.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigDerivative inst(tau, y0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `tau` | Number | Derivative filter time constant [s]. |
| `y0` | Number | Initial filter state, in the input’s units. |

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
