---
name: mix_entropy
category: Combustion
summary: Ideal-gas mixture entropy [J/kg-K]
related: []
examples: []
tags: [mix, entropy, combustion]
---

# mix_entropy

Ideal-gas mixture entropy [J/kg-K]


## Syntax

```
mix_entropy(comp$, T, P)
```

## Description

Ideal-gas mixture entropy [J/kg-K]

## Mathematical Formulation

$$ s = \sum_i Y_i\big[s_i(T) - R_i\ln(y_i P/P_0)\big] $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Ideal-gas mixture thermochemistry on the unified NASA-7 / JANAF accessor.
// Oracle target: props/Thermochemistry.java (+ props/NasaThermo.java)
mw_air   = mix_mw('N2:0.79, O2:0.21')
mw_alias = mix_molarmass('N2:3.76, O2:1')
mw_prod  = mix_mw('CO2:1, H2O:2, N2:7.52')
mw_fuel  = mix_mw('C8H18:1, N2:1')

cp_air   = mix_cp('N2:0.79, O2:0.21', 300)
cp_hot   = mix_cp('N2:0.79, O2:0.21', 1500)
cp_prod  = mix_cp('CO2:1, H2O:2, N2:7.52', 1200)
cp_mixed = mix_cp('C8H18:1, O2:12.5', 400)

h_air    = mix_enthalpy('N2:0.79, O2:0.21', 300)
h_prod   = mix_enthalpy('CO2:1, H2O:2, N2:7.52', 1200)
h_fuel   = mix_enthalpy('CH3OH:1', 400)

s_air    = mix_entropy('N2:0.79, O2:0.21', 300, 101325)
s_prod   = mix_entropy('CO2:1, H2O:2, N2:7.52', 1200, 500000)
s_dup    = mix_entropy('N2:1, O2:1, N2:2', 400, 101325)

{ CHECK cp_air 1010.068613 0.0010100686132802725 }
{ CHECK cp_hot 1219.280631 0.0012192806311091399 }
{ CHECK cp_mixed 1197.040466 0.0011970404663188153 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cp_air = 1010.068613 [J/kg-K]
cp_hot = 1219.280631 [J/kg-K]
cp_mixed = 1197.040466 [J/kg-K]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `comp$` | String | Yes | Mixture composition string, e.g. 'N2:0.79,O2:0.21'. |
| `T` | Number | Yes | Temperature [K]. |
| `P` | Number | Yes | Pressure [Pa]. |
