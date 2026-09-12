---
name: PneumaticThermalVolume
category: Component (pneumatic)
summary: Acausal pneumatic-domain component PneumaticThermalVolume with ports in, out, wall.
related: []
examples: []
tags: [pneumaticthermalvolume, component, pneumatic, acausal]
references: []
generated: true
---

# PneumaticThermalVolume

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
PneumaticThermalVolume inst(fluid$, V, R, cv, cp, m0, T0, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `V` | Number |
| `R` | Number |
| `cv` | Number |
| `cp` | Number |
| `m0` | Number |
| `T0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(m\right) &= in.mdot - out.mdot \\
\text{init}\left(m\right) &= m0 \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
\text{der}\left(t\right) &= \frac{in.mdot\cdot cp\cdot \left(t_{in} - t\right) + wall.qdot}{m\cdot cv} \\
\text{init}\left(t\right) &= t0 \\
in.p &= \frac{m\cdot r\cdot t}{v} \\
out.p &= in.p \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid}, =out.p, p=t\right) \\
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
PneumaticSupply        SUP(fluid$=Air, P=600000, T=320)
PneumaticOrifice       OIN(fluid$=Air, C=1e-8, b=0.3)
PneumaticThermalVolume TNK(fluid$=Air, V=0.01, R=287, cv=718, cp=1005, m0=0.012, T0=300)
GasCap                 CAP()
Convection             SHELL(htc=10, area=0.05)
ThermalSource          CASE(T=293.15)
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
