---
name: Radiation
category: Component (heat)
summary: A radiative exchange link (Stefan–Boltzmann), Q̇ = εσA(T1⁴ − T2⁴).
related: []
examples: [radiation-view-factors]
tags: [radiation, component, heat, acausal]
---

# Radiation

A radiative exchange link (Stefan–Boltzmann), `Q̇ = εσA(T1⁴ − T2⁴)`.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`a`, `b`

## Usage

```
Radiation inst(emis, area)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `emis` | Number | Emissivity (0–1). |
| `area` | Number | Area [m²]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
q &= emis\cdot 5.670374419E-8\,\left[kg/s^3-K^4\right]\cdot area\cdot \left(a.t^{4} - b.t^{4}\right) \\
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
ThermalSource SURF(T=350 [K])
Convection CV(htc=10 [W/m^2-K], area=2 [m^2])
Radiation  RD(emis=0.9, area=2 [m^2])
ThermalSource AIR(T=300 [K])
ThermalSource SUR(T=300 [K])
connect(SURF.port, CV.a, RD.a)
connect(CV.b, AIR.port)
connect(RD.b, SUR.port)

{ CHECK air.port.qdot 1000 0.001 }
{ CHECK air.port.t 300 0.0003 }
{ CHECK cv.a.qdot 1000 0.001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
air.port.qdot = 1000
air.port.t = 300
cv.a.qdot = 1000
```

<!-- verified-reference-example:end -->

Related gallery example:

[Run: radiation-view-factors]
