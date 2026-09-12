---
name: ChilledBeam
category: Component (moistair)
summary: Acausal moistair-domain component ChilledBeam with ports in, out, wall.
related: []
examples: []
tags: [chilledbeam, component, moistair, acausal]
references: []
generated: true
---

# ChilledBeam

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ChilledBeam inst(eps, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.w &= in.w \\
t_{in} &= \text{Temperature}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right) \\
t_{out} &= t_{in} - eps\cdot \left(t_{in} - wall.t\right) \\
out.h &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{out}, p=in.p, w=in.w\right) \\
q &= in.mdot\cdot \left(in.h - out.h\right) \\
wall.qdot &= -q \\
t_{dp_in} &= \text{Dewpoint}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right) \\
margin_{dp} &= wall.t - t_{dp_in}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
ChilledBeam C(eps=0.7)
C.in.mdot = 1 [kg/s]
C.in.P = 101325 [Pa]
C.in.W = 0.012
C.in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.wall.T = 293.15 [K]

{ CHECK c.in.h 60848.84667 0.06084884666848224 }
{ CHECK c.margin_dp 3.23074024 0.0000032307402402042837 }
{ CHECK c.out.h 53645.86156 0.05364586156365746 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.in.h = 60848.84667
c.margin_dp = 3.23074024
c.out.h = 53645.86156
```

<!-- verified-reference-example:end -->
