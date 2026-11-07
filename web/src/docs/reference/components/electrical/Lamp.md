---
name: Lamp
category: Component (electrical)
summary: "Incandescent lamp: a filament whose resistance rises with its temperature, heated by its current and cooled by radiation."
related: [HeatingResistor, ThermalMass, Radiation]
examples: []
tags: [lamp, component, electrical, acausal]
references: ["T. L. Bergman, A. S. Lavine, F. P. Incropera and D. P. DeWitt, Fundamentals of Heat and Mass Transfer, 8th ed., Wiley, 2017 (radiation exchange)", "J. R. Rumble (ed.), CRC Handbook of Chemistry and Physics, CRC Press (electrical resistivity of tungsten)"]
---

# Lamp

Incandescent lamp: a filament whose resistance rises with its temperature, heated by its current and cooled by radiation.

## What it models

An electrothermal filament: the resistance of `HeatingResistor`, the heat capacity of `ThermalMass` and `Radiation` to the surroundings, in one block. R = R0·(Tf/T0)^kexp (tungsten: kexp ≈ 1.2), C_th·dTf/dt = v·i − εA·σ·(Tf⁴ − Tamb⁴). A cold filament draws an inrush current many times its running current until it heats up. In a steady solve, der(Tf) = 0 gives the operating temperature. Conduction to the leads and the gas fill are not modelled.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
Lamp inst(R0, T0, kexp, C_th, epsA, Tamb, Tf0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `R0` | Number | Filament resistance at T0 [ohm]. |
| `T0` | Number | Reference temperature of R0 [K]. |
| `kexp` | Number | Resistance–temperature exponent [-]. |
| `C_th` | Number | Filament heat capacity [J/K]. |
| `epsA` | Number | Emissivity × radiating area [m^2]. |
| `Tamb` | Number | Temperature of the surroundings [K]. |
| `Tf0` | Number | Initial filament temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
r &= r0\cdot \left(\frac{tf}{t0}\right)^{kexp} \\
p.v - n.v &= r\cdot p.i \\
p.i + n.i &= 0 \\
pel &= \left(p.v - n.v\right)\cdot p.i \\
prad &= epsa\cdot 5.670374419E-8\,\left[W/m^2-K^4\right]\cdot \left(tf^{4} - tamb^{4}\right) \\
\text{der}\left(tf\right) &= \frac{pel - prad}{c_{th}} \\
\text{init}\left(tf\right) &= tf0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — inrush current of a lamp switched on cold

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A 120 V lamp switched on cold. Its tungsten filament is 16.4 Ω at 300 K
  and rises as (T/300 K)^1.2, so the first current is 120/16.4 = 7.32 A. The
  filament heats until the electrical power equals what it radiates,
  V²/R(T) = εA·σ·(T⁴ − Tamb⁴): about 2802 K, 0.501 A and 60 W, an inrush of
  roughly fourteen times the running current. }
VoltageSource VS(E=120 [V])
Lamp          L(R0=16.4 [ohm], T0=300 [K], kexp=1.2, C_th=0.0027 [J/K], epsA=1.72e-5 [m^2], Tamb=300 [K], Tf0=300 [K])
Ground        G()
connect(VS.p, L.p)
connect(L.n, VS.n, G.port)

DYNAMIC switch_on (method = ida, time = 0 .. 2, points = 2001)
END
i_cold = ODEValue('l.p.i', 0) * 1 [A]
i_hot  = ODEValue('l.p.i', 2) * 1 [A]
T_hot  = ODEValue('l.tf', 2) * 1 [K]
P_hot  = ODEValue('l.pel', 2) * 1 [W]

{ CHECK i_cold 7.317073170731707 1e-09 }
{ CHECK t_hot 2802.1820753282605 0.01 }
{ CHECK i_hot 0.5010571719247913 1e-06 }
{ CHECK p_hot 60.12686063097496 0.001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
i_cold = 7.317073170731707
t_hot = 2802.1820753282605
i_hot = 0.5010571719247913
p_hot = 60.12686063097496
```

<!-- verified-reference-example:end -->
