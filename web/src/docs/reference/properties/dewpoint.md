---
name: dewpoint
category: Fluid Properties
summary: Dew-point temperature [K] of humid air (AirH2O) from three named inputs.
related: []
examples: []
tags: [dewpoint, property, humid-air, rustprop]
references: []
---

# dewpoint

Dew-point temperature [K] of humid air (AirH2O) from three named inputs.

## Syntax

```
T_dp = DewPoint(AirH2O, T=…, P=…, R=…)
T_dp = DewPoint(AirH2O, X1=…, X2=…, P=…)
```

## Description

`DewPoint(AirH2O, T=…, P=…, R=…)` returns the dew-point temperature [K] of moist air. Humid-air properties need three named inputs, one of which must be the pressure `P`; the order does not matter and names are case-insensitive.

## Valid inputs

Humid air takes **three** named inputs, one of which must be `P`. Combinations verified through the engine:

| Inputs | Meaning |
| --- | --- |
| `T`, `P`, `R` | dry-bulb temperature, pressure, relative humidity (0–1) |
| `T`, `P`, `w` | … humidity ratio |
| `T`, `P`, `B` | … wet-bulb temperature (alias `Twb`) |
| `T`, `P`, `D` | … dew-point temperature (alias `Tdp`) |
| `h`, `P`, `R` | enthalpy per kg dry air, pressure, relative humidity |

Indicators: `T`, `P`, `h`, `s`, `v`, `w`, `R` (`RH`), `B` (`Twb`), `D` (`Tdp`).

## Fluid support

| Fluid class | Supported |
| --- | --- |
| Humid air (`AirH2O`) | ✓ — three inputs, one of them `P` |
| Real, pseudo-pure, ideal-gas and incompressible fluids | — (humid-air function only) |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
T_wb = WetBulb(AirH2O, T=298.15, P=101325, R=0.5)
T_dp = DewPoint(AirH2O, T=298.15, P=101325, R=0.5)

{ CHECK T_dp 287.0168866 0.0002870168866488805 }
{ CHECK T_wb 291.0334868 0.00029103348681030897 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
T_dp = 287.0168866 [K]
T_wb = 291.0334868 [K]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `AirH2O` | Name | Yes | The humid-air pseudo-fluid. |
| three of `T`, `P`, `h`, `s`, `v`, `w`, `R`, `B`, `D` | Number | Yes | Named inputs; one must be `P` [Pa]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `T_dp` | Number | Dew-point temperature [K]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `Pressure must be one of the inputs to HAPropsSI` | The three inputs do not include `P` | Add `P=…` as one of the three inputs. |
| `The input for key (Rh) with value (1.5) is outside the range of validity: (0) to (1)` | Relative humidity given in percent | Pass `R` as a fraction, e.g. `R=0.5`. |
| `DewPoint requires …` | Fewer than three inputs | Humid air needs three inputs, e.g. `T`, `P`, `R`. |
