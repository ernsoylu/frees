---
name: LiquidWallHX
category: Component (liquid)
summary: A liquid-to-wall heat exchanger.
related: []
examples: [ev-thermal-management]
tags: [liquidwallhx, component, liquid, acausal]
---

# LiquidWallHX

A liquid-to-wall heat exchanger.

## Domain

A reusable **acausal liquid-domain** component — its single-phase liquid-coolant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`, `wall`

## Usage

```
LiquidWallHX inst(fluid$, UA, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `UA` | Number | Overall conductance UA [W/K]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
q &= ua\cdot \left(t_{in} - wall.t\right) \\
out.h &= in.h - \frac{q}{in.mdot} \\
wall.qdot &= -q
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
LiquidSource    SRC(fluid$=EG50, mdot=0.3, P=200000, T=315)
LiquidPump      PUMP(fluid$=EG50, eta=0.6)
LiquidColdPlate CP(Q=5000)
LiquidWallHX    RAD(fluid$=EG50, UA=800)
ThermalSource   AMB(T=298)
LiquidSink      OUT()
connect(SRC.out, PUMP.in)
connect(PUMP.out, CP.in)
connect(CP.out, RAD.in)
connect(RAD.wall, AMB.port)
connect(RAD.out, OUT.in)
OUT.in.P = 200000

{ CHECK amb.port.qdot 17484.2002 0.017484200203257114 }
{ CHECK amb.port.t 298 0.000298 }
{ CHECK cp.in.h 73658.46116 0.07365846116313775 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
amb.port.qdot = 17484.2002
amb.port.t = 298
cp.in.h = 73658.46116
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: ev-thermal-management]
