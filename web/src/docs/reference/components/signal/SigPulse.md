---
name: SigPulse
category: Component (signal)
summary: Single rectangular pulse from t0 for `width` seconds, level `low`→`high`, with tanh edges of width eps.
related: []
examples: []
tags: [sigpulse, component, signal, acausal]
references: []
---

# SigPulse

Single rectangular pulse from t0 for `width` seconds, level `low`→`high`, with tanh edges of width eps.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigPulse inst(t0, width, high, low, eps)
```

## Ports

`out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `t0` | Number | Pulse start time, in seconds of `time`. |
| `width` | Number | Pulse duration, in seconds of `time`. |
| `high` | Number | Level during the pulse, in the signal’s units. |
| `low` | Number | Level outside the pulse, in the signal’s units. |
| `eps` | Number | Edge smoothing width, in seconds of `time`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= low + \left(high - low\right)\cdot 0.5\cdot \left(\tanh\left(\frac{time - t0}{eps}\right) - \tanh\left(\frac{time - t0 - width}{eps}\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigPulse: 1 -> 5 pulse from t0 = 1 s for 2 s, sampled mid-pulse at t = 2 s
// (both tanh edges are 20 widths away).
// EXPECT y = 5 tol 1e-9
SigPulse PU(t0 = 1, width = 2, high = 5, low = 1, eps = 0.05)
time = 2
y = PU.out.sig

{ CHECK pu.out.sig 5 0.0000049999999999999996 }
{ CHECK y 5 0.0000049999999999999996 }
{ CHECK time 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
pu.out.sig = 5
y = 5
time = 2
```

<!-- verified-reference-example:end -->
