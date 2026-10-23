---
name: InductionUnit
category: Component (moistair)
summary: Induction unit — and the ACTIVE chilled beam, which is the same machine under a newer name.
related: []
examples: []
tags: [inductionunit, component, moistair, acausal]
references: []
---

# InductionUnit

Induction unit — and the ACTIVE chilled beam, which is the same machine under a newer name.

Medium-to-high-velocity primary air through nozzles entrains room air across a secondary coil; the primary air does the pumping work, so there is no fan and no fan heat. `ratio` is the induction ratio, induced over primary, typically 2 to 5 (24 L/s of primary inducing 48 L/s of room air is the textbook 2:1 case).  The secondary coil MUST run dry. Induction terminals are built without a piped drain — ASHRAE is blunt that raising chilled-water temperature on the central coil can leave a terminal working as a dehumidifier and damage it — so the induced stream's humidity ratio is carried through untouched and the design is checked instead: `margin_dp` is the water temperature less the induced air's dew point, and a negative value means the terminal is condensing into the occupied space. Keeping it positive is what the primary air is for, which is why induction terminals and a DOAS go together.  The passive counterpart is `ChilledBeam`: no primary air, no induction, room air moved by buoyancy alone.

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
InductionUnit inst(ratio, eps, domain$)
```

## Ports

`pri_in`, `ind_in`, `out`, `wall`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `ratio` | Number | Induced-to-primary mass flow ratio [-]. |
| `eps` | Number | Coil effectiveness on the induced air against the wall temperature [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

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
