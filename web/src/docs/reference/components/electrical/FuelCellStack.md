---
name: FuelCellStack
category: Component (electrical)
summary: A PEM fuel-cell stack producing voltage from its polarization curve.
related: []
examples: []
tags: [fuelcellstack, component, electrical, acausal]
---

# FuelCellStack

A PEM fuel-cell stack producing voltage from its polarization curve.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `heat`

## Usage

```
FuelCellStack inst(ncells, area, i0, ilim, Rohm, E0, alpha, Eth, T)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `ncells` | Number | Number of cells. |
| `area` | Number | Area [m²]. |
| `i0` | Number | Initial current [A]. |
| `ilim` | Number | Current limit [A]. |
| `Rohm` | Number | Ohmic resistance [Ω]. |
| `E0` | Number | Reference EMF [V]. |
| `alpha` | Number | Void fraction / coefficient. |
| `Eth` | Number | Activation/threshold energy. |
| `T` | Number | Temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
i_{cell} &= -p.i \\
i &= \frac{i_{cell}}{area} \\
v_{cell} &= e0 - \frac{8.314\,t}{alpha\cdot 96485}\cdot \ln\left(\frac{i}{i0}\right) - i\cdot rohm - \frac{8.314\,t}{2\,96485}\cdot \ln\left(\frac{ilim}{ilim - i}\right) \\
p.v - n.v &= ncells\cdot v_{cell} \\
p.i + n.i &= 0 \\
q &= i_{cell}\cdot ncells\cdot \left(eth - v_{cell}\right) \\
heat.qdot &= -q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [p, n] = CurrentDraw(Idraw)
port(p)
port(n)
  p.I = Idraw
  p.I + n.I = 0
end
FuelCellStack FC(ncells=10, area=0.01, i0=10, ilim=20000, Rohm=1e-5, E0=1.18, alpha=0.5, Eth=1.48, T=343)
CurrentDraw   LOAD(Idraw=50)
ThermalSource COOL(T=343)
Convection    HS(htc=200, area=1)
Ground        G()
connect(FC.p, LOAD.p)
connect(FC.n, LOAD.n, G.port)
connect(FC.heat, HS.a)
connect(HS.b, COOL.port)

{ CHECK cool.port.qdot 360.8040755 0.0003608040755436647 }
{ CHECK cool.port.t 343 0.000343 }
{ CHECK fc.heat.qdot -360.8040755 0.0003608040755436647 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cool.port.qdot = 360.8040755
cool.port.t = 343
fc.heat.qdot = -360.8040755
```

<!-- verified-reference-example:end -->
