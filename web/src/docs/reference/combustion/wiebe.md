---
name: wiebe
category: Combustion
summary: Wiebe burned mass fraction
related: []
examples: []
tags: [wiebe, combustion]
---

# wiebe

Wiebe burned mass fraction


## Syntax

```
wiebe(theta, theta0, dtheta, a, m)
```

## Description

Wiebe burned mass fraction

## Mathematical Formulation

$$ x_b(\theta) = 1 - \exp\!\left[-a\left(\frac{\theta-\theta_0}{\Delta\theta}\right)^{m+1}\right] $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
T_react = 298.15
T_ad = AdiabaticFlameTemp('CH4', 1.0, T_react)
M_air = mix_mw('N2:0.79, O2:0.21')
cp_air = mix_cp('N2:0.79, O2:0.21', 300)
xb = wiebe(20, 0, 60, 5, 2)

{ CHECK cp_air 1010.068613 0.0010100686132802725 }
{ CHECK M_air 0.02885064 2.8850640000000002e-8 }
{ CHECK T_ad 2325.59813 0.0023255981297539636 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cp_air = 1010.068613 [J/kg-K]
M_air = 0.02885064 [kg/mol]
T_ad = 2325.59813 [K]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `theta` | Number | Yes | Flow-deflection angle [rad]. |
| `theta0` | Number | Yes | Start of combustion [deg]. |
| `dtheta` | Number | Yes | Combustion duration [deg]. |
| `a` | Number | Yes | First operand. |
| `m` | Number | Yes | Shape / form parameter. |
