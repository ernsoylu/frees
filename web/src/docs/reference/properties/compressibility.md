---
name: compressibility
category: Fluid Properties
summary: Compressibility factor Z = P/(ρRT) [–] of a fluid at a state fixed by named inputs.
related: []
examples: [thermo-compliance]
tags: [compressibility, property, fluid, rustprop]
references: []
---

# compressibility

Compressibility factor Z = P/(ρRT) [–] of a fluid at a state fixed by named inputs.

## Syntax

```
Z = Compressibility(Fluid, X1=…, X2=…)
```

## Description

`Compressibility(Fluid, X1=…, X2=…)` returns the compressibility factor Z = P/(ρRT) [–] of `Fluid` at the state fixed by two named inputs (see *Valid input pairs*). `Fluid` is a fluid name or alias, bare (`Water`) or as a string variable (`fluid$`); names and indicators are case-insensitive. Results are in SI base units.

Same quantity as `CompressibilityFactor`; 1 for an ideal gas.

## Valid input pairs

A real-fluid state is fixed by **two** named inputs, in any order and any case. Indicators: `T` [K], `P` [Pa], `h` [J/kg], `s` [J/kg-K], `u` [J/kg], `v` [m^3/kg] (or `d`/`rho` [kg/m^3]), `x` (or `q`) [–]. Pairs verified through the engine for real fluids:

| Pair | Single phase |
| --- | --- |
| `T`, `P` | ✓ |
| `T`, `h` | ✓ |
| `T`, `s` | ✓ |
| `T`, `u` | ✓ |
| `T`, `v` | ✓ |
| `P`, `h` | ✓ |
| `P`, `s` | ✓ |
| `P`, `u` | ✓ |
| `P`, `v` | ✓ |
| `h`, `s` | ✓ |
| `h`, `v` | ✓ |
| `s`, `v` | ✓ |
| `u`, `v` | ✓ |

Inside the two-phase dome use quality with `T`, `P` or `v`: `(T, x)`, `(P, x)`, `(v, x)`. **Not supported:** `(h, u)`, `(s, u)`, and quality with `h`, `s` or `u` — the engine reports *Input pair variable is invalid*.

## Fluid support

| Fluid class | Supported | Inputs |
| --- | --- | --- |
| Real fluids (`Water`, `R134a`, `CarbonDioxide`, …) | ✓ | Every pair in the table above |
| Pseudo-pure mixtures (`Air`) | ✓ | Pairs containing `T` or `P`; `x` only 0 or 1 |
| Ideal gases (spelled formulas: `N2`, `CO2`, `CH4`, …) | ✓ | `T` only |
| Incompressibles and glycols (`EG50`, …) | — | — |
| Humid air (`AirH2O`) | — | Not a humid-air output |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Ideal-gas properties by spelled chemical formula (JANAF cubic cp fits).
// Oracle target: props/IdealGas.java
h_n2    = Enthalpy(N2, T=500)
h_co2   = Enthalpy(CO2, T=1000)
h_h2o   = Enthalpy(H2O, T=800)
h_ch4   = Enthalpy(CH4, T=298.15)
h_c8h18 = Enthalpy(C8H18, T=600)

u_n2    = IntEnergy(N2, T=500)
u_co2   = IntEnergy(CO2, T=1000)

cp_n2   = Cp(N2, T=500)
cp_co2  = Cp(CO2, T=1500)
cp_h2   = SpecHeat(H2, T=300)
cv_n2   = Cv(N2, T=500)
cv_o2   = Cv(O2, T=1200)

s_n2    = Entropy(N2, T=500, P=101325)
s_co2   = Entropy(CO2, T=1000, P=200000)
s_pt    = Entropy(O2, P=50000, T=700)
g_co2   = Gibbs(CO2, T=1000, P=101325)

v_n2    = Volume(N2, T=300, P=101325)
rho_co2 = Density(CO2, T=350, P=250000)
z_n2    = Compressibility(N2, T=300, P=101325)

t_from_h = Temperature(CO2, h=-8000000)
t_from_sp = Temperature(N2, s=7000, P=101325)

{ CHECK cp_co2 1327.206885 0.0013272068847989095 }
{ CHECK cp_h2 14321.41329 0.014321413293650793 }
{ CHECK cp_n2 1062.921679 0.001062921679220362 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cp_co2 = 1327.206885 [J/kg-K]
cp_h2 = 14321.41329 [J/kg-K]
cp_n2 = 1062.921679 [J/kg-K]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Fluid` | Name or string | Yes | Fluid name or alias (`Water`, `R134a`, `r744`, …) or a string variable such as `fluid$`. See *Supported Fluids*. |
| `X1=…, X2=…` | Number | Yes | Two named state inputs from *Valid input pairs*, in SI units. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `Z` | Number | Compressibility factor Z = P/(ρRT) [–]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `Compressibility requires a fluid and exactly two property indicators, e.g. …` | One indicator (or three) was given | Pass exactly two, e.g. `T=…, P=…`. |
| `Unknown property indicator 'z' in Compressibility(...). Supported: d, h, p, q, rho, s, t, u, v, x` | Misspelled indicator | Use one of the listed indicators. |
| `Input pair variable is invalid and output(s) are non-trivial; cannot do state update` | Unsupported pair, e.g. `(h, u)`, or the same indicator twice | Use a pair from *Valid input pairs*. The message appears inside “Newton iteration stalled after 0 iteration(s)”. |
| `Unknown fluid 'name' in …. Check the spelling against Help → Supported Fluids.` | The fluid name is not one frees or CoolProp knows | Check the spelling against *Supported Fluids*. |
| `For now, we don't support T [200 K] below Tmelt(p) [273.15… K]` | State below the melting line | Raise `T`, or check the unit annotation (`[C]` vs K). |
| `For pseudo-pure fluid, quality must be equal to 0 or 1.` | Two-phase quality on a pseudo-pure mixture such as `Air` | Use `x=0` or `x=1`, or a single-phase pair. |
| `Unknown humid-air function: …. Supported: cp, dewpoint, enthalpy, entropy, gibbs, humrat, relhum, specheat, temperature, volume, wetbulb` | `Compressibility` called with `AirH2O` | Use one of the humid-air functions listed. |
