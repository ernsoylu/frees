---
name: IndirectEvaporativeCooler
category: Component (moistair)
summary: Acausal moistair-domain component IndirectEvaporativeCooler with ports pri_in, pri_out, sec_in, sec_out.
related: []
examples: []
tags: [indirectevaporativecooler, component, moistair, acausal]
references: []
generated: true
---

# IndirectEvaporativeCooler

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
IndirectEvaporativeCooler inst(wbde, eff_sec, domain$)
```

## Ports

`pri_in`, `pri_out`, `sec_in`, `sec_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `wbde` | Number |
| `eff_sec` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
pri_{out.mdot} &= pri_{in.mdot} \\
sec_{out.mdot} &= sec_{in.mdot} \\
pri_{out.p} &= pri_{in.p} \\
sec_{out.p} &= sec_{in.p} \\
pri_{out.w} &= pri_{in.w} \\
t_{p_in} &= \text{Temperature}\left(\mathrm{airh2o}, h=pri_{in.h}, p=pri_{in.p}, w=pri_{in.w}\right) \\
t_{wb_sec} &= \text{Wetbulb}\left(\mathrm{airh2o}, h=sec_{in.h}, p=sec_{in.p}, w=sec_{in.w}\right) \\
t_{p_out} &= t_{p_in} - wbde\cdot \left(t_{p_in} - t_{wb_sec}\right) \\
pri_{out.h} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{p_out}, p=pri_{in.p}, w=pri_{out.w}\right) \\
q &= pri_{in.mdot}\cdot \left(pri_{in.h} - pri_{out.h}\right) \\
w_{sat_sec} &= \text{Humrat}\left(\mathrm{airh2o}, h=sec_{in.h}, p=sec_{in.p}, r=1\right) \\
sec_{out.w} &= sec_{in.w} + eff_{sec}\cdot \left(w_{sat_sec} - sec_{in.w}\right) \\
sec_{out.h} &= sec_{in.h} + \frac{q}{sec_{in.mdot}}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
IndirectEvaporativeCooler C(wbde=0.7, eff_sec=0.7)
C.pri_in.mdot = 1 [kg/s]
C.pri_in.P = 101325 [Pa]
C.pri_in.W = 0.012
C.pri_in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.sec_in.mdot = 1 [kg/s]
C.sec_in.P = 101325 [Pa]
C.sec_in.W = 0.008
C.sec_in.h = Enthalpy(AirH2O, T=293.15, P=101325, W=0.008)

{ CHECK c.pri_in.h 60848.84667 0.06084884666848224 }
{ CHECK c.pri_out.h 49638.58799 0.049638587993745695 }
{ CHECK c.pri_out.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.pri_in.h = 60848.84667
c.pri_out.h = 49638.58799
c.pri_out.mdot = 1
```

<!-- verified-reference-example:end -->
