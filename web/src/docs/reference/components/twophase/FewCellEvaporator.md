---
name: FewCellEvaporator
category: Component (twophase)
summary: Acausal twophase-domain component FewCellEvaporator with ports in, out, w1, w2, w3.
related: []
examples: []
tags: [fewcellevaporator, component, twophase, acausal]
references: []
generated: true
---

# FewCellEvaporator

Reusable acausal **twophase-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FewCellEvaporator inst(fluid$, V, Cc, UA, Kv, P0, h0, domain$)
```

## Ports

`in`, `out`, `w1`, `w2`, `w3`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `V` | Number |
| `Cc` | Number |
| `UA` | Number |
| `Kv` | Number |
| `P0` | Number |
| `h0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
in.mdot &= kv\cdot \left(in.p - p1\right) \\
m2 &= kv\cdot \left(p1 - p2\right) \\
m3 &= kv\cdot \left(p2 - p3\right) \\
out.mdot &= kv\cdot \left(p3 - out.p\right) \\
\text{der}\left(p1\right) &= \frac{in.mdot - m2}{cc} \\
\text{init}\left(p1\right) &= p0 \\
\text{der}\left(p2\right) &= \frac{m2 - m3}{cc} \\
\text{init}\left(p2\right) &= p0 \\
\text{der}\left(p3\right) &= \frac{m3 - out.mdot}{cc} \\
\text{init}\left(p3\right) &= p0 \\
t1 &= \text{Temperature}\left(\mathrm{fluid}, =p1, p=h1\right) \\
t2 &= \text{Temperature}\left(\mathrm{fluid}, =p2, p=h2\right) \\
t3 &= \text{Temperature}\left(\mathrm{fluid}, =p3, p=h3\right) \\
q1 &= ua\cdot \left(w1.t - t1\right) \\
q2 &= ua\cdot \left(w2.t - t2\right) \\
q3 &= ua\cdot \left(w3.t - t3\right) \\
w1.qdot &= q1 \\
w2.qdot &= q2 \\
w3.qdot &= q3 \\
rho1 &= \text{Density}\left(\mathrm{fluid}, =p1, p=h1\right) \\
rho2 &= \text{Density}\left(\mathrm{fluid}, =p2, p=h2\right) \\
rho3 &= \text{Density}\left(\mathrm{fluid}, =p3, p=h3\right) \\
\text{der}\left(h1\right) &= \frac{in.mdot\cdot \left(in.h - h1\right) + q1}{rho1\cdot v} \\
\text{init}\left(h1\right) &= h0 \\
\text{der}\left(h2\right) &= \frac{m2\cdot \left(h1 - h2\right) + q2}{rho2\cdot v} \\
\text{init}\left(h2\right) &= h0 \\
\text{der}\left(h3\right) &= \frac{m3\cdot \left(h2 - h3\right) + q3}{rho3\cdot v} \\
\text{init}\left(h3\right) &= h0 \\
out.h &= h3
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// FewCellEvaporator: 3-cell C-R chain in its steady limit — der(P)=0 equalises
// the four Kv flows (20 kPa across four resistances -> mdot = 0.02 kg/s) and
// der(h)=0 gives per-cell energy balances against three 300 K wall nodes.
// The refrigerant boils from x ~ 0.3 toward x ~ 0.8, staying inside the dome.
TwoPhasePressureSource SUP(fluid$ = R134a, P = 360000, x = 0.3)
FewCellEvaporator      EV(fluid$ = R134a, V = 0.001, Cc = 1e-7, UA = 30, Kv = 4e-6, P0 = 350000, h0 = 270000)
ThermalSource          W1(T = 300)
ThermalSource          W2(T = 300)
ThermalSource          W3(T = 300)
TwoPhasePressureSink   RET(P = 340000)
connect(SUP.out, EV.in)
connect(EV.out, RET.in)
connect(EV.w1, W1.port)
connect(EV.w2, W2.port)
connect(EV.w3, W3.port)
mdot   = EV.in.mdot
h_exit = EV.out.h

{ CHECK ev.h1 298238.0685 0.29823806849425 }
{ CHECK ev.h2 330970.9603 0.330970960317354 }
{ CHECK ev.h3 364323.7355 0.364323735476342 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ev.h1 = 298238.0685
ev.h2 = 330970.9603
ev.h3 = 364323.7355
```

<!-- verified-reference-example:end -->
