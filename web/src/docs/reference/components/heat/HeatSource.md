---
name: HeatSource
category: Component (heat)
summary: A prescribed heat input to a thermal node.
related: []
examples: []
tags: [heatsource, component, heat, acausal]
---

# HeatSource

A prescribed heat input to a thermal node.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
HeatSource inst(Q)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Q` | Number | Heat input [W]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
port.qdot &= -q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [port] = HeatSource(Q)
port(port)
  port.Qdot = -Q
end
Q_in = 1000
HeatSource    HS(Q=Q_in)
ThermalMass   M(C=5000, T0=300)
Conduction    wall(k=2, area=1, L=0.1)
ThermalSource amb(T=300)
connect(HS.port, M.port, wall.a)
connect(wall.b, amb.port)
DYNAMIC warmup(time = 0 .. 1)
END
LINEARIZE plant(block = warmup, a = A, b = B, c = C, d = D)
  INPUT  Q_in
  OUTPUT m.port.T
END

{ CHECK A[1,1] -0.004 1e-8 }
{ CHECK A[1] -0.004 1e-8 }
{ CHECK B[1,1] 0.0002 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = -0.004
A[1] = -0.004
B[1,1] = 0.0002
```

<!-- verified-reference-example:end -->
