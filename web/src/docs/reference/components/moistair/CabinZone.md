---
name: CabinZone
category: Component (moistair)
summary: Acausal moistair-domain component CabinZone with ports in, out, wall.
related: []
examples: []
tags: [cabinzone, component, moistair, acausal]
references: []
generated: true
---

# CabinZone

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CabinZone inst(Vz, T0, W0, n_occ, q_sens, mw_occ, Q_aux, domain$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `Vz` | Number |
| `T0` | Number |
| `W0` | Number |
| `n_occ` | Number |
| `q_sens` | Number |
| `mw_occ` | Number |
| `Q_aux` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.w &= wz \\
out.h &= \text{Enthalpy}\left(\mathrm{airh2o}, t=tz, p=in.p, w=wz\right) \\
v_{z} &= \text{Volume}\left(\mathrm{airh2o}, t=tz, p=in.p, w=wz\right) \\
cp_{z} &= \text{Cp}\left(\mathrm{airh2o}, t=tz, p=in.p, w=wz\right) \\
m_{air} &= \frac{vz}{v_{z}} \\
\text{der}\left(wz\right) &= \frac{in.mdot\cdot \left(in.w - wz\right) + n_{occ}\cdot mw_{occ}}{m_{air}} \\
\text{init}\left(wz\right) &= w0 \\
\text{der}\left(tz\right) &= \frac{in.mdot\cdot \left(in.h - out.h\right) + n_{occ}\cdot q_{sens} + q_{aux} + wall.qdot}{m_{air}\cdot cp_{z}} \\
\text{init}\left(tz\right) &= t0 \\
wall.t &= tz
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// CabinZone pulldown (the component's natural transient): a 3 m3 cabin
// starting warm and humid (27 C, W = 0.010) is ventilated with 0.12 kg/s of
// cool supply air (15 C, W = 0.007) against two occupants (70 W sensible,
// 15 mg/s moisture each), 300 W of solar/auxiliary load and a 15 W/K shell
// to a 305 K ambient. Both zone states relax with tau ~ m_air/mdot ~ 26 s
// toward Tz ~ 293 K and Wz = W_in + n_occ*mw_occ/mdot = 0.00725, so 120 s
// is ~4.7 thermal time constants. The steady CabinZone document stalls the
// ORACLE at default guesses (its humidity-ratio unknown seeds into
// HAPropsSI's NaN region — fixtures/README growth item 4); here Tz and Wz
// are integrator STATES seeded from init(T0/W0), which sidesteps the
// guess landscape entirely.
MoistAirSource SUP(P = 101325, T = 288.15, W = 0.007, mdot = 0.12)
CabinZone      ZONE(Vz = 3, T0 = 300.15, W0 = 0.010, n_occ = 2, q_sens = 70, mw_occ = 1.5e-5, Q_aux = 300)
MoistAirSink   SNK()
Convection     SHELL(htc = 5, area = 3)
ThermalSource  AMB(T = 305)
connect(SUP.out, ZONE.in)
connect(ZONE.out, SNK.in)
connect(ZONE.wall, SHELL.a)
connect(SHELL.b, AMB.port)
DYNAMIC pulldown(method = ode23s, time = 0 .. 120, points = 21)
END
t_end = FinalValue('zone.tz')
w_end = FinalValue('zone.wz')

{ CHECK t_end 292.336968 0.0002923369679757323 }
{ CHECK w_end 0.007298792069 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
t_end = 292.336968
w_end = 0.007298792069
```

<!-- verified-reference-example:end -->
