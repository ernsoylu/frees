---
name: HeatPipeWrapAround
category: Component (moistair)
summary: Acausal moistair-domain component HeatPipeWrapAround with ports pre_in, pre_out, re_in, re_out.
related: []
examples: []
tags: [heatpipewraparound, component, moistair, acausal]
references: []
generated: true
---

# HeatPipeWrapAround

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HeatPipeWrapAround inst(eff, domain$)
```

## Ports

`pre_in`, `pre_out`, `re_in`, `re_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `eff` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
pre_{out.mdot} &= pre_{in.mdot} \\
re_{out.mdot} &= re_{in.mdot} \\
pre_{out.p} &= pre_{in.p} \\
re_{out.p} &= re_{in.p} \\
pre_{out.w} &= pre_{in.w} \\
re_{out.w} &= re_{in.w} \\
t_{p_in} &= \text{Temperature}\left(\mathrm{airh2o}, h=pre_{in.h}, p=pre_{in.p}, w=pre_{in.w}\right) \\
t_{r_in} &= \text{Temperature}\left(\mathrm{airh2o}, h=re_{in.h}, p=re_{in.p}, w=re_{in.w}\right) \\
t_{p_out} &= t_{p_in} - eff\cdot \left(t_{p_in} - t_{r_in}\right) \\
pre_{out.h} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{p_out}, p=pre_{in.p}, w=pre_{out.w}\right) \\
q &= pre_{in.mdot}\cdot \left(pre_{in.h} - pre_{out.h}\right) \\
re_{out.h} &= re_{in.h} + \frac{q}{re_{in.mdot}} \\
t_{r_out} &= \text{Temperature}\left(\mathrm{airh2o}, h=re_{out.h}, p=re_{in.p}, w=re_{out.w}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
HeatPipeWrapAround C(eff=0.5)
C.pre_in.mdot = 1 [kg/s]
C.pre_in.P = 101325 [Pa]
C.pre_in.W = 0.012
C.pre_in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.re_in.mdot = 1 [kg/s]
C.re_in.P = 101325 [Pa]
C.re_in.W = 0.008
C.re_in.h = Enthalpy(AirH2O, T=293.15, P=101325, W=0.008)

{ CHECK c.pre_in.h 60848.84667 0.06084884666848224 }
{ CHECK c.pre_out.h 55703.69817 0.0557036981702449 }
{ CHECK c.pre_out.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.pre_in.h = 60848.84667
c.pre_out.h = 55703.69817
c.pre_out.mdot = 1
```

<!-- verified-reference-example:end -->
