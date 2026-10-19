---
name: WheelBrakeThermal
category: Component (mechanical)
summary: "Commanded friction brake with rotor thermal state and temperature fade: friction power heats the rotor mass (convecting hA to ambient) and the available torque derates through a C1 sigmoid above T_fade (fade studies)."
related: []
examples: []
tags: [wheelbrakethermal, component, mechanical, acausal]
references: []
---

# WheelBrakeThermal

Commanded friction brake with rotor thermal state and temperature fade: friction power heats the rotor mass (convecting hA to ambient) and the available torque derates through a C1 sigmoid above T_fade (fade studies).

Reusable acausal **mechanical-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/mechanical.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
WheelBrakeThermal inst(Tmax, eps, C, hA, T_amb, T_fade, k_fade, eps_f, T0)
```

## Ports

`a`, `b`, `u`

## Parameters

| Parameter | Type |
| --- | --- |
| `Tmax` | Number |
| `eps` | Number |
| `C` | Number |
| `hA` | Number |
| `T_amb` | Number |
| `T_fade` | Number |
| `k_fade` | Number |
| `eps_f` | Number |
| `T0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
fade &= 1 - k_{fade}\cdot 0.5\cdot \left(1 + \tanh\left(\frac{tr - t_{fade}}{eps_{f}}\right)\right) \\
dw &= a.w - b.w \\
tau_{b} &= fade\cdot u.sig\cdot tmax\cdot \tanh\left(\frac{dw}{eps}\right) \\
a.tau &= tau_{b} \\
a.tau + b.tau &= 0 \\
pf &= tau_{b}\cdot dw \\
\text{der}\left(tr\right) &= \frac{pf - ha\cdot \left(tr - t_{amb}\right)}{c} \\
\text{init}\left(tr\right) &= t0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// WheelBrakeThermal steady: 50 rad/s slip at u = 0.4 (Tmax 300) with hA = 15
// to 300 K lands exactly on the fade midpoint: fade = 0.75, Tr = 600 K,
// tau_b = 90 N.m, and Pf = 4500 W = hA*(Tr - T_amb) closes the balance.
// EXPECT tr = 600 tol 1e-6
// EXPECT taub = 90 tol 1e-6
SpeedSource       SS(w = 50)
MechGround        G1()
MechGround        G2()
SigConstant       U(k = 0.4)
WheelBrakeThermal WB(Tmax = 300, eps = 0.01, C = 10, hA = 15, T_amb = 300, T_fade = 600, k_fade = 0.5, eps_f = 30, T0 = 300)
connect(SS.a, WB.a)
connect(SS.b, G1.port)
connect(WB.b, G2.port)
connect(U.out, WB.u)
tr = WB.Tr
taub = WB.tau_b

{ CHECK g1.port.tau -90 0.00008999999999999999 }
{ CHECK g1.port.w 0 1e-8 }
{ CHECK g2.port.tau 90 0.00008999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g1.port.tau = -90
g1.port.w = 0
g2.port.tau = 90
```

<!-- verified-reference-example:end -->
