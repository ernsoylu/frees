---
name: SigDiff
category: Component (signal)
summary: "Difference in1 − in2 (the feedback comparator: connect the setpoint to in1, the measurement to in2)."
related: []
examples: []
tags: [sigdiff, component, signal, acausal]
references: []
---

# SigDiff

Difference in1 − in2 (the feedback comparator: connect the setpoint to in1, the measurement to in2).

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigDiff inst(param = value, ...)
```

## Ports

`in1`, `in2`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= in1.sig - in2.sig
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
SigConstant R(k=1)
SigGain     FWD(k=8)
SigDiff     ERR()
connect(R.out, ERR.in1)
connect(ERR.out, FWD.in)
connect(FWD.out, ERR.in2)

{ CHECK err.in2.sig 0.8888888889 8.888888888888888e-7 }
{ CHECK err.in1.sig 1 0.000001 }
{ CHECK err.out.sig 0.1111111111 1.111111111111111e-7 }

```

Expected output (selected solution values; numerical rounding may vary):

```text
err.inm.sig = 0.8888888889
err.inp.sig = 1
err.out.sig = 0.1111111111
```

<!-- verified-reference-example:end -->
