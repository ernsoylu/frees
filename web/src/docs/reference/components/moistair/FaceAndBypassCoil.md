---
name: FaceAndBypassCoil
category: Component (moistair)
summary: "Face-and-bypass coil: the airstream splits at a damper, the face fraction passes over the coil and the rest bypasses it untouched, and the two remix adiabatically downstream."
related: []
examples: []
tags: [faceandbypasscoil, component, moistair, acausal]
references: []
---

# FaceAndBypassCoil

Face-and-bypass coil: the airstream splits at a damper, the face fraction passes over the coil and the rest bypasses it untouched, and the two remix adiabatically downstream.

Capacity is modulated by the DAMPER rather than by water flow, which is the classic way to hold a leaving condition with a coil that would otherwise freeze or overshoot at part load.  The consequence worth seeing on the chart: here the bypass factor is a CONTROL variable, `BF = 1 - u_face`, not a fixed coil characteristic. At 40% face the leaving air sits far from saturation on the mixing line between the coil condition and the entering state — a leaving state no single-path coil model produces.

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FaceAndBypassCoil inst(u_face, eps, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `u_face` | Number | Fraction of the air sent across the coil face [-]. |
| `eps` | Number | Coil effectiveness against the wall temperature [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
t_{in} &= \text{Temperature}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right) \\
t_{face} &= t_{in} - eps\cdot \left(t_{in} - wall.t\right) \\
w_{sat} &= \text{Humrat}\left(\mathrm{airh2o}, t=t_{face}, p=in.p, r=1\right) \\
w_{face} &= 0.5\,\left(in.w + w_{sat} - \sqrt{\left(in.w - w_{sat}\right)^{2} + 1.0E-12}\right) \\
h_{face} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{face}, p=in.p, w=w_{face}\right) \\
out.w &= u_{face}\cdot w_{face} + \left(1 - u_{face}\right)\cdot in.w \\
out.h &= u_{face}\cdot h_{face} + \left(1 - u_{face}\right)\cdot in.h \\
bf &= 1 - u_{face} \\
q &= in.mdot\cdot \left(in.h - out.h\right) \\
wall.qdot &= -q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
FaceAndBypassCoil C(u_face=0.7, eps=0.8)
C.in.mdot = 1 [kg/s]
C.in.P = 101325 [Pa]
C.in.W = 0.012
C.in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.wall.T = 289.15 [K]

{ CHECK c.bf 0.3 3.0000000000000004e-7 }
{ CHECK c.h_face 49324.76714 0.049324767135369055 }
{ CHECK c.in.h 60848.84667 0.06084884666848224 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.bf = 0.3
c.h_face = 49324.76714
c.in.h = 60848.84667
```

<!-- verified-reference-example:end -->
