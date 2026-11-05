---
name: VehicleBody
category: Component (powertrain)
summary: "Longitudinal vehicle body: mass with aero drag, rolling resistance (tanh-signed) and grade load; velocity is the state."
related: []
examples: [vehicle-launch-equivalent-mass]
tags: [vehiclebody, component, powertrain, acausal]
references: []
---

# VehicleBody

Longitudinal vehicle body: mass with aero drag, rolling resistance (tanh-signed) and grade load; velocity is the state.

Reusable acausal **powertrain-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/powertrain.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
VehicleBody inst(m, Cd, Af, rhoA, Crr, grade, v0)
```

## Ports

`port`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `m` | Number | Vehicle mass [kg]. |
| `Cd` | Number | Aerodynamic drag coefficient [-]. |
| `Af` | Number | Frontal area [m^2]. |
| `rhoA` | Number | Air density [kg/m^3]. |
| `Crr` | Number | Rolling-resistance coefficient [-]. |
| `grade` | Number | Road grade angle [rad]. |
| `v0` | Number | Initial speed [m/s]. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
f_{res} &= 0.5\,rhoa\cdot cd\cdot af\cdot port.vel\cdot \left|port.vel\right| + m\cdot 9.80665\,\left[m/s^2\right]\cdot \left(crr\cdot \tanh\left(\frac{port.vel}{0.1\,\left[m/s\right]}\right) + \sin\left(grade\right)\right) \\
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
VehicleBody VB(m=1500 [kg], Cd=0.32, Af=2.2 [m^2], rhoA=1.2 [kg/m^3], Crr=0.012, grade=0, v0=30 [m/s])
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
