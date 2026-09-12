---
name: eq_molefraction
category: Combustion
summary: Equilibrium product mole fraction (dissociation)
related: []
examples: []
tags: [eq, molefraction, combustion]
---

# eq_molefraction

Equilibrium product mole fraction (dissociation)


## Syntax

```
eq_molefraction(fuel$, phi, T, P, species$)
```

## Description

Equilibrium product mole fraction (dissociation)

## Mathematical Formulation

$$ \text{species mole fraction from chemical equilibrium } \big(\min G \text{ at } T, P\big) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
mu_air  = mix_viscosity('N2:0.79, O2:0.21', 300)
k_air   = mix_conductivity('N2:0.79, O2:0.21', 300)
x_CO    = eq_molefraction('CH4', 1.0, 2300, 101325, 'CO')
T_flame = AdiabaticFlameTempEq('CH4', 1.0, 298.15, 101325)

{ CHECK k_air 0.02551274257 2.5512742570156196e-8 }
{ CHECK mu_air 0.00001861838941 1e-8 }
{ CHECK T_flame 2230.292092 0.0022302920919232408 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
k_air = 0.02551274257 [W/m-K]
mu_air = 0.00001861838941 [Pa-s]
T_flame = 2230.292092 [K]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fuel$` | String | Yes | Fuel name/formula (e.g. 'CH4'). |
| `phi` | Number | Yes | Equivalence ratio (1 = stoichiometric). |
| `T` | Number | Yes | Temperature [K]. |
| `P` | Number | Yes | Pressure [Pa]. |
| `species$` | String | Yes | Product species name (e.g. CO, NO). |
