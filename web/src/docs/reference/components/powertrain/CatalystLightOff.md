---
name: CatalystLightOff
category: Component (powertrain)
summary: "Catalyst light-off: brick thermal mass heated by the exhaust stream (effectiveness-free UA link) plus the exotherm of converted feed once the brick passes light-off; conversion is a C1 sigmoid in brick temperature."
related: []
examples: []
tags: [catalystlightoff, component, powertrain, acausal]
references: []
---

# CatalystLightOff

Catalyst light-off: brick thermal mass heated by the exhaust stream (effectiveness-free UA link) plus the exotherm of converted feed once the brick passes light-off; conversion is a C1 sigmoid in brick temperature.

Reusable acausal **powertrain-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/powertrain.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CatalystLightOff inst(fluid$, C, UA, T50, k, q_exo, T0)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `C` | Number |
| `UA` | Number |
| `T50` | Number |
| `k` | Number |
| `q_exo` | Number |
| `T0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
t_{g} &= \text{Temperature}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
cp_{g} &= \text{Cp}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
eps_{c} &= 1 - e^{\frac{-ua}{\left|in.mdot\right|\cdot cp_{g} + 1.0E-12}} \\
eta &= 0.5\,\left(1 + \tanh\left(\frac{tb - t50}{k}\right)\right) \\
out.h &= in.h - eps_{c}\cdot cp_{g}\cdot \left(t_{g} - tb\right) \\
q &= in.mdot\cdot \left(in.h - out.h\right) \\
qexo &= eta\cdot in.mdot\cdot q_{exo} \\
\text{der}\left(tb\right) &= \frac{q + qexo}{c} \\
\text{init}\left(tb\right) &= t0 \\
out.mdot &= in.mdot \\
out.p &= in.p
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Catalyst brick past light-off at steady state: 0.05 kg/s of 700 K exhaust
// (Air properties), UA = 40 W/K brick link, light-off at 550 K with a 25 K
// sigmoid, 50 kJ/kg feed exotherm. Steady: UA*(T_g - Tb) + eta*mdot*q_exo = 0
// with eta -> 1, so Tb = 700 + 0.05*5e4/40 = 762.5 K and the gas picks up the
// exotherm through the (negative) UA link.
function [out] = ExhaustSource(P, T, mdot)
port(out)
  out.P    = P
  out.mdot = mdot
  out.h    = Enthalpy(Air, P=P, T=T)
end
ExhaustSource   EXH(P=101325, T=700, mdot=0.05)
CatalystLightOff CAT(fluid$=Air, C=15000 [J/K], UA=40 [W/K], T50=550 [K], k=25 [K], q_exo=50000 [J/kg], T0=300 [K])
Sink            TAIL()
connect(EXH.out, CAT.in)
connect(CAT.out, TAIL.in)
t_brick = CAT.Tb
eta_cnv = CAT.eta
t_gas_out = Temperature(Air, P=TAIL.P, h=TAIL.h)

{ CHECK cat.eta 0.9999999586 9.999999586006158e-7 }
{ CHECK cat.in.h 839715.8702 0.8397158702248518 }
{ CHECK cat.in.mdot 0.05 5e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cat.eta = 0.9999999586
cat.in.h = 839715.8702
cat.in.mdot = 0.05
```

<!-- verified-reference-example:end -->
