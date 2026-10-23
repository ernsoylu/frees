---
name: SigStep
category: Component (signal)
summary: Smooth step from `before` to `after` at t0.
related: []
examples: []
tags: [sigstep, component, signal, acausal]
references: []
---

# SigStep

Smooth step from `before` to `after` at t0.

eps [s] is the C∞ tanh edge width — pick it small against the plant's fastest time constant.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigStep inst(t0, before, after, eps)
```

## Ports

`out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `t0` | Number | Step time, in seconds of `time`. |
| `before` | Number | Level before the step, in the signal’s units. |
| `after` | Number | Level after the step, in the signal’s units. |
| `eps` | Number | Edge smoothing width, in seconds of `time`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= before + \left(after - before\right)\cdot 0.5\cdot \left(1 + \tanh\left(\frac{time - t0}{eps}\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigStep: smooth 0 -> 10 step at t0 = 0.5 s, sampled 10 edge-widths past the
// edge, so tanh(10) leaves y within 5e-9 of the after level.
// EXPECT y = 10 tol 1e-6
SigStep ST(t0 = 0.5, before = 0, after = 10, eps = 0.05)
time = 1.0
y = ST.out.sig

{ CHECK st.out.sig 9.999999979 0.000009999999979388462 }
{ CHECK y 9.999999979 0.000009999999979388462 }
{ CHECK time 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
st.out.sig = 9.999999979
y = 9.999999979
time = 1
```

<!-- verified-reference-example:end -->
