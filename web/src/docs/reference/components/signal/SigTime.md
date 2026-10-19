---
name: SigTime
category: Component (signal)
summary: "The clock: emits the simulation time itself."
related: []
examples: []
tags: [sigtime, component, signal, acausal]
references: []
---

# SigTime

The clock: emits the simulation time itself.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigTime inst(param = value, ...)
```

## Ports

`out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= time
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigTime: the clock source read at a pinned steady instant (time is an
// ordinary global in a steady solve).
// EXPECT y = 2.5 tol 1e-12
SigTime CLK()
time = 2.5
y = CLK.out.sig

{ CHECK clk.out.sig 2.5 0.0000024999999999999998 }
{ CHECK y 2.5 0.0000024999999999999998 }
{ CHECK time 2.5 0.0000024999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
clk.out.sig = 2.5
y = 2.5
time = 2.5
```

<!-- verified-reference-example:end -->
