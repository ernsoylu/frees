---
name: QuarterCar
category: Component (powertrain)
summary: Acausal powertrain-domain component QuarterCar with ports road.
related: []
examples: []
tags: [quartercar, component, powertrain, acausal]
references: []
generated: true
---

# QuarterCar

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
QuarterCar inst(ms, mu, ks, cs, kt)
```

## Ports

`road`

## Parameters

| Parameter | Type |
| --- | --- |
| `ms` | Number |
| `mu` | Number |
| `ks` | Number |
| `cs` | Number |
| `kt` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
TransMass   MS(m=ms, v0=0)
TransMass   MU(m=mu, v0=0)
TransSpring KS(k=ks, x0=0)
TransDamper CS(c=cs)
TransSpring KT(k=kt, x0=0)
connect(MS.port, KS.a, CS.a)
connect(KS.b, CS.b, MU.port, KT.a)
connect(KT.b, road)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Quarter-car suspension (hierarchical: 2 masses, 2 springs, 1 damper) shaken
// by a 1 Hz sinusoidal road velocity of 0.1 m/s amplitude for 2 s — the
// sprung mass responds through the ks/cs corner while the tire spring kt
// carries the road input.
function [port] = RoadShaker(amp, w)
port(port)
  port.vel = amp * sin(w * time)
end
RoadShaker ROAD(amp=0.1, w=6.2832)
QuarterCar QC(ms=300, mu=40, ks=20000, cs=1500, kt=180000)
connect(ROAD.port, QC.road)
DYNAMIC shake(method = ode23s, time = 0 .. 2, points = 21)
END
v_sprung = FinalValue('qc.ms.port.vel')
x_susp   = FinalValue('qc.ks.x')

{ CHECK v_sprung -0.09300435353 9.300435352730223e-8 }
{ CHECK x_susp -0.01049521754 1.0495217540763767e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_sprung = -0.09300435353
x_susp = -0.01049521754
```

<!-- verified-reference-example:end -->
