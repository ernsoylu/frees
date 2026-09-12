---
name: ZoneCO2
category: Component (signal)
summary: Acausal signal-domain component ZoneCO2 with ports vent, occ, out.
related: []
examples: []
tags: [zoneco2, component, signal, acausal]
references: []
generated: true
---

# ZoneCO2

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ZoneCO2 inst(Vz, c_amb, gen_occ, c0)
```

## Ports

`vent`, `occ`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `Vz` | Number |
| `c_amb` | Number |
| `gen_occ` | Number |
| `c0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(c\right) &= \frac{vent.sig\cdot \left(c_{amb} - c\right) + occ.sig\cdot gen_{occ}}{vz} \\
\text{init}\left(c\right) &= c0 \\
out.sig &= c
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// ZoneCO2 steady: der(c) -> 0 gives c = c_amb + occ*gen_occ/vent
// = 400 + 2*5/0.025 = 800 ppm (two occupants, 25 L/s of outdoor air).
// EXPECT c_z = 800 tol 1e-6
SigConstant VENT(k = 0.025)
SigConstant OCC(k = 2)
ZoneCO2     Z(Vz = 75, c_amb = 400, gen_occ = 5, c0 = 400)
connect(VENT.out, Z.vent)
connect(OCC.out, Z.occ)
c_z = Z.out.sig

{ CHECK c_z 800 0.0007999999999999999 }
{ CHECK occ.out.sig 2 0.000002 }
{ CHECK vent.out.sig 0.025 2.5e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c_z = 800
occ.out.sig = 2
vent.out.sig = 0.025
```

<!-- verified-reference-example:end -->
