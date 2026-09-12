---
name: TotalEnergyExchanger
category: Component (moistair)
summary: Acausal moistair-domain component TotalEnergyExchanger with ports sup_in, sup_out, exh_in, exh_out.
related: []
examples: []
tags: [totalenergyexchanger, component, moistair, acausal]
references: []
generated: true
---

# TotalEnergyExchanger

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TotalEnergyExchanger inst(eps_s, eps_L, eatr, oacf, domain$)
```

## Ports

`sup_in`, `sup_out`, `exh_in`, `exh_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `eps_s` | Number |
| `eps_L` | Number |
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
w_{x} &= sup_{in.w} + eps_{l}\cdot \left(exh_{in.w} - sup_{in.w}\right) \\
t_{s_out} &= t_{s_in} + eps_{s}\cdot \left(t_{e_in} - t_{s_in}\right) \\
sup_{out.w} &= w_{x} + eatr\cdot \left(exh_{in.w} - w_{x}\right) \\
sup_{out.h} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{s_out}, p=sup_{in.p}, w=sup_{out.w}\right) \\
exh_{out.mdot}\cdot exh_{out.w} &= exh_{in.mdot}\cdot exh_{in.w} + sup_{in.mdot}\cdot sup_{in.w} - sup_{out.mdot}\cdot sup_{out.w} \\
exh_{out.mdot}\cdot exh_{out.h} &= exh_{in.mdot}\cdot exh_{in.h} + sup_{in.mdot}\cdot sup_{in.h} - sup_{out.mdot}\cdot sup_{out.h}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
TotalEnergyExchanger C(eps_s=0.7, eps_L=0.6, eatr=0.02, oacf=1)
C.sup_in.mdot = 1 [kg/s]
C.sup_in.P = 101325 [Pa]
C.sup_in.W = 0.012
C.sup_in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.exh_in.mdot = 1 [kg/s]
C.exh_in.P = 101325 [Pa]
C.exh_in.W = 0.008
C.exh_in.h = Enthalpy(AirH2O, T=293.15, P=101325, W=0.008)

{ CHECK c.exh_in.h 40414.42776 0.04041442776219719 }
{ CHECK c.exh_out.h 53799.12373 0.05379912373285043 }
{ CHECK c.exh_out.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.exh_in.h = 40414.42776
c.exh_out.h = 53799.12373
c.exh_out.mdot = 1
```

<!-- verified-reference-example:end -->
