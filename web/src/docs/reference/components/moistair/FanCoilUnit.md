---
name: FanCoilUnit
category: Component (moistair)
summary: "Fan coil unit: a room terminal that recirculates air through a filter and a wet coil with a blow-through fan, so the fan heat adds to the coil load."
related: []
examples: []
tags: [fancoilunit, component, moistair, acausal]
references: []
---

# FanCoilUnit

Fan coil unit: a room terminal that recirculates air through a filter and a wet coil with a blow-through fan, so the fan heat adds to the coil load.

Fan coil unit: a room terminal that recirculates space air through a filter and a wet coil, with the fan BLOW-THROUGH — upstream of the coil, pushing air across it, which is the normal fan-coil arrangement (central station AHUs are the ones usually drawn through).  That ordering is not cosmetic. Blow-through puts the fan heat INTO the air the coil then has to cool, so the fan power appears in the coil load; draw it through instead and the same fan heat lands downstream of the coil, where it reheats the supply air the coil just conditioned. The two arrangements put the same watts in opposite places.  Unlike a chilled beam or an induction unit, a fan coil is built WITH a drain pan, so its coil may run wet and carry latent duty. That is the reason a fan coil can serve a space with no upstream dew-point control and a beam cannot.

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FanCoilUnit inst(K, foul, dP, eta, eps)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `K` | Number |
| `foul` | Number |
| `dP` | Number |
| `eta` | Number |
| `eps` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
AirFilter      FL(K=K, foul=foul)
MoistAirFan    FN(dP=dP, eta=eta)
MoistAirWallHX CO(model$=eps_t, eps=eps)
connect(in, FL.in)
connect(FL.out, FN.in)
connect(FN.out, CO.in)
connect(CO.out, out)
connect(wall, CO.wall)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
FanCoilUnit C(K=100 [Pa-s^2/kg^2], foul=1, dP=250 [Pa], eta=0.7, eps=0.7)
C.in.mdot = 1 [kg/s]
C.in.P = 101325 [Pa]
C.in.W = 0.012
C.in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.wall.T = 289.15 [K]

{ CHECK c.in.h 60848.84667 0.06084884666848224 }
{ CHECK c.out.h 50858.62185 0.05085862184517432 }
{ CHECK c.out.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.in.h = 60848.84667
c.out.h = 50858.62185
c.out.mdot = 1
```

<!-- verified-reference-example:end -->
