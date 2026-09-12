---
name: ThermalMass
category: Component (heat)
summary: A lumped thermal capacitance, C dT/dt = Q̇.
related: []
examples: [pressure-cooker, pi-temperature-regulation]
tags: [thermalmass, component, heat, acausal]
---

# ThermalMass

A lumped thermal capacitance, `C dT/dt = Q̇`.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
ThermalMass inst(C, T0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `C` | Number | Capacitance [F]. |
| `T0` | Number | Reference/initial temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
\text{der}\left(port.t\right) &= \frac{port.qdot}{c} \\
\text{init}\left(port.t\right) &= t0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
ThermalMass   M(C=5000, T0=400)
ThermalSource amb(T=300)
Conduction    wall(k=2, area=1, L=0.1)
connect(M.port, wall.a)
connect(wall.b, amb.port)

{ CHECK amb.port.qdot 0 1e-8 }
{ CHECK amb.port.t 300 0.0003 }
{ CHECK m.port.qdot 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
amb.port.qdot = 0
amb.port.t = 300
m.port.qdot = 0
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: pressure-cooker]
