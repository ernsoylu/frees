---
name: InductionUnit
category: Component (moistair)
summary: Acausal moistair-domain component InductionUnit with ports pri_in, ind_in, out, wall.
related: []
examples: []
tags: [inductionunit, component, moistair, acausal]
references: []
generated: true
---

# InductionUnit

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
InductionUnit inst(ratio, eps, domain$)
```

## Ports

`pri_in`, `ind_in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `ratio` | Number |
| `eps` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
ind_{in.mdot} &= ratio\cdot pri_{in.mdot} \\
out.mdot &= pri_{in.mdot} + ind_{in.mdot} \\
out.p &= pri_{in.p} \\
t_{i_in} &= \text{Temperature}\left(\mathrm{airh2o}, h=ind_{in.h}, p=ind_{in.p}, w=ind_{in.w}\right) \\
t_{i_out} &= t_{i_in} - eps\cdot \left(t_{i_in} - wall.t\right) \\
h_{i_out} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{i_out}, p=ind_{in.p}, w=ind_{in.w}\right) \\
out.mdot\cdot out.w &= pri_{in.mdot}\cdot pri_{in.w} + ind_{in.mdot}\cdot ind_{in.w} \\
out.mdot\cdot out.h &= pri_{in.mdot}\cdot pri_{in.h} + ind_{in.mdot}\cdot h_{i_out} \\
q &= ind_{in.mdot}\cdot \left(ind_{in.h} - h_{i_out}\right) \\
wall.qdot &= -q \\
t_{dp_ind} &= \text{Dewpoint}\left(\mathrm{airh2o}, h=ind_{in.h}, p=ind_{in.p}, w=ind_{in.w}\right) \\
margin_{dp} &= wall.t - t_{dp_ind}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an induction terminal with a chilled-water boundary

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
InductionUnit C(ratio=2, eps=0.7)
C.pri_in.mdot = 1 [kg/s]
C.pri_in.P = 101325 [Pa]
C.pri_in.W = 0.008
C.pri_in.h = Enthalpy(AirH2O, T=289.15, P=101325, W=0.008)
C.ind_in.P = 101325 [Pa]
C.ind_in.W = 0.01
C.ind_in.h = Enthalpy(AirH2O, T=298.15, P=101325, W=0.01)
C.wall.T = 289.15 [K]

{ CHECK c.h_i_out 44154.70373 0.044154703727922386 }
{ CHECK c.ind_in.h 50612.49866 0.05061249865917256 }
{ CHECK c.ind_in.mdot 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.h_i_out = 44154.70373
c.ind_in.h = 50612.49866
c.ind_in.mdot = 2
```

<!-- verified-reference-example:end -->
