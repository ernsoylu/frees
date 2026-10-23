---
name: AHU
category: Component (moistair)
summary: "Air-handling unit: mixing box + filter + cooling coil + reheat coil + supply fan in one block (all stateless stages, replaceable by editing the source)."
related: []
examples: []
tags: [ahu, component, moistair, acausal]
references: []
---

# AHU

Air-handling unit: mixing box + filter + cooling coil + reheat coil + supply fan in one block (all stateless stages, replaceable by editing the source).

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/moistair.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
AHU inst(Kf, foul, Tc, Qh, dPfan, eta_fan)
```

## Ports

`ret_in`, `oa_in`, `sup_out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Kf` | Number | Clean-filter resistance, Δp per (mass flow)² [Pa-s^2/kg^2]. |
| `foul` | Number | Filter fouling multiplier (1 = clean) [-]. |
| `Tc` | Number | Cooling-coil leaving air temperature [K]. |
| `Qh` | Number | Heating-coil duty [W]. |
| `dPfan` | Number | Fan pressure rise [Pa]. |
| `eta_fan` | Number | Fan efficiency [-]. |

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
MoistAirSource RA(P=101325 [Pa], T=297.15 [K], W=0.009, mdot=2 [kg/s])
MoistAirSource OA(P=101325 [Pa], T=308.15 [K], W=0.016, mdot=1 [kg/s])
AHU            UNIT(Kf=50 [Pa-s^2/kg^2], foul=1.2, Tc=285.15 [K], Qh=3000 [W], dPfan=600 [Pa], eta_fan=0.65)
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
