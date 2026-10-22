---
name: TXV
category: Component (ac)
summary: A thermostatic expansion valve that meters refrigerant to hold a target superheat.
related: []
examples: []
tags: [txv, component, ac, acausal]
---

# TXV

A thermostatic expansion valve that meters refrigerant to hold a target superheat.

## Domain

A reusable **acausal ac-domain** component — its refrigerant/air ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `bulb`

## Usage

```
TXV inst(fluid$, Kv, SH_set, CdA0, tau_valve, tau_bulb, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `Kv` | Number | Opening gain: flow area added per kelvin of superheat above SH_set [m²/K]. |
| `SH_set` | Number | Target superheat [K]. |
| `CdA0` | Number | Reference Cd·A [m²]. |
| `tau_valve` | Number | Valve time constant [s]. |
| `tau_bulb` | Number | Bulb time constant [s]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
bulb.qdot &= 0 \\
tsat &= \text{T\_sat}\left(\mathrm{fluid\$}, p=out.p\right) \\
sh_{sensed} &= bulb.t - tsat \\
\text{der}\left(sh_{b}\right) &= \frac{sh_{sensed} - sh_{b}}{tau_{bulb}} \\
\text{init}\left(sh_{b}\right) &= sh_{set} \\
cda_{t} &= cda0 + kv\cdot \left(sh_{b} - sh_{set}\right) \\
\text{der}\left(cda\right) &= \frac{cda_{t} - cda}{tau_{valve}} \\
\text{init}\left(cda\right) &= cda0 \\
rho_{in} &= \text{Density}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
in.mdot\cdot \left|in.mdot\right| &= cda^{2}\cdot 2\cdot rho_{in}\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ R134a thermostatic expansion valve: 12 bar liquid line to a 3 bar evaporator,
  bulb held 8 K above evaporator saturation (3 K above the 5 K set point),
  so the valve opens over its time constants. }
TwoPhasePressureSource SRC(fluid$=R134a, P=1200000 [Pa], x=0)
TXV                    V1(fluid$=R134a, Kv=2e-8 [m^2/K], SH_set=5 [K], CdA0=1e-6 [m^2], tau_valve=2 [s], tau_bulb=10 [s])
TwoPhasePressureSink   SNK(P=300000 [Pa])
ThermalSource          BULB(T=T_sat(R134a, P=300000) + 8)
connect(SRC.out, V1.in)
connect(V1.out, SNK.in)
connect(BULB.port, V1.bulb)

DYNAMIC opening (method = ida, time = 0 .. 60, points = 61)
END
CdA_end  = FinalValue('V1.CdA')     { valve opening after 60 s, m^2 }
SH_b_end = FinalValue('V1.SH_b')    { bulb-filtered superheat, K }
mdot_end = FinalValue('V1.in.mdot') { refrigerant flow after 60 s, kg/s }

{ CHECK CdA_end 1.059813929e-6 1.06e-12 }
{ CHECK SH_b_end 7.992557183 0.000007992557183 }
{ CHECK mdot_end 0.04756816851 4.756816851e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
CdA_end = 1.059813929e-6
SH_b_end = 7.992557183
mdot_end = 0.04756816851
```

<!-- verified-reference-example:end -->
