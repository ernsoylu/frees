---
name: VacuumEjector
category: Component (pneumatic)
summary: Acausal pneumatic-domain component VacuumEjector with ports sup_in, suc_in, exh_out.
related: []
examples: []
tags: [vacuumejector, component, pneumatic, acausal]
references: []
generated: true
---

# VacuumEjector

Reusable acausal **pneumatic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
VacuumEjector inst(fluid$, C, b, ER, domain$)
```

## Ports

`sup_in`, `suc_in`, `exh_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `C` | Number |
| `b` | Number |
| `ER` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
t_{s} &= \text{Temperature}\left(\mathrm{fluid}, =sup_{in.p}, p=sup_{in.h}\right) \\
sup_{in.mdot} &= \text{iso6358}\left(c, b, sup_{in.p}, t_{s}, exh_{out.p}\right) \\
suc_{in.mdot} &= er\cdot sup_{in.mdot} \\
exh_{out.mdot} &= sup_{in.mdot} + suc_{in.mdot} \\
exh_{out.mdot}\cdot exh_{out.h} &= sup_{in.mdot}\cdot sup_{in.h} + suc_{in.mdot}\cdot suc_{in.h}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Vacuum ejector picking a load: 7 bar motive air (choked ISO 6358) entrains
// ER = 0.6 times its mass flow from a 0.6 bar suction vessel; mass and energy
// mix exactly at the 1 bar exhaust.
PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
PneumaticSupply     VAC(fluid$=Air, P=60000, T=295)
VacuumEjector       EJ(fluid$=Air, C=2e-8, b=0.3, ER=0.6)
PneumaticAtmosphere ATM(P=100000)
connect(SUP.out, EJ.sup_in)
connect(VAC.out, EJ.suc_in)
connect(EJ.exh_out, ATM.port)
m_mot = EJ.sup_in.mdot
m_suc = EJ.suc_in.mdot
m_exh = EJ.exh_out.mdot

{ CHECK atm.port.h 423604.9779 0.42360497793321056 }
{ CHECK atm.port.mdot 0.02623920609 2.623920608798974e-8 }
{ CHECK atm.port.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
atm.port.h = 423604.9779
atm.port.mdot = 0.02623920609
atm.port.p = 100000
```

<!-- verified-reference-example:end -->
