---
name: StagnationPres
category: Compressible Flow
summary: Stagnation pressure P0 = P·(T0/T)^(k/(k-1)).
related: [StagnationTemp, P0_P]
examples: [thermo-compliance]
tags: [compressible, stagnation pressure, total pressure, isentropic]
---

# StagnationPres

Returns the **stagnation (total) pressure** `P0` of a flowing gas brought
isentropically to rest, from the static pressure `P`, static temperature `T`,
stagnation temperature `T0`, and specific-heat ratio `k`.

## Syntax

```
P0 = StagnationPres(P, T, T0, k)
```

## Description

Built on the isentropic relation between pressure and temperature ratios, it pairs
with `StagnationTemp` to give the full stagnation state.

## Mathematical Formulation

$$ P_0 = P\left(\frac{T_0}{T}\right)^{\!k/(k-1)} $$

> **Method:** direct evaluation of the isentropic stagnation relation.

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

### Example 1 — Total pressure of a flow

[Run: thermo-compliance]

**Expected:** `P0 > P`, the ratio set by `(T0/T)^{k/(k−1)}`.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `P` | Number | Yes | Static pressure [Pa]. |
| `T` | Number | Yes | Static temperature [K]. |
| `T0` | Number | Yes | Stagnation temperature [K]. |
| `k` | Number | Yes | Ratio of specific heats. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `P0` | Number | Stagnation pressure [Pa]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `k ≤ 1` or `T ≤ 0` | Use a physical `k > 1` and positive temperatures. |
