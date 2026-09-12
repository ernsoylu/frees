---
name: AirCoil
category: Component (ac)
summary: An air-to-refrigerant coil (the air side of an evaporator or condenser).
related: []
examples: []
tags: [aircoil, component, ac, acausal]
---

# AirCoil

An air-to-refrigerant coil (the air side of an evaporator or condenser).

## Domain

A reusable **acausal ac-domain** component — its refrigerant/air ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`ref_in`, `ref_out`, `air_in`, `air_out`

## Usage

```
AirCoil inst(ref$, U_tp, U_sh, D, L, eps_zone, eps_air)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `ref$` | String | Refrigerant name (e.g. R134a, R1234yf). |
| `U_tp` | Number | Two-phase-zone overall coefficient [W/m²·K]. |
| `U_sh` | Number | Superheat-zone overall coefficient [W/m²·K]. |
| `D` | Number | Diameter [m]. |
| `L` | Number | Length [m]. |
| `eps_zone` | Number | Zone-collapse smoothing width. |
| `eps_air` | Number | Air-side effectiveness. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
MovingBoundaryEvaporator EV(fluid$=ref$, U_tp=U_tp, U_sh=U_sh, D=D, L=L, eps_zone=eps_zone)
MoistAirWallHX AC(eps=eps_air)
connect(ref_in, EV.in)
connect(EV.out, ref_out)
connect(air_in, AC.in)
connect(AC.out, air_out)
connect(EV.wall, AC.wall)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhaseSource RSRC(fluid$=R134a, mdot=0.01, P=300000, x=0.2)
TwoPhaseSink RSNK()
MoistAirSource ASRC(P=101325, T=300, W=0.012, mdot=0.05)
MoistAirSink ASNK()
AirCoil COIL(ref$=R134a, U_tp=2000, U_sh=200, D=0.01, L=5, eps_zone=0.1, eps_air=0.8)
connect(RSRC.out, COIL.ref_in)
connect(COIL.ref_out, RSNK.in)
connect(ASRC.out, COIL.air_in)
connect(COIL.air_out, ASNK.in)

{ CHECK asnk.h 28477.20359 0.028477203594930757 }
{ CHECK asnk.in.h 28477.20359 0.028477203594930757 }
{ CHECK asnk.in.mdot 0.05 5e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
asnk.h = 28477.20359
asnk.in.h = 28477.20359
asnk.in.mdot = 0.05
```

<!-- verified-reference-example:end -->
