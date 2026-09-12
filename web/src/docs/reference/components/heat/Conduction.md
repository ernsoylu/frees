---
name: Conduction
category: Component (heat)
summary: A conductive thermal resistance (Fourier), Q̇ = (T1 − T2)/R.
related: []
examples: [heat-conduction, transient-heat-rod, heisler-transient, material-conduction, pi-temperature-regulation, glazed-opening-heat-loss]
tags: [conduction, component, heat, acausal]
---

# Conduction

A conductive thermal resistance (Fourier), `Q̇ = (T1 − T2)/R`.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
Conduction inst(k, area, L)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `k` | Number | Stiffness / conductivity. |
| `area` | Number | Area [m²]. |
| `L` | Number | Length [m]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
q &= \frac{k\cdot area}{l}\cdot \left(a.t - b.t\right) \\
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
ThermalSource SH(T=400)
Conduction   WALL(k=50, area=0.1, L=0.02)
ThermalSource SC(T=300)
connect(SH.port, WALL.a)
connect(WALL.b, SC.port)

{ CHECK sc.port.qdot 25000 0.024999999999999998 }
{ CHECK sc.port.t 300 0.0003 }
{ CHECK sh.port.qdot -25000 0.024999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
sc.port.qdot = 25000
sc.port.t = 300
sh.port.qdot = -25000
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: heat-conduction]
