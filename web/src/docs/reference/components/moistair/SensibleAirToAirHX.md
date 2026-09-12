---
name: SensibleAirToAirHX
category: Component (moistair)
summary: Acausal moistair-domain component SensibleAirToAirHX with ports sup_in, sup_out, exh_in, exh_out.
related: []
examples: []
tags: [sensibleairtoairhx, component, moistair, acausal]
references: []
generated: true
---

# SensibleAirToAirHX

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SensibleAirToAirHX inst(eff, eatr, oacf, domain$)
```

## Ports

`sup_in`, `sup_out`, `exh_in`, `exh_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `eff` | Number |
| `eatr` | Number |
| `oacf` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
sup_{out.mdot} &= \frac{sup_{in.mdot}}{oacf} \\
exh_{out.mdot} &= exh_{in.mdot} + sup_{in.mdot} - sup_{out.mdot} \\
sup_{out.p} &= sup_{in.p} \\
exh_{out.p} &= exh_{in.p} \\
t_{s_in} &= \text{Temperature}\left(\mathrm{airh2o}, h=sup_{in.h}, p=sup_{in.p}, w=sup_{in.w}\right) \\
t_{e_in} &= \text{Temperature}\left(\mathrm{airh2o}, h=exh_{in.h}, p=exh_{in.p}, w=exh_{in.w}\right) \\
c_{s} &= sup_{in.mdot}\cdot \text{Cp}\left(\mathrm{airh2o}, t=t_{s_in}, p=sup_{in.p}, w=sup_{in.w}\right) \\
c_{e} &= exh_{in.mdot}\cdot \text{Cp}\left(\mathrm{airh2o}, t=t_{e_in}, p=exh_{in.p}, w=exh_{in.w}\right) \\
q &= eff\cdot \text{min}\left(c_{s}, c_{e}\right)\cdot \left(t_{e_in} - t_{s_in}\right) \\
t_{s_out} &= t_{s_in} + \frac{q}{c_{s}} \\
sup_{out.w} &= sup_{in.w} + eatr\cdot \left(exh_{in.w} - sup_{in.w}\right) \\
sup_{out.h} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{s_out}, p=sup_{in.p}, w=sup_{out.w}\right) \\
exh_{out.mdot}\cdot exh_{out.w} &= exh_{in.mdot}\cdot exh_{in.w} + sup_{in.mdot}\cdot sup_{in.w} - sup_{out.mdot}\cdot sup_{out.w} \\
exh_{out.mdot}\cdot exh_{out.h} &= exh_{in.mdot}\cdot exh_{in.h} + sup_{in.mdot}\cdot sup_{in.h} - sup_{out.mdot}\cdot sup_{out.h} \\
t_{e_out} &= \text{Temperature}\left(\mathrm{airh2o}, h=exh_{out.h}, p=exh_{in.p}, w=exh_{out.w}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
SensibleAirToAirHX C(eff=0.7, eatr=0.02, oacf=1)
C.sup_in.mdot = 1 [kg/s]
C.sup_in.P = 101325 [Pa]
C.sup_in.W = 0.012
C.sup_in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.exh_in.mdot = 1 [kg/s]
C.exh_in.P = 101325 [Pa]
C.exh_in.W = 0.008
C.exh_in.h = Enthalpy(AirH2O, T=293.15, P=101325, W=0.008)

{ CHECK c.c_e 1021.191586 0.0010211915856509167 }
{ CHECK c.c_s 1029.115337 0.0010291153365230218 }
{ CHECK c.exh_in.h 40414.42776 0.04041442776219719 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.c_e = 1021.191586
c.c_s = 1029.115337
c.exh_in.h = 40414.42776
```

<!-- verified-reference-example:end -->
