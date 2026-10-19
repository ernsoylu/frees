---
name: eos_enthalpy
category: Properties (EOS)
summary: Specific enthalpy from a cubic equation of state (ideal-gas + departure).
related: [eos_z, eos_entropy, eos_density]
examples: [cubic-eos-properties]
tags: [eos, cubic, peng-robinson, srk, enthalpy, departure, residual]
---

# eos_enthalpy

Returns the **specific enthalpy** `h` [J/kg] of a real fluid from a cubic equation
of state (`'SRK'` or `'PR'`) at temperature `T` and pressure `P`. It combines the
ideal-gas enthalpy with the EOS **departure (residual) enthalpy** that captures
real-gas effects.

## Syntax

```
h = eos_enthalpy(fluid$, model$, T, P, phase$)
```

## Description

Enthalpy is built as the ideal-gas contribution plus a departure term derived from
the equation of state — the analytic real-gas correction to the ideal value.

## Mathematical Formulation

$$ h(T,P) = h^{\text{ig}}(T) + \big(h - h^{\text{ig}}\big)_{T,P} $$

where the departure is the residual from the EOS:

$$ h - h^{\text{ig}} = RT\,(Z-1) + \frac{T\,\dfrac{da}{dT} - a}{2\sqrt{2}\,b}\,\ln\!\left[\frac{Z + (1+\sqrt2)B}{Z + (1-\sqrt2)B}\right] $$

(Peng–Robinson form; the SRK departure uses the corresponding `ln[(Z+B)/Z]` term).

> **Method:** ideal-gas enthalpy + the closed-form EOS departure evaluated at the
> `eos_z` root.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Real-Gas Properties from a Cubic EOS (Peng-Robinson)
{ A CoolProp-independent SRK/PR backend. CO2 at 6 MPa, 320 K. }
T = 320 [K]
P = 6000000 [Pa]
Z = eos_z('co2', 'PR', T, P, 'vapor')          { compressibility factor }
rho = eos_density('co2', 'PR', T, P, 'vapor')
v = eos_volume('co2', 'PR', T, P, 'vapor')
h = eos_enthalpy('co2', 'PR', T, P, 'vapor')
Psat_300 = eos_psat('co2', 'PR', 300)          { saturation pressure at 300 K }

{ CHECK h -45003.83282 0.045003832815580305 }
{ CHECK Psat_300 6726910.383 6.726910382654169 }
{ CHECK rho 142.7964971 0.00014279649707052498 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h = -45003.83282 [J/kg]
Psat_300 = 6726910.383 [Pa]
rho = 142.7964971 [kg/m^3]
```

<!-- verified-reference-example:end -->

### Example 1 — CO₂ real-gas enthalpy

[Run: cubic-eos-properties]

**Expected:** the value lies **below** the ideal-gas enthalpy at the same `T`
(negative departure near the critical region), reflecting attractive real-gas
forces.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `fluid$` | String | Yes | Fluid name. |
| `model$` | String | Yes | `'SRK'` or `'PR'`. |
| `T` | Number | Yes | Temperature [K]. |
| `P` | Number | Yes | Pressure [Pa]. |
| `phase$` | String | Yes | Root selector: `'vapor'` or `'liquid'`. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `h` | Number | Specific enthalpy [J/kg] (relative to the EOS reference). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `Cubic EOS: unknown fluid 'name'. Known fluids: ammonia, carbondioxide, ethane, methane, nbutane, nitrogen, oxygen, propane, water.` | `fluid$` is not in the cubic-EOS table (aliases such as `co2` and `r717` are accepted) | Use one of the listed fluids. |
| `Cubic EOS: model must be 'SRK' or 'PR', got 'VDW'.` | Unsupported `model$` | Pass `'SRK'` or `'PR'`. |
| `Cubic EOS: no physical root for carbondioxide at T=-5 K, P=4000000 Pa.` | The cubic has no positive-volume root at `(T, P)` — usually a unit slip | Check `T` [K] and `P` [Pa]. |

`phase$` = `'liquid'` selects the liquid root and `'vapor'` (or `'vapour'`, `'gas'`) the vapour root; any other word is refused with `Cubic EOS: phase$ must be 'liquid' or 'vapor'`.
