---
name: Supercapacitor
category: Component (electrical)
summary: Acausal electrical-domain component Supercapacitor with ports p, n.
related: []
examples: []
tags: [supercapacitor, component, electrical, acausal]
references: []
generated: true
---

# Supercapacitor

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Supercapacitor inst(C, R_esr, V0)
```

## Ports

`p`, `n`

## Parameters

| Parameter | Type |
| --- | --- |
| `C` | Number |
| `R_esr` | Number |
| `V0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(vc\right) &= \frac{p.i}{c} \\
\text{init}\left(vc\right) &= v0 \\
p.v - n.v &= vc + r_{esr}\cdot p.i \\
p.i + n.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Supercapacitor steady across an ideal 2.5 V source: der(Vc) -> 0 forces
// p.I = 0, so the ESR drops nothing and Vc sits at the source voltage.
// EXPECT vc = 2.5 tol 1e-9
Supercapacitor SC(C = 100, R_esr = 0.01, V0 = 0)
VoltageSource  SRC(E = 2.5)
Ground         G()
connect(SRC.p, SC.p)
connect(SC.n, SRC.n, G.port)
vc = SC.Vc
i = SC.p.I

{ CHECK g.port.i 0 1e-8 }
{ CHECK g.port.v 0 1e-8 }
{ CHECK i 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g.port.i = 0
g.port.v = 0
i = 0 [A]
```

<!-- verified-reference-example:end -->
