---
name: HydraulicPilotCheckValve
category: Component (hydraulic)
summary: Acausal hydraulic-domain component HydraulicPilotCheckValve with ports in, out, pilot.
related: []
examples: []
tags: [hydraulicpilotcheckvalve, component, hydraulic, acausal]
references: []
generated: true
---

# HydraulicPilotCheckValve

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicPilotCheckValve inst(CdA, rho, rp, eps, domain$)
```

## Ports

`in`, `out`, `pilot`

## Parameters

| Parameter | Type |
| --- | --- |
| `CdA` | Number |
| `rho` | Number |
| `rp` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
pilot.mdot &= 0 \\
out.mdot &= in.mdot \\
out.h &= in.h \\
dpe &= in.p - out.p + rp\cdot \left(pilot.p - in.p\right) \\
g &= 0.5\,\left(1 + \tanh\left(\frac{dpe}{eps}\right)\right) \\
in.mdot\cdot \left|in.mdot\right| &= g\cdot cda^{2}\cdot 2\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Pilot-operated check valve held open against reverse dP (the load-holding
// case): line pressure 5 bar, load side 20 bar, pilot at 15 bar with ratio 3.
// dPe = (5-20)e5 + 3*(15-5)e5 = +15e5 > 0 -> poppet open, flow REVERSE:
// mdot = -CdA*sqrt(2*rho*15e5) = -2e-6*sqrt(2*870*1.5e6) = -0.10219 kg/s.
HydraulicPilotCheckValve PCV(o1, o2, op, CdA=2e-6, rho=870, rp=3, eps=50000)
o1.P = 500000
o1.h = 0
o2.P = 2000000
op.P = 1500000
op.h = 0
q_rev  = PCV.in.mdot
x_gate = PCV.g

{ CHECK o1.mdot -0.1021763182 1.021763181955584e-7 }
{ CHECK o2.h 0 1e-8 }
{ CHECK o2.mdot -0.1021763182 1.021763181955584e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
o1.mdot = -0.1021763182
o2.h = 0
o2.mdot = -0.1021763182
```

<!-- verified-reference-example:end -->
