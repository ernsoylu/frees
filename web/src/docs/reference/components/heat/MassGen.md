---
name: MassGen
category: Component (heat)
summary: A mass/heat generation source term.
related: []
examples: [ev-thermal-management]
tags: [massgen, component, heat, acausal]
---

# MassGen

A mass/heat generation source term.

## Domain

A reusable **acausal heat-domain** component — its thermal ports carry temperature `T` and heat-flow rate `Q̇`; a node enforces equal `T` and `ΣQ̇ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`port`

## Usage

```
MassGen inst(C, Qgen, T0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `C` | Number | Capacitance [F]. |
| `Qgen` | Number | Generated heat [W]. |
| `T0` | Number | Reference/initial temperature [K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
\text{der}\left(port.t\right) &= \frac{qgen + port.qdot}{c} \\
\text{init}\left(port.t\right) &= t0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Coolant loop: pump -> two parallel cold-plate branches -> LiquidMixer -> sink
LiquidSource  PIN(fluid$=EG50, mdot=0.3, P=200000 [Pa], T=305 [K])
LiquidOrifice O1(CdA=1.5e-5, rho=1050)
LiquidOrifice O2(CdA=1.2e-5, rho=1050)
LiquidWallHX  CP1(fluid$=EG50, UA=300)
LiquidWallHX  CP2(fluid$=EG50, UA=300)
LiquidWallHX  CHL(fluid$=EG50, UA=400)
LiquidMixer   MIX()
LiquidSink    POUT()
MassGen       BATT(C=60000, Qgen=4000 [W], T0=305 [K])
MassGen       MOTOR(C=40000, Qgen=5000 [W], T0=305 [K])

// Refrigerant loop: feed -> chiller evaporator (wall-coupled) + a second
// evaporator -> TwoPhaseMixer -> compressor -> floating-head condenser.
TwoPhasePressureSource FEED(fluid$=R1234yf, P=350000 [Pa], x=0.2)
TwoPhaseEvaporatorUA   CHLR(fluid$=R1234yf, UA=600, dP=20000, SH=5)
TwoPhaseEvaporatorUA   AUX(fluid$=R1234yf, UA=200, dP=20000, SH=8)
TwoPhaseMixer          SUC()
TwoPhaseCompressor     CMP(fluid$=R1234yf, eta=0.7)
TwoPhaseCondenserFloat COND(fluid$=R1234yf, UA=1000, T_amb=313)
TwoPhaseSink           LIQ()
MassGen                CABIN(C=8000, Qgen=2500 [W], T0=305 [K])

connect(PIN.out, O1.in, O2.in)
connect(O1.out, CP1.in)
connect(CP1.wall, BATT.port)
connect(CP1.out, CHL.in)
connect(CHL.out, MIX.in1)
connect(O2.out, CP2.in)
connect(CP2.wall, MOTOR.port)
connect(CP2.out, MIX.in2)
connect(MIX.out, POUT.in)

connect(FEED.out, CHLR.in, AUX.in)
connect(CHLR.out, SUC.in1)
connect(AUX.out, SUC.in2)
connect(SUC.out, CMP.in)
connect(CMP.out, COND.in)
connect(COND.out, LIQ.in)
connect(AUX.wall, CABIN.port)
connect(CHLR.wall, CHL.wall)

CHLR.frac = 1
AUX.frac = 1

{ CHECK aux.in.h 236295.613 0.2362956130154989 }
{ CHECK aux.in.mdot 0.01823337195 1.8233371952084952e-8 }
{ CHECK aux.in.p 350000 0.35 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
aux.in.h = 236295.613
aux.in.mdot = 0.01823337195
aux.in.p = 350000
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: ev-thermal-management]
