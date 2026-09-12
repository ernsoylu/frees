---
name: Real-Gas Properties with a Cubic EOS
category: Cookbook
guide: true
summary: Get Z, density, enthalpy, and saturation pressure of a real gas from a cubic equation of state.
examples: [cubic-eos-properties]
tags: [cookbook, eos, peng-robinson, srk, real gas, properties, thermodynamics]
related: [eos_z, eos_density, eos_enthalpy, eos_psat, eos_entropy]
---

# Real-Gas Properties with a Cubic EOS

**Goal:** evaluate real-gas properties — compressibility factor, density, enthalpy,
and saturation pressure — from a cubic equation of state, with **no real-fluid backend
needed** (only critical constants and the acentric factor are needed).

## What you'll build

For a chosen fluid and model (`'SRK'` or `'PR'`):

- `eos_z` — the compressibility factor `Z`, the root of the cubic.
- `eos_density`/`eos_volume` — density and specific volume.
- `eos_enthalpy`/`eos_entropy` — with the EOS departure term.
- `eos_psat` — vapor pressure from the equal-fugacity condition.

## Approach

Peng–Robinson casts the equation of state as a cubic in `Z` (with `A = aαP/(RT)²`,
`B = bP/RT`):

$$ Z^3 - (1-B)Z^2 + (A - 2B - 3B^2)Z - (AB - B^2 - B^3) = 0 $$

The largest real root is the vapor branch, the smallest the liquid. Density follows
from `ρ = P/(ZRT)`; enthalpy adds the analytic departure to the ideal-gas value; the
saturation pressure is the `P` at which the liquid and vapor fugacities match.

## Worked example

[Run: cubic-eos-properties]

**What it tells you:** for CO₂ near its critical region (320 K, 6 MPa), `Z ≈ 0.7`
(strong real-gas deviation) and a density far above the ideal-gas estimate;
`eos_psat('co2','PR',300) ≈ 6.7 MPa` matches the known vapor pressure.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Cubic-EOS Real-Gas Properties

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// Real-Gas Properties from a Cubic EOS (Peng-Robinson)
{ An SRK/PR cubic EOS that needs no real-fluid backend. CO2 at 6 MPa, 320 K. }
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
