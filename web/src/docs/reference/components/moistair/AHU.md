---
name: AHU
category: Component (moistair)
summary: Acausal moistair-domain component AHU with ports ret_in, oa_in, sup_out.
related: []
examples: []
tags: [ahu, component, moistair, acausal]
references: []
generated: true
---

# AHU

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
AHU inst(Kf, foul, Tc, Qh, dPfan, eta_fan)
```

## Ports

`ret_in`, `oa_in`, `sup_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `Kf` | Number |
| `foul` | Number |
| `Tc` | Number |
| `Qh` | Number |
| `dPfan` | Number |
| `eta_fan` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
MixingBox   MB()
AirFilter   FL(K=Kf, foul=foul)
CoolingCoil CC(Tout=Tc)
HeatingCoil HC(Q=Qh)
MoistAirFan FN(dP=dPfan, eta=eta_fan)
connect(ret_in, MB.in1)
connect(oa_in, MB.in2)
connect(MB.out, FL.in)
connect(FL.out, CC.in)
connect(CC.out, HC.in)
connect(HC.out, FN.in)
connect(FN.out, sup_out)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Packaged air-handling unit (hierarchical: MixingBox + AirFilter +
// CoolingCoil + HeatingCoil + MoistAirFan): 2 kg/s return air at 297.15 K
// mixes with 1 kg/s outdoor air at 308.15 K, is filtered (K = 50, 20% fouled),
// cooled to a 285.15 K saturated coil outlet, reheated 3 kW, and delivered by
// a 600 Pa fan at 65% efficiency.
MoistAirSource RA(P=101325, T=297.15, W=0.009, mdot=2)
MoistAirSource OA(P=101325, T=308.15, W=0.016, mdot=1)
AHU            UNIT(Kf=50, foul=1.2, Tc=285.15, Qh=3000, dPfan=600, eta_fan=0.65)
MoistAirSink   SUP()
connect(RA.out, UNIT.ret_in)
connect(OA.out, UNIT.oa_in)
connect(UNIT.sup_out, SUP.in)
m_sup = SUP.mdot
w_sup = SUP.W
t_sup = Temperature(AirH2O, h=SUP.h, P=SUP.P, W=SUP.W)

{ CHECK m_sup 3 0.000003 }
{ CHECK oa.out.h 76252.01095 0.07625201095123273 }
{ CHECK oa.out.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
m_sup = 3 [kg/s]
oa.out.h = 76252.01095
oa.out.mdot = 1
```

<!-- verified-reference-example:end -->
