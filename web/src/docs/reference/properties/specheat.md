---
name: specheat
category: Fluid Properties
summary: Fluid property: specheat from the real-fluid property backend.
related: []
examples: []
tags: [specheat, property, fluid, coolprop]
references: []
---

# specheat

Returns the **specheat** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
specheat(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Ideal-gas properties by spelled chemical formula (JANAF cubic cp fits).
// Oracle target: props/IdealGas.java
h_n2    = Enthalpy(N2, T=500)
h_co2   = Enthalpy(CO2, T=1000)
h_h2o   = Enthalpy(H2O, T=800)
h_ch4   = Enthalpy(CH4, T=298.15)
h_c8h18 = Enthalpy(C8H18, T=600)

u_n2    = IntEnergy(N2, T=500)
u_co2   = IntEnergy(CO2, T=1000)

cp_n2   = Cp(N2, T=500)
cp_co2  = Cp(CO2, T=1500)
cp_h2   = SpecHeat(H2, T=300)
cv_n2   = Cv(N2, T=500)
cv_o2   = Cv(O2, T=1200)

s_n2    = Entropy(N2, T=500, P=101325)
s_co2   = Entropy(CO2, T=1000, P=200000)
s_pt    = Entropy(O2, P=50000, T=700)
g_co2   = Gibbs(CO2, T=1000, P=101325)

v_n2    = Volume(N2, T=300, P=101325)
rho_co2 = Density(CO2, T=350, P=250000)
z_n2    = Compressibility(N2, T=300, P=101325)

t_from_h = Temperature(CO2, h=-8000000)
t_from_sp = Temperature(N2, s=7000, P=101325)

{ CHECK cp_co2 1327.206885 0.0013272068847989095 }
{ CHECK cp_h2 14321.41329 0.014321413293650793 }
{ CHECK cp_n2 1062.921679 0.001062921679220362 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cp_co2 = 1327.206885 [J/kg-K]
cp_h2 = 14321.41329 [J/kg-K]
cp_n2 = 1062.921679 [J/kg-K]
```

<!-- verified-reference-example:end -->
