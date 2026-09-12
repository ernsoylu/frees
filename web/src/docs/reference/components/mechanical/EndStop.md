---
name: EndStop
category: Component (mechanical)
summary: Acausal mechanical-domain component EndStop with ports port.
related: []
examples: []
tags: [endstop, component, mechanical, acausal]
references: []
generated: true
---

# EndStop

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
EndStop inst(gap, k, c, eps, x0)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `gap` | Number |
| `k` | Number |
| `c` | Number |
| `eps` | Number |
| `x0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(x\right) &= port.vel \\
\text{init}\left(x\right) &= x0 \\
pen &= 0.5\,\left(x - gap + \sqrt{\left(x - gap\right)^{2} + eps^{2}}\right) \\
port.f &= k\cdot pen + c\cdot port.vel\cdot 0.5\cdot \left(1 + \tanh\left(\frac{x - gap}{eps}\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// EndStop steady: der(x) -> 0 pins the node velocity to zero (no damping
// term), and a 100 N press penetrates the 1e5 N/m contact by F/k = 1 mm past
// the 2 mm gap: x = 0.003 m.
// EXPECT x_e = 0.003 tol 1e-5
ForceSource FS(F = 100)
EndStop     ES(gap = 0.002, k = 1e5, c = 200, eps = 1e-5, x0 = 0)
TransGround G1()
connect(FS.a, ES.port)
connect(FS.b, G1.port)
x_e = ES.x

{ CHECK es.pen 0.001 1e-8 }
{ CHECK es.port.f 100 0.00009999999999999999 }
{ CHECK es.port.vel 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
es.pen = 0.001
es.port.f = 100
es.port.vel = 0
```

<!-- verified-reference-example:end -->
