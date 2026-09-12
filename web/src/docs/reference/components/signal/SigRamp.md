---
name: SigRamp
category: Component (signal)
summary: Acausal signal-domain component SigRamp with ports out.
related: []
examples: []
tags: [sigramp, component, signal, acausal]
references: []
generated: true
---

# SigRamp

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigRamp inst(t0, slope, eps)
```

## Ports

`out`

## Parameters

| Parameter | Type |
| --- | --- |
| `t0` | Number |
| `slope` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
dt &= time - t0 \\
out.sig &= slope\cdot 0.5\cdot \left(dt + \sqrt{dt^{2} + eps^{2}}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigRamp: slope-2 ramp from t0 = 1 s sampled at t = 3 s -> slope*dt = 4
// (the C1 hinge of width 1e-3 adds ~1.25e-7).
// EXPECT y = 4 tol 1e-5
SigRamp RA(t0 = 1, slope = 2, eps = 1e-3)
time = 3
y = RA.out.sig

{ CHECK ra.dt 2 0.000002 }
{ CHECK ra.out.sig 4.00000025 0.000004000000249999984 }
{ CHECK y 4.00000025 0.000004000000249999984 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ra.dt = 2
ra.out.sig = 4.00000025
y = 4.00000025
```

<!-- verified-reference-example:end -->
