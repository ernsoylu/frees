---
name: MoistAirWallHX
category: Component (moistair)
summary: A humid-air-to-wall heat exchanger.
related: []
examples: []
tags: [moistairwallhx, component, moistair, acausal]
---

# MoistAirWallHX

A humid-air-to-wall heat exchanger.

## Domain

A reusable **acausal moistair-domain** component — its humid-air ports carry pressure `P`, dry-air mass-flow `ṁ_da`, enthalpy `h`, and humidity ratio `W`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `wall`

## Usage

```
MoistAirWallHX inst(eps, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `eps` | Number | Effectiveness / roughness. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
t_{in} &= \text{Temperature}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right) \\
t_{out} &= t_{in} - eps\cdot \left(t_{in} - wall.t\right) \\
w_{sat} &= \text{Humrat}\left(\mathrm{airh2o}, t=t_{out}, p=in.p, r=1\right) \\
out.w &= 0.5\,\left(in.w + w_{sat} - \sqrt{\left(in.w - w_{sat}\right)^{2} + 1.0E-12}\right) \\
out.h &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{out}, p=in.p, w=out.w\right) \\
q &= in.mdot\cdot \left(in.h - out.h\right) \\
q_{lat} &= in.mdot\cdot 2501000\cdot \left(in.w - out.w\right) \\
wall.qdot &= -q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Wet cooling coil as a moist-air-side HX half (eps_t variant): warm humid air
// (305.15 K, W = 0.012) approaches a 283.15 K wall with effectiveness 0.8.
// The outlet W is smooth-clamped at saturation, so the coil dehumidifies and
// the wall receives sensible + latent duty (wall.Qdot = -Q).
MoistAirSource SRC(P=101325, T=305.15, W=0.012, mdot=1)
MoistAirWallHX COIL(eps=0.8)
MoistAirSink   SNK()
ThermalSource  WALLT(T=283.15)
connect(SRC.out, COIL.in)
connect(COIL.out, SNK.in)
connect(COIL.wall, WALLT.port)
q_total = COIL.Q
q_lat   = COIL.Q_lat
t_out   = COIL.T_out
w_out   = SNK.W

{ CHECK coil.in.h 62907.15064 0.06290715063758069 }
{ CHECK coil.in.mdot 1 0.000001 }
{ CHECK coil.in.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
coil.in.h = 62907.15064
coil.in.mdot = 1
coil.in.p = 101325
```

<!-- verified-reference-example:end -->
