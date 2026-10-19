---
name: SigThermalProbe
category: Component (signal)
summary: "Temperature probe: reads the heat-node temperature onto a signal wire, drawing no heat."
related: []
examples: []
tags: [sigthermalprobe, component, signal, acausal]
references: []
---

# SigThermalProbe

Temperature probe: reads the heat-node temperature onto a signal wire, drawing no heat.

Reusable acausal **signal-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/signal.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigThermalProbe inst(param = value, ...)
```

## Ports

`port`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
port.qdot &= 0 \\
out.sig &= port.t
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Measure a thermal boundary without drawing heat

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
SigThermalProbe C()
C.port.T = 300 [K]

{ CHECK c.out.sig 300 0.0003 }
{ CHECK c.port.qdot 0 1e-8 }
{ CHECK c.port.t 300 0.0003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.out.sig = 300
c.port.qdot = 0
c.port.t = 300
```

<!-- verified-reference-example:end -->
