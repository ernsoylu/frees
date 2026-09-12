---
name: WindRotor
category: Component (powertrain)
summary: Acausal powertrain-domain component WindRotor with ports shaft, wind, pitch.
related: []
examples: []
tags: [windrotor, component, powertrain, acausal]
references: []
generated: true
---

# WindRotor

Reusable acausal **powertrain-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
WindRotor inst(rho, R, cp$, epsv, epsw)
```

## Ports

`shaft`, `wind`, `pitch`

## Parameters

| Parameter | Type |
| --- | --- |
| `rho` | Number |
| `R` | Number |
| `cp$` | String |
| `epsv` | Number |
| `epsw` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
lam &= \frac{shaft.w\cdot r}{wind.sig + epsv} \\
cpw &= \text{cp\$}\left(lam, pitch.sig\right) \\
pw &= 0.5\,rho\cdot 3.141592653589793\cdot r^{2}\cdot wind.sig^{3}\cdot cpw \\
shaft.tau &= \frac{-pw}{shaft.w + epsw}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// WindRotor on a flat Cp = 0.45 map at 12 m/s and R = 40 m: wind power
// 0.5*rho*pi*R^2*v^3*Cp = 2.394044e6 W; at 2 rad/s the shaft torque is
// -1.197022e6 N·m (eps-regularized).
// EXPECT tau_w = -1197022 tol 5

TABLE cpmap(lam : beta = 0, 20)
  0    0.45  0.45
  20   0.45  0.45
END
SigConstant WIND(k=12)
SigConstant PITCH(k=0)
SpeedSource WS(w=2)
MechGround  WG()
WindRotor   WR(rho=1.225, R=40, cp$=cpmap, epsv=1e-6, epsw=1e-6)
connect(WR.shaft, WS.a)
connect(WS.b, WG.port)
connect(WIND.out, WR.wind)
connect(PITCH.out, WR.pitch)
tau_w = WR.shaft.tau

{ CHECK pitch.out.sig 0 1e-8 }
{ CHECK tau_w -1197021.601 1.1970216007305972 }
{ CHECK wg.port.tau 1197021.601 1.1970216007305972 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
pitch.out.sig = 0
tau_w = -1197021.601 [J]
wg.port.tau = 1197021.601
```

<!-- verified-reference-example:end -->
