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
| `Kv` | Number | Flow coefficient. |
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
tsat &= \text{T\_sat}\left(\mathrm{fluid}, =out.p\right) \\
sh_{sensed} &= bulb.t - tsat \\
\text{der}\left(sh_{b}\right) &= \frac{sh_{sensed} - sh_{b}}{tau_{bulb}} \\
\text{init}\left(sh_{b}\right) &= sh_{set} \\
cda_{t} &= cda0 + kv\cdot \left(sh_{b} - sh_{set}\right) \\
\text{der}\left(cda\right) &= \frac{cda_{t} - cda}{tau_{valve}} \\
\text{init}\left(cda\right) &= cda0 \\
rho_{in} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
in.mdot\cdot \left|in.mdot\right| &= cda^{2}\cdot 2\cdot rho_{in}\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [out] = PSource(P, h0)
port(out)
  out.P = P
  out.h = h0
end
function [in] = PSink(P)
port(in)
  in.P = P
end
PSource       SRC(P=1200000, h0=250000)
ExpansionValve TXV(CdA=1e-6, rho_in=1200)
PSink         SNK(P=300000)
connect(SRC.out, TXV.in)
connect(TXV.out, SNK.in)

{ CHECK snk.in.h 250000 0.25 }
{ CHECK snk.in.mdot 0.04647580015 4.6475800154489004e-8 }
{ CHECK snk.in.p 300000 0.3 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
snk.in.h = 250000
snk.in.mdot = 0.04647580015
snk.in.p = 300000
```

<!-- verified-reference-example:end -->
