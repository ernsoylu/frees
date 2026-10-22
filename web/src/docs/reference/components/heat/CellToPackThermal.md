---
name: CellToPackThermal
category: Component (heat)
summary: "Cell-to-plate thermal path: contact/interface resistance into the cold-plate mass — the network that makes pack gradients (cell hot spot vs plate) real."
related: []
examples: []
tags: [celltopackthermal, component, heat, acausal]
references: []
---

# CellToPackThermal

Cell-to-plate thermal path: contact/interface resistance into the cold-plate mass — the network that makes pack gradients (cell hot spot vs plate) real.

(Direct equations: the plate node carries this component's own state.)

Reusable acausal **heat-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/heat.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CellToPackThermal inst(Rcc, Cpl, T0)
```

## Ports

`cell`, `plate`

## Parameters

| Parameter | Type |
| --- | --- |
| `Rcc` | Number |
| `Cpl` | Number |
| `T0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
q &= \frac{cell.t - tp}{rcc} \\
cell.qdot &= q \\
\text{der}\left(tp\right) &= \frac{q + plate.qdot}{cpl} \\
\text{init}\left(tp\right) &= t0 \\
plate.t &= tp
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Cell-to-cold-plate interface at steady state: a 320 K cell conducts through
// Rcc = 0.5 K/W into the plate node, which convects (htc*A = 2 W/K) to a
// 293.15 K coolant boundary. Steady: (320 - Tp)/0.5 = 2*(Tp - 293.15)
// -> Tp = 306.575 K, Q = 26.85 W.
ThermalSource CELL(T=320 [K])
CellToPackThermal CTP(Rcc=0.5 [K/W], Cpl=1500 [J/K], T0=300 [K])
Convection    CVP(htc=20 [W/m^2-K], area=0.1 [m^2])
ThermalSource COOL(T=293.15 [K])
connect(CELL.port, CTP.cell)
connect(CTP.plate, CVP.a)
connect(CVP.b, COOL.port)
t_plate = CTP.Tp
q_cell  = CTP.Q

{ CHECK cell.port.qdot -26.85 0.000026850000000000022 }
{ CHECK cell.port.t 320 0.00031999999999999997 }
{ CHECK cool.port.qdot 26.85 0.000026850000000000022 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cell.port.qdot = -26.85
cell.port.t = 320
cool.port.qdot = 26.85
```

<!-- verified-reference-example:end -->
