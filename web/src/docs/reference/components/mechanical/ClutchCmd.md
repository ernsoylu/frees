---
name: ClutchCmd
category: Component (mechanical)
summary: Acausal mechanical-domain component ClutchCmd with ports a, b, u.
related: []
examples: []
tags: [clutchcmd, component, mechanical, acausal]
references: []
generated: true
---

# ClutchCmd

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ClutchCmd inst(Tmax, eps)
```

## Ports

`a`, `b`, `u`

## Parameters

| Parameter | Type |
| --- | --- |
| `Tmax` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
dw &= a.w - b.w \\
a.tau &= u.sig\cdot tmax\cdot \tanh\left(\frac{dw}{eps}\right) \\
a.tau + b.tau &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// ClutchCmd: engagement 0.5 commanded over the signal port, slipping 3 rad/s
// -> carried torque u*Tmax = 40 N.m.
// EXPECT tau_c = 40 tol 1e-6
ClutchCmd   CL(Tmax = 80, eps = 0.01)
SigConstant U(k = 0.5)
SpeedSource SS(w = 3)
MechGround  G1()
MechGround  G2()
connect(SS.a, CL.a)
connect(SS.b, G1.port)
connect(CL.b, G2.port)
connect(U.out, CL.u)
tau_c = CL.a.tau

{ CHECK cl.a.tau 40 0.000039999999999999996 }
{ CHECK cl.a.w 3 0.000003 }
{ CHECK cl.b.tau -40 0.000039999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cl.a.tau = 40
cl.a.w = 3
cl.b.tau = -40
```

<!-- verified-reference-example:end -->
