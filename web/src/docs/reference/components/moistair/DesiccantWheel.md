---
name: DesiccantWheel
category: Component (moistair)
summary: "Solid desiccant wheel: the process air leaves warmer and drier at near-constant enthalpy, with latent effectiveness against the sorbent equilibrium humidity ratio."
related: []
examples: []
tags: [desiccantwheel, component, moistair, acausal]
references: []
---

# DesiccantWheel

Solid desiccant wheel: the process air leaves warmer and drier at near-constant enthalpy, with latent effectiveness against the sorbent equilibrium humidity ratio.

Solid desiccant wheel. The process side runs DOWN AND TO THE RIGHT on the psychrometric chart: the latent heat released as vapour is sorbed reappears as sensible heat, so the air leaves WARMER and DRIER at near-constant enthalpy. That is the mirror image of adiabatic evaporative cooling, and it is the one process direction a cooling-only component set cannot express at all.  eff_L is latent effectiveness against the desiccant's equilibrium humidity ratio W_eq, which is set by sorbent type and regeneration temperature. f_carry is the extra enthalpy carried over from the hot regeneration sector — real wheels are not perfectly adiabatic, and 80–90% of the process temperature rise is heat of sorption with the balance carried over, so f_carry is small. (`LiquidDesiccantContactor` names its equivalent `f_excess` and defines it on the temperature GAIN rather than on an enthalpy gap, because a liquid contactor has no regeneration port to take the gap against.) Moisture and energy leave on the regeneration stream; both balances close on the dry-air basis.

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
DesiccantWheel inst(eff_L, W_eq, f_carry, domain$)
```

## Ports

`proc_in`, `proc_out`, `reg_in`, `reg_out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `eff_L` | Number | Latent effectiveness toward W_eq [-]. |
| `W_eq` | Number | Equilibrium humidity ratio of the desiccant [-]. |
| `f_carry` | Number | Fraction of the regeneration enthalpy difference carried into the process air [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

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
