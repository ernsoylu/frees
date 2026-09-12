---
name: SigSwitch
category: Component (signal)
summary: Acausal signal-domain component SigSwitch with ports in1, in2, ctrl, out.
related: []
examples: []
tags: [sigswitch, component, signal, acausal]
references: []
generated: true
---

# SigSwitch

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigSwitch inst(thresh, eps)
```

## Ports

`in1`, `in2`, `ctrl`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `thresh` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
wgt &= 0.5\,\left(1 + \tanh\left(\frac{ctrl.sig - thresh}{eps}\right)\right) \\
out.sig &= wgt\cdot in1.sig + \left(1 - wgt\right)\cdot in2.sig
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Smooth relay & 2-way switch, steady (no time dependence).
// EXPECT r1.out.sig = 10 tol 1e-6
// EXPECT r2.out.sig = 0 tol 1e-6
// EXPECT sw1.out.sig = 7 tol 1e-6
// EXPECT sw2.out.sig = -2 tol 1e-6
SigConstant HIGHIN(k=3)
SigConstant LOWIN(k=1)
SigConstant CTRL1(k=1)
SigConstant CTRL0(k=0)
SigConstant V7(k=7)
SigConstant VM2(k=-2)
SigRelay R1(thresh=2, low=0, high=10, eps=0.001)
SigRelay R2(thresh=2, low=0, high=10, eps=0.001)
SigSwitch SW1(thresh=0.5, eps=0.001)
SigSwitch SW2(thresh=0.5, eps=0.001)
connect(HIGHIN.out, R1.in)
connect(LOWIN.out, R2.in)
connect(V7.out, SW1.in1, SW2.in1)
connect(VM2.out, SW1.in2, SW2.in2)
connect(CTRL1.out, SW1.ctrl)
connect(CTRL0.out, SW2.ctrl)

{ CHECK ctrl0.out.sig 0 1e-8 }
{ CHECK ctrl1.out.sig 1 0.000001 }
{ CHECK highin.out.sig 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ctrl0.out.sig = 0
ctrl1.out.sig = 1
highin.out.sig = 3
```

<!-- verified-reference-example:end -->
