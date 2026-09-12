---
name: Vapor-Compression Refrigeration Cycle
category: Cookbook
guide: true
summary: Build an R134a vapor-compression cycle and compute its COP from real-refrigerant properties.
examples: [refrigeration-vcr]
tags: [cookbook, refrigeration, vcr, cop, refrigerant, cycle, thermodynamics]
related: [Enthalpy, Quality, Compressor, Condenser, ExpansionValve, TwoPhaseEvaporator]
---

# Vapor-Compression Refrigeration Cycle

**Goal:** model the standard four-process refrigeration cycle and read off its
**coefficient of performance (COP)** using real-refrigerant properties.

## What you'll build

[Diagram: RefrigerationCycle]

The cycle walks one refrigerant (R134a here) around four state points:

1. **Evaporator** — saturated/superheated vapor leaves at the low pressure, absorbing `q_L`.
2. **Compressor** — isentropic (or efficiency-corrected) compression to the high pressure.
3. **Condenser** — heat rejection `q_H`, leaving saturated/subcooled liquid.
4. **Expansion valve** — isenthalpic throttle back to the low pressure.

## Approach

Anchor the two pressures by saturation temperatures, then evaluate each state's
enthalpy from a real-fluid property call. The cycle energy balances are:

$$ q_L = h_1 - h_4,\quad w_c = h_2 - h_1,\quad q_H = h_2 - h_3,\quad \text{COP} = \frac{q_L}{w_c} $$

with the isenthalpic valve giving `h_4 = h_3`. Use `T_sat`/`P_sat`
to set the pressures and `Enthalpy` (with quality or superheat) for each point.

## Worked example

[Run: refrigeration-vcr]

**What it tells you:** the COP — cooling delivered per unit compressor work — and
how it falls as the condensing/evaporating temperature spread widens. Swapping the
fluid name (e.g. to R1234yf) re-evaluates every property in place.

## Build it from components

For a *connected* circuit rather than a state-by-state script, assemble the
two-phase component library: `TwoPhaseCompressor` →
`TwoPhaseCondenser` → `TwoPhaseExpansionValve`
→ `TwoPhaseEvaporator`, closed into a loop (see the
*EV Thermal-Management System* guide for a full coupled example).

## Examples

<!-- verified-reference-example:start -->

### Verified example — Refrigeration Cycle

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// Vapor-Compression Refrigeration (R134a)
{ Ideal VCR cycle. Real-refrigerant properties, computed in the browser. }
T_evap = 263.15 [K]      { -10 C }
T_cond = 313.15 [K]      { 40 C }
eta_comp = 0.80

P1 = P_sat(R134a, T=T_evap)
h1 = Enthalpy(R134a, T=T_evap, x=1)  { saturated vapor leaving evaporator }
s1 = Entropy(R134a, T=T_evap, x=1)

P2 = P_sat(R134a, T=T_cond)
h2s = Enthalpy(R134a, P=P2, s=s1)
h2 = h1 + (h2s - h1) / eta_comp

h3 = Enthalpy(R134a, P=P2, x=0)      { saturated liquid leaving condenser }
h4 = h3                              { throttle is isenthalpic }

q_L = h1 - h4            { refrigeration effect }
w_c = h2 - h1
COP = q_L / w_c

{ CHECK COP 3.223576735 0.000003223576734898331 }
{ CHECK h1 392664.9136 0.39266491356786404 }
{ CHECK h2 434933.3874 0.43493338744515575 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
COP = 3.223576735
h1 = 392664.9136 [J/kg]
h2 = 434933.3874 [J/kg]
```

<!-- verified-reference-example:end -->
