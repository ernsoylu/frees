---
name: MoistAirFan
category: Component (moistair)
summary: "Blower: fixed pressure rise dP with motor+aero inefficiency heating the stream (shaft power = V̇·ΔP/η, all of it ends up in the air)."
related: []
examples: []
tags: [moistairfan, component, moistair, acausal]
references: []
---

# MoistAirFan

Blower: fixed pressure rise dP with motor+aero inefficiency heating the stream (shaft power = V̇·ΔP/η, all of it ends up in the air).

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/moistair.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MoistAirFan inst(dP, eta, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `dP` | Number | Pressure rise [Pa]. |
| `eta` | Number | Fan efficiency [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.w &= in.w \\
out.p &= in.p + dp \\
t_{in} &= \text{Temperature}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right) \\
v_{in} &= \text{Volume}\left(\mathrm{airh2o}, t=t_{in}, p=in.p, w=in.w\right) \\
out.h &= in.h + \frac{v_{in}\cdot dp}{eta} \\
w_{el} &= \frac{in.mdot\cdot v_{in}\cdot dp}{eta}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Supply blower: 500 Pa rise at 60% efficiency on 1.2 kg/s of room air.
// All shaft power ends up in the stream: W_el = mdot * v_in * dP / eta,
// and the outlet enthalpy carries the same specific work.
MoistAirSource RA(P=101325 [Pa], T=293.15 [K], W=0.008, mdot=1.2 [kg/s])
MoistAirFan    FAN(dP=500 [Pa], eta=0.6)
MoistAirSink   SNK()
connect(RA.out, FAN.in)
connect(FAN.out, SNK.in)
p_out  = SNK.P
w_el   = FAN.W_el
dh     = SNK.h - RA.out.h

{ CHECK dh 700.6663105 0.0007006663104614926 }
{ CHECK fan.in.h 40414.42776 0.04041442776219719 }
{ CHECK fan.in.mdot 1.2 0.0000012 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dh = 700.6663105 [J/kg]
fan.in.h = 40414.42776
fan.in.mdot = 1.2
```

<!-- verified-reference-example:end -->
