---
name: SigThermalProbe
category: Component (signal)
summary: Acausal signal-domain component SigThermalProbe with ports port, out.
related: []
examples: []
tags: [sigthermalprobe, component, signal, acausal]
references: []
generated: true
---

# SigThermalProbe

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

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
