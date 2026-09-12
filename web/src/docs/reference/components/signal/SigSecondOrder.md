---
name: SigSecondOrder
category: Component (signal)
summary: Acausal signal-domain component SigSecondOrder with ports in, out.
related: []
examples: []
tags: [sigsecondorder, component, signal, acausal]
references: []
generated: true
---

# SigSecondOrder

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigSecondOrder inst(wn, zeta, y0, v0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `wn` | Number |
| `zeta` | Number |
| `y0` | Number |
| `v0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(y\right) &= v \\
\text{init}\left(y\right) &= y0 \\
\text{der}\left(v\right) &= wn^{2}\cdot \left(in.sig - y\right) - 2\,zeta\cdot wn\cdot v \\
\text{init}\left(v\right) &= v0 \\
out.sig &= y
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigSecondOrder steady: der(y) -> 0 gives v = 0, der(v) -> 0 gives y = in
// (unit DC gain of the tracking filter).
// EXPECT y = 1.5 tol 1e-9
SigConstant    U(k = 1.5)
SigSecondOrder SO(wn = 4, zeta = 0.7, y0 = 0, v0 = 0)
connect(U.out, SO.in)
y = SO.out.sig

{ CHECK so.in.sig 1.5 0.0000015 }
{ CHECK so.out.sig 1.5 0.0000015 }
{ CHECK so.v 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
so.in.sig = 1.5
so.out.sig = 1.5
so.v = 0
```

<!-- verified-reference-example:end -->
