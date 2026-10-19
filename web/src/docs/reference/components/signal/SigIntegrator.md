---
name: SigIntegrator
category: Component (signal)
summary: Integrates the input signal over time from the initial value y0.
related: []
examples: []
tags: [sigintegrator, component, signal, acausal]
references: []
---

# SigIntegrator

Integrates the input signal over time from the initial value y0.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigIntegrator inst(y0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `y0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(y\right) &= in.sig \\
\text{init}\left(y\right) &= y0 \\
out.sig &= y
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Simulate a component transient and inspect its final state

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// SigIntegrator: constant 2 integrated from y0 = 1 over 2 s -> y(2) = 5.
// (No steady form exists: der(y) = in.sig would force the input to zero and
// leave y free, so this one is inherently DYNAMIC.)
SigConstant   U(k = 2)
SigIntegrator SI(y0 = 1)
connect(U.out, SI.in)

DYNAMIC run (method = ode45, time = 0 .. 2, points = 5)
END

final_state = FinalValue('si$y')

{ CHECK final_state 5 0.0000049999999999999614 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
final_state = 5
```

<!-- verified-reference-example:end -->
