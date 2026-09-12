---
name: SigMin
category: Component (signal)
summary: Acausal signal-domain component SigMin with ports in1, in2, out.
related: []
examples: []
tags: [sigmin, component, signal, acausal]
references: []
generated: true
---

# SigMin

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigMin inst(param = value, ...)
```

## Ports

`in1`, `in2`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= \text{min}\left(in1.sig, in2.sig\right)
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
