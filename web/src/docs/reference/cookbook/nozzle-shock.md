---
name: Supersonic Nozzle with a Normal Shock
category: Cookbook
guide: true
summary: Trace a converging-diverging nozzle flow through a normal shock and find the stagnation-pressure loss.
examples: [cd-nozzle-shock]
tags: [cookbook, compressible, nozzle, shock, supersonic, aerospace, gas dynamics]
related: [mach_A_Astar, T0_T, P0_P, M2_shock, P2_P1_shock, P02_P01_shock]
---

# Supersonic Nozzle with a Normal Shock

**Goal:** trace ideal-gas flow through a converging–diverging nozzle that contains a
**normal shock** in its diverging section, and quantify the **stagnation-pressure
loss** across the shock.

## What you'll build

From the reservoir conditions and the area ratio at the shock:

1. `mach_A_Astar` — the supersonic Mach just upstream of the shock.
2. `T0_T`/`P0_P` — the static temperature and pressure there.
3. `M2_shock`/`P2_P1_shock` — the subsonic Mach and pressure jump.
4. `P02_P01_shock` — the stagnation-pressure recovery (the loss).

## Approach

The area–Mach relation is double-valued, so the regime selector picks the supersonic
root upstream of the shock. The shock then jumps the flow to subsonic
with a static-pressure rise but a stagnation-pressure drop:

$$ \frac{P_2}{P_1} = \frac{2kM_1^2 - (k-1)}{k+1},\qquad \frac{P_{02}}{P_{01}} < 1 $$

the latter quantifying the irreversibility of the shock.

## Worked example

[Run: cd-nozzle-shock]

**What it tells you:** at `A/A* = 2.0` (air), the upstream Mach is `M1 ≈ 2.20`, the
static pressure jumps roughly five-fold (`P2/P1 ≈ 5.5`), and the stagnation pressure
recovers to only `≈ 63 %` (`P02 ≈ 628 kPa` from a 1 MPa reservoir) — the price of the
shock.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Nozzle with a Normal Shock

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
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
