---
name: GradeProfile
category: Component (powertrain)
summary: Acausal powertrain-domain component GradeProfile with ports port.
related: []
examples: []
tags: [gradeprofile, component, powertrain, acausal]
references: []
generated: true
---

# GradeProfile

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
GradeProfile inst(m, g, map$, s0)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `m` | Number |
| `g` | Number |
| `map$` | String |
| `s0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(s\right) &= port.vel \\
\text{init}\left(s\right) &= s0 \\
port.f &= m\cdot g\cdot \sin\left(\text{map\$}\left(s\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Road grade vs distance: a vehicle held at 15 m/s integrates its travelled
// distance (der(s) = vel) and reads the grade from a profile TABLE — flat
// start, 5% ramp from 30 m, held to 60 m. After 4 s, s = 60 m and the grade
// force is m*g*sin(0.05) = 1500*9.80665*0.049979 = 735.3 N.
function [port] = VelSource(v)
port(port)
  port.vel = v
end
TABLE gprof(s)
  0    0
  30   0.05
  60   0.05
  100  0
END
VelSource    CRUISE(v=15)
GradeProfile GP(m=1500, g=9.80665, map$=gprof, s0=0)
connect(CRUISE.port, GP.port)
DYNAMIC climb(method = ode45, time = 0 .. 4, points = 21)
END
s_end = FinalValue('gp.s')
f_end = FinalValue('gp.port.f')

{ CHECK f_end 735.1923305 0.0007351923304924455 }
{ CHECK s_end 60 0.00006000000000000005 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
f_end = 735.1923305
s_end = 60
```

<!-- verified-reference-example:end -->
