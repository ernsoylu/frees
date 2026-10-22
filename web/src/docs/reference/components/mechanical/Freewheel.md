---
name: Freewheel
category: Component (mechanical)
summary: "One-way clutch (freewheel/overrunning sprag): transmits a stiff viscous torque only while the driver overruns the driven side (dw > 0) — the C1 smooth-max hinge of width eps; free in the reverse direction."
related: []
examples: []
tags: [freewheel, component, mechanical, acausal]
references: []
---

# Freewheel

One-way clutch (freewheel/overrunning sprag): transmits a stiff viscous torque only while the driver overruns the driven side (dw > 0) — the C1 smooth-max hinge of width eps; free in the reverse direction.

Reusable acausal **mechanical-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/mechanical.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Freewheel inst(k, eps)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
dw &= a.w - b.w \\
a.tau &= k\cdot 0.5\cdot \left(dw + \sqrt{dw^{2} + eps^{2}}\right) \\
a.tau + b.tau &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Freewheel: engaged (dw = +5) transmits k*hinge = 500.000005 N·m; overrun
// (dw = -5) leaks only the eps residual ~5e-6. Steady circuits only — the
// probes read block-free port variables.
// EXPECT fw_eng = 500 tol 1e-3
// EXPECT fw_ovr = 0 tol 1e-3

SpeedSource FA(w=5 [rad/s])
MechGround  FGA()
Freewheel   FW1(k=100 [N-m-s], eps=1e-3 [rad/s])
MechGround  FGB()
connect(FA.a, FW1.a)
connect(FA.b, FGA.port)
connect(FW1.b, FGB.port)
fw_eng = FW1.a.tau

SpeedSource FC(w=-5 [rad/s])
MechGround  FGC()
Freewheel   FW2(k=100 [N-m-s], eps=1e-3 [rad/s])
MechGround  FGD()
connect(FC.a, FW2.a)
connect(FC.b, FGC.port)
connect(FW2.b, FGD.port)
fw_ovr = FW2.a.tau

{ CHECK fa.a.tau -500.000005 0.000500000005 }
{ CHECK fa.a.w 5 0.0000049999999999999996 }
{ CHECK fa.b.tau 500.000005 0.000500000005 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
fa.a.tau = -500.000005
fa.a.w = 5
fa.b.tau = 500.000005
```

<!-- verified-reference-example:end -->
