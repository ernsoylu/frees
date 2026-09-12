---
name: VehicleBody
category: Component (powertrain)
summary: Acausal powertrain-domain component VehicleBody with ports port.
related: []
examples: []
tags: [vehiclebody, component, powertrain, acausal]
references: []
generated: true
---

# VehicleBody

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
VehicleBody inst(m, Cd, Af, rhoA, Crr, grade, v0)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `m` | Number |
| `Cd` | Number |
| `Af` | Number |
| `rhoA` | Number |
| `Crr` | Number |
| `grade` | Number |
| `v0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
f_{res} &= 0.5\,rhoa\cdot cd\cdot af\cdot port.vel\cdot \left|port.vel\right| + m\cdot 9.80665\cdot \left(crr\cdot \tanh\left(\frac{port.vel}{0.1}\right) + \sin\left(grade\right)\right) \\
\text{der}\left(port.vel\right) &= \frac{port.f - f_{res}}{m} \\
\text{init}\left(port.vel\right) &= v0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Longitudinal vehicle body cruising at a held 30 m/s (der(vel) -> 0): the
// drive force equals the resistance stack, aero + tanh-signed rolling.
// F = 0.5*1.2*0.32*2.2*30^2 + 1500*9.80665*0.012 = 380.16 + 176.52 = 556.68 N.
function [port] = VelSource(v)
port(port)
  port.vel = v
end
VelSource   CRUISE(v=30)
VehicleBody VB(m=1500, Cd=0.32, Af=2.2, rhoA=1.2, Crr=0.012, grade=0, v0=30)
connect(CRUISE.port, VB.port)
f_drive = VB.port.f
f_check = VB.F_res

{ CHECK cruise.port.f -556.6797 0.0005566797000000002 }
{ CHECK cruise.port.vel 30 0.000029999999999999997 }
{ CHECK f_check 556.6797 0.0005566797000000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cruise.port.f = -556.6797
cruise.port.vel = 30
f_check = 556.6797 [J/kg]
```

<!-- verified-reference-example:end -->
