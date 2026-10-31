---
name: relhum
category: Fluid Properties
summary: Relative humidity (0–1) [–] of humid air (AirH2O) from three named inputs.
related: []
examples: [cooling-coil-dehumidification]
tags: [relhum, property, humid-air, rustprop]
references: []
---

# relhum

Relative humidity (0–1) [–] of humid air (AirH2O) from three named inputs.

## Syntax

```
phi = RelHum(AirH2O, T=…, P=…, R=…)
phi = RelHum(AirH2O, X1=…, X2=…, P=…)
```

## Description

`RelHum(AirH2O, T=…, P=…, R=…)` returns the relative humidity (0–1) [–] of moist air. Humid-air properties need three named inputs, one of which must be the pressure `P`; the order does not matter and names are case-insensitive.

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
w = HumRat(AirH2O, T=298.15, P=101325, R=0.5)
rh = RelHum(AirH2O, T=298.15, P=101325, w=w)

{ CHECK rh 0.5 4.999999999999999e-7 }
{ CHECK w 0.009925739296 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
rh = 0.5
w = 0.009925739296
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
| `phi` | Number | Relative humidity (0–1) [–]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `Pressure must be one of the inputs to HAPropsSI` | The three inputs do not include `P` | Add `P=…` as one of the three inputs. |
| `The input for key (Rh) with value (1.5) is outside the range of validity: (0) to (1)` | Relative humidity given in percent | Pass `R` as a fraction, e.g. `R=0.5`. |
| `RelHum requires …` | Fewer than three inputs | Humid air needs three inputs, e.g. `T`, `P`, `R`. |
