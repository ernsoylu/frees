---
name: SigSum
category: Component (signal)
summary: Sum of two signals, in1 + in2.
related: []
examples: []
tags: [sigsum, component, signal, acausal]
references: []
---

# SigSum

Sum of two signals, in1 + in2.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigSum inst(param = value, ...)
```

## Ports

`in1`, `in2`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= in1.sig + in2.sig
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Add two constant signals: y = 2 + 3. }
SigConstant A(k=2)
SigConstant B(k=3)
SigSum      S()
connect(A.out, S.in1)
connect(B.out, S.in2)

y = S.out.sig

{ CHECK y 5 0.000005 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
y = 5
```

<!-- verified-reference-example:end -->
