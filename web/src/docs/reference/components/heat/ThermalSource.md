---
name: ThermalSource
category: Component (heat)
summary: A prescribed-temperature boundary.
related: []
examples: [ev-thermal-management, pi-temperature-regulation, glazed-opening-heat-loss]
tags: [thermalsource, component, heat, acausal]
---

# ThermalSource

A prescribed-temperature boundary.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
ThermalSource inst(T)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `T` | Number | Temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
port.t &= t
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
ThermalSource SRC(T=350)
ThermalSensor SENS()
connect(SRC.port, SENS.port)

{ CHECK sens.port.qdot 0 1e-8 }
{ CHECK sens.port.t 350 0.00035 }
{ CHECK sens.t_meas 350 0.00035 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
sens.port.qdot = 0
sens.port.t = 350
sens.t_meas = 350
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: ev-thermal-management]
