---
name: Chiller
category: Component (ac)
summary: A refrigerant-to-coolant chiller transferring heat between the two loops.
related: []
examples: []
tags: [chiller, component, ac, acausal]
---

# Chiller

A refrigerant-to-coolant chiller transferring heat between the two loops.

## Domain

A reusable **acausal ac-domain** component — its refrigerant/air ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`ref_in`, `ref_out`, `cool_in`, `cool_out`

## Usage

```
Chiller inst(ref$, cool$, U_tp, U_sh, D, L, eps_zone, UA_cool)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `ref$` | String | Refrigerant name (e.g. R134a, R1234yf). |
| `cool$` | String | Coolant name (e.g. EG50, Water). |
| `U_tp` | Number | Two-phase-zone overall coefficient [W/m²·K]. |
| `U_sh` | Number | Superheat-zone overall coefficient [W/m²·K]. |
| `D` | Number | Diameter [m]. |
| `L` | Number | Length [m]. |
| `eps_zone` | Number | Zone-collapse smoothing width. |
| `UA_cool` | Number | Coolant-side conductance [W/K]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
MovingBoundaryEvaporator EV(fluid$=ref$, U_tp=U_tp, U_sh=U_sh, D=D, L=L, eps_zone=eps_zone)
LiquidWallHX CL(fluid$=cool$, UA=UA_cool)
connect(ref_in, EV.in)
connect(EV.out, ref_out)
connect(cool_in, CL.in)
connect(CL.out, cool_out)
connect(EV.wall, CL.wall)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhaseSource RSRC(fluid$=R134a, mdot=0.020000, P=350000, x=0.25)
TwoPhaseSink RSNK()
LiquidSource CSRC(fluid$=Water, mdot=0.1, P=200000, T=300)
LiquidSink CSNK()
Chiller CH(ref$=R134a, cool$=Water, U_tp=2000, U_sh=200, D=0.01, L=5, eps_zone=0.1, UA_cool=600)
connect(RSRC.out, CH.ref_in)
connect(CH.ref_out, RSNK.in)
connect(CSRC.out, CH.cool_in)
connect(CH.cool_out, CSNK.in)

{ CHECK ch.cool_in.h 112745.7491 0.11274574907657911 }
{ CHECK ch.cool_in.mdot 0.1 1e-7 }
{ CHECK ch.cool_in.p 200000 0.19999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ch.cool_in.h = 112745.7491
ch.cool_in.mdot = 0.1
ch.cool_in.p = 200000
```

<!-- verified-reference-example:end -->
