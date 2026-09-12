---
name: conductivity
category: Fluid Properties
summary: Fluid property: conductivity from the real-fluid property backend.
related: []
examples: []
tags: [conductivity, property, fluid, coolprop]
references: []
---

# conductivity

Returns the **conductivity** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
conductivity(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Real-fluid CO2 through the transcritical region — the states a booster cycle
  actually reaches. CO2's critical point (304.13 K, 7.377 MPa) sits low enough
  that the gas cooler runs ABOVE the dome rather than condensing, which is
  exactly where a dome-shaped property backend is most likely to be wrong. }

T_evap = 263.15 [K]     { -10 C }
P_gc   = 9.0e6 [Pa]     { gas cooler, above the 7.377 MPa critical pressure }
T_gc   = 308.15 [K]     { 35 C — supercritical, so this never condenses }
eta_c  = 0.75

{ 1: evaporator outlet, saturated vapour on the dome. }
P1 = P_sat(CarbonDioxide, T=T_evap)
h1 = Enthalpy(CarbonDioxide, T=T_evap, x=1)
s1 = Entropy(CarbonDioxide, T=T_evap, x=1)
d1 = Density(CarbonDioxide, T=T_evap, x=1)

{ 2: compression straight through the critical pressure. }
h2s = Enthalpy(CarbonDioxide, P=P_gc, s=s1)
h2  = h1 + (h2s - h1) / eta_c
T2  = Temperature(CarbonDioxide, P=P_gc, h=h2)

{ 3: gas cooler outlet. Supercritical — a (P,T) state, not a saturation one. }
h3  = Enthalpy(CarbonDioxide, P=P_gc, T=T_gc)
d3  = Density(CarbonDioxide, P=P_gc, T=T_gc)
s3  = Entropy(CarbonDioxide, P=P_gc, T=T_gc)
cp3 = Cp(CarbonDioxide, P=P_gc, T=T_gc)

{ 4: isenthalpic expansion back under the dome. }
h4 = h3
x4 = Quality(CarbonDioxide, P=P1, h=h4)
T4 = Temperature(CarbonDioxide, P=P1, h=h4)

{ Saturated liquid and the triple/critical constants, for the dome itself. }
hf     = Enthalpy(CarbonDioxide, T=T_evap, x=0)
mu_f   = Viscosity(CarbonDioxide, T=T_evap, x=0)
k_f    = Conductivity(CarbonDioxide, T=T_evap, x=0)
M_co2  = MolarMass(CarbonDioxide)

q_L = h1 - h4
w_c = h2 - h1
COP = q_L / w_c

{ CHECK COP 1.960315857 0.00000196031585696125 }
{ CHECK cp3 5696.451047 0.00569645104733459 }
{ CHECK d1 71.1847863 0.0000711847862984094 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
COP = 1.960315857
cp3 = 5696.451047 [J/kg-K]
d1 = 71.1847863 [kg/m^3]
```

<!-- verified-reference-example:end -->
