---
name: mix_viscosity
category: Combustion
summary: Ideal-gas mixture viscosity [Pa-s] (Chapman-Enskog/Wilke)
related: []
examples: []
tags: [mix, viscosity, combustion]
---

# mix_viscosity

Ideal-gas mixture viscosity [Pa-s] (Chapman-Enskog/Wilke)


## Syntax

```
mix_viscosity(comp$, T)
```

## Description

Ideal-gas mixture viscosity [Pa-s] (Chapman-Enskog/Wilke)

## Mathematical Formulation

$$ \mu = \sum_i \frac{y_i \mu_i}{\sum_j y_j \phi_{ij}} \quad\text{(Wilke)} $$

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
| `comp$` | String | Yes | Mixture composition string, e.g. 'N2:0.79,O2:0.21'. |
| `T` | Number | Yes | Temperature [K]. |
