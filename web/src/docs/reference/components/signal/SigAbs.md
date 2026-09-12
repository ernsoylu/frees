---
name: SigAbs
category: Component (signal)
summary: Acausal signal-domain component SigAbs with ports in, out.
related: []
examples: []
tags: [sigabs, component, signal, acausal]
references: []
generated: true
---

# SigAbs

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigAbs inst(param = value, ...)
```

## Ports

`in`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= \left|in.sig\right|
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// A signal node with one driver and three readers: signal is a broadcast
// domain, so every member takes the same value and there is no flow sum.
SigConstant K1(k = 2.5)
SigGain     G1(k = 4)
SigGain     G2(k = 10)
SigAbs      A1()
connect(K1.out, G1.in, G2.in, A1.in)
g1 = G1.out.sig
g2 = G2.out.sig
a1 = A1.out.sig
s  = K1.out.sig

{ CHECK a1 2.5 0.0000024999999999999998 }
{ CHECK a1.in.sig 2.5 0.0000024999999999999998 }
{ CHECK a1.out.sig 2.5 0.0000024999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a1 = 2.5
a1.in.sig = 2.5
a1.out.sig = 2.5
```

<!-- verified-reference-example:end -->
