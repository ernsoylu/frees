---
name: BatteryCellMap
category: Component (electrical)
summary: "Map-based battery cell — the real ECM rung: open-circuit voltage from an OCV(SOC) TABLE, ohmic resistance with an Arrhenius temperature law, and the Bernardi heat Q = I²R − I·T·(dU/dT)(SOC) (entropic term from a dU/dT map)."
related: []
examples: []
tags: [batterycellmap, component, electrical, acausal]
references: []
---

# BatteryCellMap

Map-based battery cell — the real ECM rung: open-circuit voltage from an OCV(SOC) TABLE, ohmic resistance with an Arrhenius temperature law, and the Bernardi heat Q = I²R − I·T·(dU/dT)(SOC) (entropic term from a dU/dT map).

SOC and cell temperature are states; the `aging` variant adds Ah-throughput capacity fade (Qcap = Q0·(1 − k_age·Ah)). Discharge current is positive (I = −p.I, matching the Battery sign convention).

Reusable acausal **electrical-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/electrical.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
BatteryCellMap inst(ocv$, dudt$, R0ref, Tref, Ea, Q0, C_th, SOC0, T0, k_age, model$)
```

## Ports

`p`, `n`, `heat`

## Parameters

| Parameter | Type |
| --- | --- |
| `ocv$` | String |
| `dudt$` | String |
| `R0ref` | Number |
| `Tref` | Number |
| `Ea` | Number |
| `Q0` | Number |
| `C_th` | Number |
| `SOC0` | Number |
| `T0` | Number |
| `k_age` | Number |
| `model$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
i &= -p.i \\
r0 &= r0ref\cdot e^{\frac{ea}{8.314\,\left[kg m^2/s^2-K-mol\right]}\cdot \left(\frac{1}{t} - \frac{1}{tref}\right)} \\
voc &= \text{ocv\$}\left(soc\right) \\
p.v - n.v &= voc - r0\cdot i \\
p.i + n.i &= 0 \\
\text{der}\left(soc\right) &= \frac{-i}{3600\,\left[Coulomb\right]\,qcap} \\
\text{init}\left(soc\right) &= soc0 \\
qgen &= r0\cdot i^{2} - i\cdot t\cdot \text{dudt\$}\left(soc\right) \\
heat.t &= t \\
\text{der}\left(t\right) &= \frac{qgen + heat.qdot}{c_{th}} \\
\text{init}\left(t\right) &= t0
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `static`

$$
\begin{aligned}
qcap &= q0
\end{aligned}
$$

### `aging` — requires `k_age`

$$
\begin{aligned}
\text{der}\left(ah\right) &= \frac{\left|i\right|}{3600\,\left[Coulomb\right]} \\
\text{init}\left(ah\right) &= 0 \\
qcap &= q0\cdot \left(1 - k_{age}\cdot ah\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Simulate a component transient and inspect its final state

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// BatteryCellMap (static variant): OCV(SOC) and dU/dT maps, Arrhenius R0,
// a 2 A discharge for 10 s from SOC0 = 0.8, heat convected to 298 K ambient.
// SOC and T are states, so the document is a short transient.
TABLE ocv(soc)
  0     3.0
  0.5   3.6
  1     4.1
END
TABLE dudt(soc)
  0    -0.0001
  1     0.0001
END
BatteryCellMap B(ocv$ = ocv, dudt$ = dudt, R0ref = 0.01 [ohm], Tref = 298 [K], Ea = 20000 [J/mol], Q0 = 5, C_th = 50 [J/K], SOC0 = 0.8, T0 = 298 [K])
CurrentSource  CS(I = -2 [A])
Ground         G()
Convection     CV(htc = 5 [W/m^2-K], area = 0.1 [m^2])
ThermalSource  AMB(T = 298 [K])
connect(B.p, CS.p)
connect(CS.n, B.n, G.port)
connect(B.heat, CV.a)
connect(CV.b, AMB.port)

DYNAMIC discharge (method = ode45, time = 0 .. 10, points = 6)
END

final_state = FinalValue('b$soc')

{ CHECK final_state 0.7988888889 7.988888888888927e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
final_state = 0.7988888889
```

<!-- verified-reference-example:end -->
