---
name: SigLeadLag
category: Component (signal)
summary: Lead-lag (1+T1·s)/(1+T2·s), the classical compensator.
related: []
examples: []
tags: [sigleadlag, component, signal, acausal]
references: []
---

# SigLeadLag

Lead-lag (1+T1·s)/(1+T2·s), the classical compensator.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigLeadLag inst(T1, T2, y0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `T1` | Number | Lead (numerator) time constant [s]. |
| `T2` | Number | Lag (denominator) time constant [s]. |
| `y0` | Number | Initial state, in the signal’s units. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(x\right) &= \frac{in.sig - x}{t2} \\
\text{init}\left(x\right) &= y0 \\
out.sig &= x + \frac{t1}{t2}\cdot \left(in.sig - x\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigLeadLag steady: x -> in, out = x + (T1/T2)*(in - x) = in (DC gain 1).
// EXPECT y = 2 tol 1e-9
SigConstant U(k = 2)
SigLeadLag  LL(T1 = 0.5, T2 = 2, y0 = 0)
connect(U.out, LL.in)
y = LL.out.sig

{ CHECK ll.in.sig 2 0.000002 }
{ CHECK ll.out.sig 2 0.000002 }
{ CHECK ll.x 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ll.in.sig = 2
ll.out.sig = 2
ll.x = 2
```

<!-- verified-reference-example:end -->
