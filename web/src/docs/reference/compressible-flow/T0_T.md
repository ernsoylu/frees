---
name: T0_T
category: Compressible Flow
summary: Isentropic stagnation-to-static temperature ratio T0/T(M, k).
related: [P0_P, mach_A_Astar, stagnationtemp]
examples: [cd-nozzle-shock]
tags: [compressible, isentropic, stagnation, temperature, mach, nozzle]
---

# T0_T

Returns the **isentropic stagnation-to-static temperature ratio** `T0/T` for an
ideal gas at Mach number `M` with specific-heat ratio `k`. Use it to convert
between reservoir (stagnation) and local (static) temperature in nozzle, diffuser,
and duct flow.

## Syntax

```
ratio = T0_T(M, k)
```

## Description

Bringing a compressible stream isentropically to rest raises its temperature by
the kinetic-energy term; the ratio depends only on `M` and `k`. The static
temperature follows from a known stagnation value as `T = T0 / T0_T(M, k)`.

## Mathematical Formulation

$$ \frac{T_0}{T} = 1 + \frac{k-1}{2}\,M^2 $$

> **Method:** direct evaluation; dimensionless `M` and `k`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Converging-Diverging Nozzle with a Normal Shock
{ Air (k = 1.4) expands from a reservoir through a C-D nozzle. A normal
  shock stands in the diverging section where the local A/A* = 2.0. }
k = 1.4
P0 = 1000000 [Pa]        { reservoir (stagnation) pressure }
T0 = 500 [K]             { reservoir temperature }
A_ratio = 2.0            { local area / throat area at the shock }

M1 = mach_A_Astar(A_ratio, k, 'supersonic')   { supersonic Mach upstream }
T1 = T0 / T0_T(M1, k)
P1 = P0 / P0_P(M1, k)

M2 = M2_shock(M1, k)                 { Mach downstream of the shock }
P2 = P1 * P2_P1_shock(M1, k)
P02 = P0 * P02_P01_shock(M1, k)      { stagnation pressure after the loss }

{ CHECK A_ratio 2 0.000002 }
{ CHECK M1 2.197198122 0.0000021971981216524625 }
{ CHECK M2 0.5474316548 5.474316547926514e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A_ratio = 2
M1 = 2.197198122
M2 = 0.5474316548
```

<!-- verified-reference-example:end -->

### Example 1 — Static temperature upstream of a nozzle shock

In a C-D nozzle, the supersonic static temperature at the shock station follows
from the reservoir temperature: `T1 = T0 / T0_T(M1, k)`.

[Run: cd-nozzle-shock]

**Expected:** at `M1 ≈ 2.20`, `k = 1.4`, `T0_T ≈ 1.965`, so `T1 ≈ 254 K` from `T0 = 500 K`.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M` | Number | Yes | Mach number (≥ 0, dimensionless). |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `ratio` | Number | Stagnation-to-static temperature ratio T0/T (≥ 1). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `M` negative or `k ≤ 1` | Use a non-negative Mach and a physical `k > 1`. |
