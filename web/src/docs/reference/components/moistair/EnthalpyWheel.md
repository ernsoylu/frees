---
name: EnthalpyWheel
category: Component (moistair)
summary: Acausal moistair-domain component EnthalpyWheel with ports sup_in, sup_out, exh_in, exh_out.
related: []
examples: []
tags: [enthalpywheel, component, moistair, acausal]
references: []
generated: true
---

# EnthalpyWheel

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
EnthalpyWheel inst(eff_h, eff_w, domain$)
```

## Ports

`sup_in`, `sup_out`, `exh_in`, `exh_out`

## Parameters

| Parameter | Type |
| --- | --- |
| `eff_h` | Number |
| `eff_w` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
sup_{out.mdot} &= sup_{in.mdot} \\
exh_{out.mdot} &= exh_{in.mdot} \\
sup_{out.p} &= sup_{in.p} \\
exh_{out.p} &= exh_{in.p} \\
sup_{out.w} &= sup_{in.w} + eff_{w}\cdot \left(exh_{in.w} - sup_{in.w}\right) \\
sup_{out.h} &= sup_{in.h} + eff_{h}\cdot \left(exh_{in.h} - sup_{in.h}\right) \\
exh_{out.w} &= exh_{in.w} - \frac{sup_{in.mdot}}{exh_{in.mdot}}\cdot \left(sup_{out.w} - sup_{in.w}\right) \\
exh_{out.h} &= exh_{in.h} - \frac{sup_{in.mdot}}{exh_{in.mdot}}\cdot \left(sup_{out.h} - sup_{in.h}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Rotary enthalpy wheel in summer recovery: hot humid outdoor supply
// (305.15 K, W = 0.016) exchanges with cool dry building exhaust (297.15 K,
// W = 0.009) at eff_h = 0.75, eff_w = 0.7. Balanced 1 kg/s streams; moisture
// and energy close exactly on the dry-air basis.
MoistAirSource OA(P=101325, T=305.15, W=0.016, mdot=1)
MoistAirSource EX(P=101325, T=297.15, W=0.009, mdot=1)
EnthalpyWheel  WHL(eff_h=0.75, eff_w=0.7)
MoistAirSink   SUP()
MoistAirSink   REJ()
connect(OA.out, WHL.sup_in)
connect(WHL.sup_out, SUP.in)
connect(EX.out, WHL.exh_in)
connect(WHL.exh_out, REJ.in)
w_sup = SUP.W
h_sup = SUP.h
w_bal = 1 * (0.016 - SUP.W) - 1 * (REJ.W - 0.009)

{ CHECK ex.out.h 47043.47222 0.04704347221948946 }
{ CHECK ex.out.mdot 1 0.000001 }
{ CHECK ex.out.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ex.out.h = 47043.47222
ex.out.mdot = 1
ex.out.p = 101325
```

<!-- verified-reference-example:end -->
