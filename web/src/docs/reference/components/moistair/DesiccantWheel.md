---
name: DesiccantWheel
category: Component (moistair)
summary: Acausal moistair-domain component DesiccantWheel with ports proc_in, proc_out, reg_in, reg_out.
related: []
examples: []
tags: [desiccantwheel, component, moistair, acausal]
references: []
generated: true
---

# DesiccantWheel

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
DesiccantWheel inst(eff_L, W_eq, f_carry, domain$)
```

## Ports

`proc_in`, `proc_out`, `reg_in`, `reg_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `eff_L` | Number |
| `W_eq` | Number |
| `f_carry` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
proc_{out.mdot} &= proc_{in.mdot} \\
reg_{out.mdot} &= reg_{in.mdot} \\
proc_{out.p} &= proc_{in.p} \\
reg_{out.p} &= reg_{in.p} \\
proc_{out.w} &= proc_{in.w} - eff_{l}\cdot \left(proc_{in.w} - w_{eq}\right) \\
proc_{out.h} &= proc_{in.h} + f_{carry}\cdot \left(reg_{in.h} - proc_{in.h}\right) \\
reg_{out.w} &= reg_{in.w} + \frac{proc_{in.mdot}}{reg_{in.mdot}}\cdot \left(proc_{in.w} - proc_{out.w}\right) \\
reg_{out.h} &= reg_{in.h} - \frac{proc_{in.mdot}}{reg_{in.mdot}}\cdot \left(proc_{out.h} - proc_{in.h}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
DesiccantWheel C(eff_L=0.6, W_eq=0.005, f_carry=0.05)
C.proc_in.mdot = 1 [kg/s]
C.proc_in.P = 101325 [Pa]
C.proc_in.W = 0.012
C.proc_in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.reg_in.mdot = 1 [kg/s]
C.reg_in.P = 101325 [Pa]
C.reg_in.W = 0.008
C.reg_in.h = Enthalpy(AirH2O, T=353.15, P=101325, W=0.008)

{ CHECK c.proc_in.h 60848.84667 0.06084884666848224 }
{ CHECK c.proc_out.h 62894.93076 0.06289493076038198 }
{ CHECK c.proc_out.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.proc_in.h = 60848.84667
c.proc_out.h = 62894.93076
c.proc_out.mdot = 1
```

<!-- verified-reference-example:end -->
