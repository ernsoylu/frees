---
name: PneumaticThermalVolume
category: Component (pneumatic)
summary: "Thermal gas volume: mass AND temperature states with a heat port — the non-isothermal receiver (charge heating, blow-down cooling); pressure from the ideal-gas law."
related: []
examples: []
tags: [pneumaticthermalvolume, component, pneumatic, acausal]
references: []
---

# PneumaticThermalVolume

Thermal gas volume: mass AND temperature states with a heat port — the non-isothermal receiver (charge heating, blow-down cooling); pressure from the ideal-gas law.

Reusable acausal **pneumatic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/pneumatic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticThermalVolume inst(fluid$, V, R, cv, cp, m0, T0, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Gas name (e.g. Air, Nitrogen, Hydrogen). |
| `V` | Number | Volume [m^3]. |
| `R` | Number | Specific gas constant [J/kg-K]. |
| `cv` | Number | Specific heat at constant volume [J/kg-K]. |
| `cp` | Number | Specific heat at constant pressure [J/kg-K]. |
| `m0` | Number | Initial gas mass [kg]. |
| `T0` | Number | Initial gas temperature [K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(m\right) &= in.mdot - out.mdot \\
\text{init}\left(m\right) &= m0 \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
\text{der}\left(t\right) &= \frac{in.mdot\cdot cp\cdot \left(t_{in} - t\right) + wall.qdot}{m\cdot cv} \\
\text{init}\left(t\right) &= t0 \\
in.p &= \frac{m\cdot r\cdot t}{v} \\
out.p &= in.p \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid\$}, p=out.p, t=t\right) \\
wall.t &= t
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Charge heating of a dead-ended receiver (the component's natural transient):
// 6 bar, 320 K supply fills the 10 L tank through an ISO 6358 orifice while
// the wall convects (10 * 0.05 W/K) to a 293.15 K casing. Mass and temperature
// are states; pressure follows the ideal-gas law m*R*T/V.
function [port] = GasCap(domain$ = gas)
port(port)
  port.mdot = 0
end
PneumaticSupply        SUP(fluid$=Air, P=600000 [Pa], T=320 [K])
PneumaticOrifice       OIN(fluid$=Air, C=1e-8 [m^3/s-Pa], b=0.3)
PneumaticThermalVolume TNK(fluid$=Air, V=0.01 [m^3], R=287 [J/kg-K], cv=718 [J/kg-K], cp=1005 [J/kg-K], m0=0.012 [kg], T0=300 [K])
GasCap                 CAP()
Convection             SHELL(htc=10 [W/m^2-K], area=0.05 [m^2])
ThermalSource          CASE(T=293.15 [K])
connect(SUP.out, OIN.in)
connect(OIN.out, TNK.in)
connect(TNK.out, CAP.port)
connect(TNK.wall, SHELL.a)
connect(SHELL.b, CASE.port)
DYNAMIC fill(method = ode23s, time = 0 .. 12, points = 21)
END
p_end = FinalValue('tnk.in.p')
t_end = FinalValue('tnk.t')

{ CHECK p_end 599985.2636 0.5999852635647348 }
{ CHECK t_end 315.5042778 0.00031550427777316036 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
p_end = 599985.2636
t_end = 315.5042778
```

<!-- verified-reference-example:end -->
