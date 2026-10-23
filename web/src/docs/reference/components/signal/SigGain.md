---
name: SigGain
category: Component (signal)
summary: Multiplies the input signal by a constant gain k.
related: []
examples: []
tags: [siggain, component, signal, acausal]
references: []
---

# SigGain

Multiplies the input signal by a constant gain k.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigGain inst(k)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `k` | Number | Gain, output per unit input. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= k\cdot in.sig
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
SigConstant SRC(k=2)
SigGain  A(k=3)
SigGain  B(k=5)
connect(SRC.out, A.in, B.in)

{ CHECK a.in.sig 2 0.000002 }
{ CHECK a.out.sig 6 0.000006 }
{ CHECK b.in.sig 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a.in.sig = 2
a.out.sig = 6
b.in.sig = 2
```

<!-- verified-reference-example:end -->
