---
name: SigSpeedProbe
category: Component (signal)
summary: Acausal signal-domain component SigSpeedProbe with ports shaft, out.
related: []
examples: []
tags: [sigspeedprobe, component, signal, acausal]
references: []
generated: true
---

# SigSpeedProbe

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigSpeedProbe inst(param = value, ...)
```

## Ports

`shaft`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
shaft.tau &= 0 \\
out.sig &= shaft.w
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigSpeedProbe: torque-free shaft-speed pickup on a node driven at 7 rad/s.
// EXPECT y = 7 tol 1e-9
SpeedSource   SS(w = 7)
MechGround    G1()
SigSpeedProbe PR()
connect(SS.a, PR.shaft)
connect(SS.b, G1.port)
y = PR.out.sig

{ CHECK g1.port.tau 0 1e-8 }
{ CHECK g1.port.w 0 1e-8 }
{ CHECK pr.out.sig 7 0.000007 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g1.port.tau = 0
g1.port.w = 0
pr.out.sig = 7
```

<!-- verified-reference-example:end -->
