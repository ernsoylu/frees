---
name: conductivity
category: Fluid Properties
summary: Thermal conductivity [W/m-K] of a fluid at a state fixed by named inputs.
related: []
examples: []
tags: [conductivity, property, fluid, rustprop]
references: []
---

# conductivity

Thermal conductivity [W/m-K] of a fluid at a state fixed by named inputs.

## Syntax

```
k = Conductivity(Fluid, X1=…, X2=…)
```

## Description

`Conductivity(Fluid, X1=…, X2=…)` returns the thermal conductivity [W/m-K] of `Fluid` at the state fixed by two named inputs (see *Valid input pairs*). `Fluid` is a fluid name or alias, bare (`Water`) or as a string variable (`fluid$`); names and indicators are case-insensitive. Results are in SI base units.

Inside the two-phase dome frees returns exactly what CoolProp 8 returns: the single-phase correlation evaluated at the mixture's average density. That number is not a physical property of the mixture and jumps with quality (Water at 373.15 K: `Cp` = 64 518 J/(kg·K) at `x=0.25`, 2 654 at `x=0.5`). Evaluate it on a single-phase state, or at `x=0` / `x=1` for the saturated liquid / vapour.

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
| Ideal gases (spelled formulas: `N2`, `CO2`, `CH4`, …) | — | Use the full fluid name for the real-fluid value |
| Incompressibles and glycols (`EG50`, …) | ✓ | `(T, P)`, `(P, h)`, `(P, s)`; no quality |
| Humid air (`AirH2O`) | — | Not a humid-air output |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Real-fluid CO2 through the transcritical region — the states a booster cycle
  actually reaches. CO2's critical point (304.13 K, 7.377 MPa) sits low enough
  that the gas cooler runs ABOVE the dome rather than condensing, which is
  exactly where a dome-shaped property backend is most likely to be wrong. }

T_evap = 263.15 [K]     { -10 C }
P_gc   = 9.0e6 [Pa]     { gas cooler, above the 7.377 MPa critical pressure }
T_gc   = 308.15 [K]     { 35 C — supercritical, so this never condenses }
eta_c  = 0.75

{ 1: evaporator outlet, saturated vapour on the dome. }
P1 = P_sat(CarbonDioxide, T=T_evap)
h1 = Enthalpy(CarbonDioxide, T=T_evap, x=1)
s1 = Entropy(CarbonDioxide, T=T_evap, x=1)
d1 = Density(CarbonDioxide, T=T_evap, x=1)

{ 2: compression straight through the critical pressure. }
h2s = Enthalpy(CarbonDioxide, P=P_gc, s=s1)
h2  = h1 + (h2s - h1) / eta_c
T2  = Temperature(CarbonDioxide, P=P_gc, h=h2)

{ 3: gas cooler outlet. Supercritical — a (P,T) state, not a saturation one. }
h3  = Enthalpy(CarbonDioxide, P=P_gc, T=T_gc)
d3  = Density(CarbonDioxide, P=P_gc, T=T_gc)
s3  = Entropy(CarbonDioxide, P=P_gc, T=T_gc)
cp3 = Cp(CarbonDioxide, P=P_gc, T=T_gc)

{ 4: isenthalpic expansion back under the dome. }
h4 = h3
x4 = Quality(CarbonDioxide, P=P1, h=h4)
T4 = Temperature(CarbonDioxide, P=P1, h=h4)

{ Saturated liquid and the triple/critical constants, for the dome itself. }
hf     = Enthalpy(CarbonDioxide, T=T_evap, x=0)
mu_f   = Viscosity(CarbonDioxide, T=T_evap, x=0)
k_f    = Conductivity(CarbonDioxide, T=T_evap, x=0)
M_co2  = MolarMass(CarbonDioxide)

q_L = h1 - h4
w_c = h2 - h1
COP = q_L / w_c

{ CHECK COP 1.960315857 0.00000196031585696125 }
{ CHECK cp3 5696.451047 0.00569645104733459 }
{ CHECK d1 71.1847863 0.0000711847862984094 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
COP = 1.960315857
cp3 = 5696.451047 [J/kg-K]
d1 = 71.1847863 [kg/m^3]
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
| `k` | Number | Thermal conductivity [W/m-K]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `Conductivity requires a fluid and exactly two property indicators, e.g. …` | One indicator (or three) was given | Pass exactly two, e.g. `T=…, P=…`. |
| `Unknown property indicator 'z' in Conductivity(...). Supported: d, h, p, q, rho, s, t, u, v, x` | Misspelled indicator | Use one of the listed indicators. |
| `Input pair variable is invalid and output(s) are non-trivial; cannot do state update` | Unsupported pair, e.g. `(h, u)`, or the same indicator twice | Use a pair from *Valid input pairs*. The message appears inside “Newton iteration stalled after 0 iteration(s)”. |
| `Unknown fluid 'name' in …. Check the spelling against Help → Supported Fluids.` | The fluid name is not one frees or CoolProp knows | Check the spelling against *Supported Fluids*. |
| `For now, we don't support T [200 K] below Tmelt(p) [273.15… K]` | State below the melting line | Raise `T`, or check the unit annotation (`[C]` vs K). |
| `For pseudo-pure fluid, quality must be equal to 0 or 1.` | Two-phase quality on a pseudo-pure mixture such as `Air` | Use `x=0` or `x=1`, or a single-phase pair. |
| `Function 'conductivity' is not available for the ideal gas N2. Use the full fluid name for real-fluid properties.` | Spelled formula selects the ideal-gas model | Use `Nitrogen`, `CarbonDioxide`, … for the real fluid. |
| `Unknown humid-air function: …. Supported: cp, dewpoint, enthalpy, entropy, gibbs, humrat, relhum, specheat, temperature, volume, wetbulb` | `Conductivity` called with `AirH2O` | Use one of the humid-air functions listed. |
