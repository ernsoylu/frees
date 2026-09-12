---
name: BatteryPack
category: Component (electrical)
summary: Acausal electrical-domain component BatteryPack with ports p, n, heat.
related: []
examples: []
tags: [batterypack, component, electrical, acausal]
references: []
generated: true
---

# BatteryPack

Reusable acausal **electrical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
BatteryPack inst(Ns, Np, ocv$, dudt$, R0ref, Tref, Ea, Q0, C_th, SOC0, T0)
```

## Ports

`p`, `n`, `heat`

## Parameters

| Parameter | Type |
| --- | --- |
| `Ns` | Number |
| `Np` | Number |
| `ocv$` | String |
| `dudt$` | String |
| `R0ref` | Number |
| `Tref` | Number |
| `Ea` | Number |
| `Q0` | Number |
| `C_th` | Number |
| `SOC0` | Number |
| `T0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
i_{cell} &= \frac{-p.i}{np} \\
r0 &= r0ref\cdot e^{\frac{ea}{8.314}\cdot \left(\frac{1}{t} - \frac{1}{tref}\right)} \\
p.v - n.v &= ns\cdot \left(\text{ocv\$}\left(soc\right) - r0\cdot i_{cell}\right) \\
p.i + n.i &= 0 \\
\text{der}\left(soc\right) &= \frac{-i_{cell}}{3600\,q0} \\
\text{init}\left(soc\right) &= soc0 \\
qgen &= ns\cdot np\cdot \left(r0\cdot i_{cell}^{2} - i_{cell}\cdot t\cdot \text{dudt\$}\left(soc\right)\right) \\
heat.t &= t \\
\text{der}\left(t\right) &= \frac{qgen + heat.qdot}{c_{th}} \\
\text{init}\left(t\right) &= t0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Simulate a four-series two-parallel pack discharge

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
BatteryPack B(Ns=4, Np=2, ocv$ = ocv, dudt$ = dudt, R0ref = 0.01, Tref = 298, Ea = 20000, Q0 = 5, C_th = 50, SOC0 = 0.8, T0 = 298)
CurrentSource  CS(I = -2)
Ground         G()
Convection     CV(htc = 5, area = 0.1)
ThermalSource  AMB(T = 298)
connect(B.p, CS.p)
connect(CS.n, B.n, G.port)
connect(B.heat, CV.a)
connect(CV.b, AMB.port)

DYNAMIC discharge (method = ode45, time = 0 .. 10, points = 6)
END

final_state = FinalValue('b$soc')

{ CHECK final_state 0.7994444444 7.994444444444408e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
final_state = 0.7994444444
```

<!-- verified-reference-example:end -->
