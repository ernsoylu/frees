---
name: DOAS
category: Component (moistair)
summary: Acausal moistair-domain component DOAS with ports oa_in, sup_out, exh_in, exh_out.
related: []
examples: []
tags: [doas, component, moistair, acausal]
references: []
generated: true
---

# DOAS

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
DOAS inst(eff_h, eff_w, T_adp, BF, Q_reheat)
```

## Ports

`oa_in`, `sup_out`, `exh_in`, `exh_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `eff_h` | Number |
| `eff_w` | Number |
| `T_adp` | Number |
| `BF` | Number |
| `Q_reheat` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
EnthalpyWheel         ERV(eff_h=eff_h, eff_w=eff_w)
ApparatusDewPointCoil CC(T_adp=T_adp, BF=BF)
HeatingCoil           RH(Q=Q_reheat)
connect(oa_in, ERV.sup_in)
connect(ERV.sup_out, CC.in)
connect(CC.out, RH.in)
connect(RH.out, sup_out)
connect(exh_in, ERV.exh_in)
connect(ERV.exh_out, exh_out)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
DOAS C(eff_h=0.6, eff_w=0.5, T_adp=283.15, BF=0.15, Q_reheat=1000)
C.oa_in.mdot = 1 [kg/s]
C.oa_in.P = 101325 [Pa]
C.oa_in.W = 0.012
C.oa_in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.exh_in.mdot = 1 [kg/s]
C.exh_in.P = 101325 [Pa]
C.exh_in.W = 0.008
C.exh_in.h = Enthalpy(AirH2O, T=293.15, P=101325, W=0.008)

{ CHECK c.exh_in.h 40414.42776 0.04041442776219719 }
{ CHECK c.exh_out.h 52675.07911 0.05267507910596822 }
{ CHECK c.exh_out.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.exh_in.h = 40414.42776
c.exh_out.h = 52675.07911
c.exh_out.mdot = 1
```

<!-- verified-reference-example:end -->
