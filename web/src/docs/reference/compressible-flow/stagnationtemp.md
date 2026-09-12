---
name: StagnationTemp
category: Compressible Flow
summary: Stagnation temperature T0 = T + V²/(2·cp).
related: [StagnationPres, T0_T]
examples: [thermo-compliance]
tags: [compressible, stagnation temperature, total temperature, energy]
---

# StagnationTemp

Returns the **stagnation (total) temperature** `T0` of a flowing gas — the
temperature it would reach if brought adiabatically to rest — from the static
temperature `T`, velocity `V`, and specific heat `cp`.

## Syntax

```
T0 = StagnationTemp(T, V, cp)
```

## Description

The stagnation temperature adds the kinetic-energy contribution of the flow to the
static temperature. It is conserved along an adiabatic flow even as static
conditions change.

## Mathematical Formulation

$$ T_0 = T + \frac{V^2}{2\,c_p} $$

> **Method:** direct evaluation of the energy balance.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
T = 300 [K]
V = 200 [m/s]
cp = 1005 [J/kg-K]
T0 = stagnationTemp(T, V, cp)

P = 100000 [Pa]
k = 1.4
P0 = stagnationPres(P, T, T0, k)

{ CHECK P0 125206.7702 0.12520677019884116 }
{ CHECK T0 319.9004975 0.0003199004975124378 }
{ CHECK cp 1005 0.001005 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
P0 = 125206.7702 [Pa]
T0 = 319.9004975 [K]
cp = 1005 [J/kg-K]
```

<!-- verified-reference-example:end -->

### Example 1 — Total temperature of a flow

[Run: thermo-compliance]

**Expected:** `T0 > T`, the excess set by the kinetic term `V²/(2cp)`.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `T` | Number | Yes | Static temperature [K]. |
| `V` | Number | Yes | Flow velocity [m/s]. |
| `cp` | Number | Yes | Specific heat at constant pressure [J/kg·K]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `T0` | Number | Stagnation temperature [K]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `cp ≤ 0` | Provide a positive specific heat. |
