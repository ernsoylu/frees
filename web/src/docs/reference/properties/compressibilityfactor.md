---
name: compressibilityfactor
category: Fluid Properties
summary: Fluid property: compressibilityfactor from the real-fluid property backend.
related: []
examples: [thermo-compliance]
tags: [compressibilityfactor, property, fluid, coolprop]
references: []
---

# compressibilityfactor

Returns the **compressibilityfactor** of a real fluid from any valid pair of independent state properties (rustprop, a pure-Rust port of CoolProp 8.0.0).

> Real-fluid/material/symbolic operation — see the inputs and references below.

## Syntax

```
compressibilityfactor(Fluid, P=, T=)
```

## Description

Supply the fluid name and any two independent state properties (T, P, h, s, x, …). Property names are case-insensitive.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Real-Fluid Thermodynamics Compliance
{ Verification problems from a standard thermodynamics textbook.
  This example demonstrates the compressibility factor (Z) of real fluids
  and stagnation properties for compressible flow. }

{ --- Part 1: Nelson-Obert Compressibility (Example 3-12 / 3-13) --- }
{ Determine the compressibility factor Z and specific volume v of R-134a
  at T = 50 C and P = 1 MPa. Compare to ideal gas. }
T_r134a = 50 [C]
P_r134a = 1 [MPa]

Z_real = CompressibilityFactor(R134a, T=T_r134a, P=P_r134a)
v_real = Volume(R134a, T=T_r134a, P=P_r134a)

{ We can also check critical properties of R134a: }
T_crit_r134a = T_crit(R134a)
P_crit_r134a = P_crit(R134a)

{ --- Part 2: Diffuser Stagnation Properties (Example 17-1) --- }
{ Air enters a diffuser at static temperature T = 300 K, static pressure
  P = 100 kPa with a velocity V = 200 m/s. k = 1.4, cp = 1005 J/kg-K. }
T_air = 300 [K]
P_air = 100 [kPa]
V_air = 200 [m/s]
cp_air = 1005 [J/kg-K]
k_air = 1.4

T0_air = StagnationTemp(T_air, V_air, cp_air)
P0_air = StagnationPres(P_air, T_air, T0_air, k_air)

{ CHECK P0_air 125206.7702 0.12520677019884116 }
{ CHECK P_crit_r134a 4059276.374 4.059276373791066 }
{ CHECK T0_air 319.9004975 0.0003199004975124378 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
P0_air = 125206.7702 [Pa]
P_crit_r134a = 4059276.374 [Pa]
T0_air = 319.9004975 [K]
```

<!-- verified-reference-example:end -->
