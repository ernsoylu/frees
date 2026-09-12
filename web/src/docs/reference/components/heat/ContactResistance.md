---
name: ContactResistance
category: Component (heat)
summary: A thermal contact resistance between two surfaces.
related: []
examples: []
tags: [contactresistance, component, heat, acausal]
---

# ContactResistance

A thermal contact resistance between two surfaces.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
ContactResistance inst(Rth)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Rth` | Number | Thermal resistance [K/W]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
q &= \frac{a.t - b.t}{rth} \\
a.qdot &= q \\
b.qdot &= -q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
ThermalSource HOT(T=400)
ContactResistance CR(Rth=0.05)
ThermalSource COLD(T=300)
connect(HOT.port, CR.a)
connect(CR.b, COLD.port)

{ CHECK cold.port.qdot 2000 0.002 }
{ CHECK cold.port.t 300 0.0003 }
{ CHECK cr.a.qdot 2000 0.002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cold.port.qdot = 2000
cold.port.t = 300
cr.a.qdot = 2000
```

<!-- verified-reference-example:end -->
