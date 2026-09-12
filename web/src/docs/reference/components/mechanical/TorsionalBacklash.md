---
name: TorsionalBacklash
category: Component (mechanical)
summary: Acausal mechanical-domain component TorsionalBacklash with ports a, b.
related: []
examples: []
tags: [torsionalbacklash, component, mechanical, acausal]
references: []
generated: true
---

# TorsionalBacklash

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TorsionalBacklash inst(k, half, eps, theta0)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |
| `half` | Number |
| `eps` | Number |
| `theta0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(th\right) &= a.w - b.w \\
\text{init}\left(th\right) &= theta0 \\
up &= th - half \\
dn &= th + half \\
a.tau &= k\cdot \left(0.5\,\left(up + \sqrt{up^{2} + eps^{2}}\right) + 0.5\,\left(dn - \sqrt{dn^{2} + eps^{2}}\right)\right) \\
a.tau + b.tau &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TorsionalBacklash steady: 15 N.m winds the 1000 N.m/rad spring past the
// +-0.01 rad lash, so th = half + T/k = 0.025 rad (hinge width 1e-4).
// EXPECT th_b = 0.025 tol 1e-4
TorqueSource      TQ(T = 15)
TorsionalBacklash BL(k = 1000, half = 0.01, eps = 1e-4, theta0 = 0)
MechGround        G1()
MechGround        G2()
connect(TQ.a, BL.a)
connect(TQ.b, G1.port)
connect(BL.b, G2.port)
th_b = BL.th

{ CHECK bl.a.tau 15 0.000014999999999999999 }
{ CHECK bl.a.w 0 1e-8 }
{ CHECK bl.b.tau -15 0.000014999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bl.a.tau = 15
bl.a.w = 0
bl.b.tau = -15
```

<!-- verified-reference-example:end -->
