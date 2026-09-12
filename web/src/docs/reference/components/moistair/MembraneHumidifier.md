---
name: MembraneHumidifier
category: Component (moistair)
summary: Acausal moistair-domain component MembraneHumidifier with ports dry_in, dry_out, wet_in, wet_out.
related: []
examples: []
tags: [membranehumidifier, component, moistair, acausal]
references: []
generated: true
---

# MembraneHumidifier

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
MembraneHumidifier inst(eff_h, eff_w, domain$)
```

## Ports

`dry_in`, `dry_out`, `wet_in`, `wet_out`

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
dry_{out.mdot} &= dry_{in.mdot} \\
wet_{out.mdot} &= wet_{in.mdot} \\
dry_{out.p} &= dry_{in.p} \\
wet_{out.p} &= wet_{in.p} \\
dry_{out.w} &= dry_{in.w} + eff_{w}\cdot \left(wet_{in.w} - dry_{in.w}\right) \\
dry_{out.h} &= dry_{in.h} + eff_{h}\cdot \left(wet_{in.h} - dry_{in.h}\right) \\
wet_{out.w} &= wet_{in.w} - \frac{dry_{in.mdot}}{wet_{in.mdot}}\cdot \left(dry_{out.w} - dry_{in.w}\right) \\
wet_{out.h} &= wet_{in.h} - \frac{dry_{in.mdot}}{wet_{in.mdot}}\cdot \left(dry_{out.h} - dry_{in.h}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Fuel-cell membrane humidifier: cathode exhaust (330.15 K, W = 0.05) wets the
// dry supply (300.15 K, W = 0.002) with effectiveness 0.75 on moisture and
// 0.7 on enthalpy. Water and energy close exactly on the dry-air basis:
// wet-side losses mirror the dry-side gains scaled by mdot_dry/mdot_wet.
MoistAirSource DRY(P=101325, T=300.15, W=0.002, mdot=0.02)
MoistAirSource WET(P=101325, T=330.15, W=0.05, mdot=0.025)
MembraneHumidifier MH(eff_h=0.7, eff_w=0.75)
MoistAirSink   DOUT()
MoistAirSink   WOUT()
connect(DRY.out, MH.dry_in)
connect(MH.dry_out, DOUT.in)
connect(WET.out, MH.wet_in)
connect(MH.wet_out, WOUT.in)
w_dry_out = DOUT.W
w_wet_out = WOUT.W
w_balance = 0.02 * (DOUT.W - 0.002) - 0.025 * (0.05 - WOUT.W)

{ CHECK dout.h 141025.8573 0.14102585728890504 }
{ CHECK dout.in.h 141025.8573 0.14102585728890504 }
{ CHECK dout.in.mdot 0.02 2e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dout.h = 141025.8573
dout.in.h = 141025.8573
dout.in.mdot = 0.02
```

<!-- verified-reference-example:end -->
