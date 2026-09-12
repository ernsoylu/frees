---
name: SigMax
category: Component (signal)
summary: Acausal signal-domain component SigMax with ports in1, in2, out.
related: []
examples: []
tags: [sigmax, component, signal, acausal]
references: []
generated: true
---

# SigMax

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigMax inst(param = value, ...)
```

## Ports

`in1`, `in2`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.sig &= \text{max}\left(in1.sig, in2.sig\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Pure-algebra math blocks: sources 3 and -4 pushed through every block.
// EXPECT g.out.sig = 6
// EXPECT bi.out.sig = 13
// EXPECT su.out.sig = -1
// EXPECT di.out.sig = 7
// EXPECT pr.out.sig = -12
// EXPECT dv.out.sig = -0.75
// EXPECT ab.out.sig = 4
// EXPECT mn.out.sig = -4
// EXPECT mx.out.sig = 3
// EXPECT sa.out.sig = 2
// EXPECT db1.out.sig = 2 tol 1e-5
// EXPECT db2.out.sig = -3 tol 1e-5
SigConstant A(k=3)
SigConstant B(k=-4)
SigGain       G(k=2)
SigBias       BI(b=10)
SigSum        SU()
SigDiff       DI()
SigProduct    PR()
SigDivide     DV()
SigAbs        AB()
SigMin        MN()
SigMax        MX()
SigSaturation SA(lo=-1, hi=2)
SigDeadband   DB1(w=1, eps=1e-6)
SigDeadband   DB2(w=1, eps=1e-6)
connect(A.out, G.in, BI.in, SU.in1, DI.in1, PR.in1, DV.in1, SA.in, DB1.in)
connect(B.out, SU.in2, DI.in2, PR.in2, DV.in2, AB.in, MN.in2, DB2.in)
connect(A.out, MN.in1, MX.in1)
connect(B.out, MX.in2)

{ CHECK a.out.sig 3 0.000003 }
{ CHECK ab.in.sig -4 0.000004 }
{ CHECK ab.out.sig 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a.out.sig = 3
ab.in.sig = -4
ab.out.sig = 4
```

<!-- verified-reference-example:end -->
