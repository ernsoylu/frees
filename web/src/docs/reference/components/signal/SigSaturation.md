---
name: SigSaturation
category: Component (signal)
summary: Clamps the input signal to the range [lo, hi].
related: []
examples: []
tags: [sigsaturation, component, signal, acausal]
references: []
---

# SigSaturation

Clamps the input signal to the range [lo, hi].

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigSaturation inst(lo, hi)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `lo` | Number | Lower limit, in the signal’s units. |
| `hi` | Number | Upper limit, in the signal’s units. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= \text{min}\left(\text{max}\left(in.sig, lo\right), hi\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Domain family: SIGNAL (signal.frees). Causal one-member `sig` bond.
SigConstant   K1(s1, k = 3)
SigConstant   K2(s2, k = 4)
SigSum        SM(s1, s2, s3)
SigGain       GN(s3, s4, k = 2.5)
SigSaturation ST(s4, s5, lo = -10, hi = 12)
SigProduct    PR(s1, s2, s6)
SigMin        MN(s5, s6, s7)
y_sum = s3.sig
y_sat = s5.sig
y_min = s7.sig

{ CHECK s1.sig 3 0.000003 }
{ CHECK s2.sig 4 0.000004 }
{ CHECK s3.sig 7 0.000007 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
s1.sig = 3
s2.sig = 4
s3.sig = 7
```

<!-- verified-reference-example:end -->
