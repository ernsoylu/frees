---
name: SigFirstOrder
category: Component (signal)
summary: Acausal signal-domain component SigFirstOrder with ports in, out.
related: []
examples: []
tags: [sigfirstorder, component, signal, acausal]
references: []
generated: true
---

# SigFirstOrder

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigFirstOrder inst(tau, y0)
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
out.sig &= y
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigFirstOrder steady: der -> 0 pins the lag state onto its input (DC gain 1).
// EXPECT y = 3 tol 1e-9
SigConstant   U(k = 3)
SigFirstOrder F1(tau = 0.5, y0 = 0)
connect(U.out, F1.in)
y = F1.out.sig

{ CHECK f1.in.sig 3 0.000003 }
{ CHECK f1.out.sig 3 0.000003 }
{ CHECK f1.y 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
f1.in.sig = 3
f1.out.sig = 3
f1.y = 3
```

<!-- verified-reference-example:end -->
