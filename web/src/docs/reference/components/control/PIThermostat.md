---
name: PIThermostat
category: Component (control)
summary: A proportional–integral thermostat controller driving an actuator to a setpoint.
related: []
examples: [pi-temperature-regulation]
tags: [pithermostat, component, control, acausal]
---

# PIThermostat

A proportional–integral thermostat controller driving an actuator to a setpoint.

## Domain

A reusable **acausal control-domain** component — its signal ports carry the measured and commanded scalar values. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
PIThermostat inst(Kp, Ki, Tref)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Kp` | Number | Proportional gain [W/K]. |
| `Ki` | Number | Integral gain [W/K·s]. |
| `Tref` | Number | Reference (setpoint) temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
err &= tref - port.t \\
\text{der}\left(integ\right) &= err \\
\text{init}\left(integ\right) &= 0 \\
port.qdot &= -\left(kp\cdot err + ki\cdot integ\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
PIThermostat  TC(Kp=100 [W/K], Ki=0.5 [W/K-s], Tref=350 [K])
ThermalMass   M(C=5000 [J/K], T0=300 [K])
Conduction    wall(k=2 [W/m-K], area=1 [m^2], L=0.1 [m])
ThermalSource amb(T=300 [K])
connect(TC.port, M.port, wall.a)
connect(wall.b, amb.port)
DYNAMIC loop(time = 0 .. 1200, points = 120)
END
Tf = FinalValue('m.port.t')

{ CHECK Tf 350.0082225 0.00035000822246831803 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Tf = 350.0082225
```

<!-- verified-reference-example:end -->
