---
name: eos_enthalpy
category: Properties (EOS)
summary: Specific enthalpy from a cubic equation of state (ideal-gas + departure).
related: [eos_z, eos_entropy, eos_density]
examples: [cubic-eos-properties]
tags: [eos, cubic, peng-robinson, srk, enthalpy, departure, residual]
references:
  - "the original PR publication"
  - "the standard literature, Y.A. & the standard literature, M.A., a standard thermodynamics text, Eq. (12-57) — enthalpy departure"
  - "the standard literature, the standard literature, H.C. & the standard literature, a standard chemical-thermodynamics text, Ch. 6"
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

where the departure is the residual from the EOS (the standard literature Eq. 12-57):

$$ h - h^{\text{ig}} = RT\,(Z-1) + \frac{T\,\dfrac{da}{dT} - a}{2\sqrt{2}\,b}\,\ln\!\left[\frac{Z + (1+\sqrt2)B}{Z + (1-\sqrt2)B}\right] $$

(Peng–Robinson form; the SRK departure uses the corresponding `ln[(Z+B)/Z]` term).

> **Method:** ideal-gas enthalpy + the closed-form EOS departure evaluated at the
> `eos_z` root.

## Examples

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
| `UNKNOWN_FLUID` | `fluid$` not in the table | Use a supported fluid name. |

## References

1. the original PR publication
2. the standard literature, Y.A. & the standard literature, M.A. *a standard thermodynamics text*, Eq. (12-57).
3. the standard literature, the standard literature, H.C. & the standard literature *a standard chemical-thermodynamics text*, Ch. 6.
