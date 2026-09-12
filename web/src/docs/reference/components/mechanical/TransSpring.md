---
name: TransSpring
category: Component (mechanical)
summary: Acausal mechanical-domain component TransSpring with ports a, b.
related: []
examples: [pneumatic-spring-actuator, hydraulic-spring-actuator, damped-actuator-motion]
tags: [transspring, component, mechanical, acausal]
references: []
generated: true
---

# TransSpring

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TransSpring inst(k, x0)
```

## Ports

`a`, `b`

## Parameters

| Parameter | Type |
| --- | --- |
| `k` | Number |
| `x0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(x\right) &= a.vel - b.vel \\
\text{init}\left(x\right) &= x0 \\
a.f &= k\cdot x \\
a.f + b.f &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TransSpring steady: der(x) -> 0 locks both ends (b grounded), and the 50 N
// source compresses the 2000 N/m spring to x = 0.025 m.
// EXPECT x_s = 0.025 tol 1e-9
ForceSource FS(F = 50)
TransSpring SP(k = 2000, x0 = 0)
TransGround G1()
TransGround G2()
connect(FS.a, SP.a)
connect(FS.b, G1.port)
connect(SP.b, G2.port)
x_s = SP.x

{ CHECK fs.a.f -50 0.000049999999999999996 }
{ CHECK fs.a.vel 0 1e-8 }
{ CHECK fs.b.f 50 0.000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
fs.a.f = -50
fs.a.vel = 0
fs.b.f = 50
```

<!-- verified-reference-example:end -->
