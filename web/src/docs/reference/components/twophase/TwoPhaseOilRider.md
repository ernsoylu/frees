---
name: TwoPhaseOilRider
category: Component (twophase)
summary: "Oil-circulation-rate rider: declares the oil mass fraction on the stream (it rides every downstream pass-through node like W/z) and exposes the documented HTC degradation factor f_deg = 1 - k_deg*OCR to inject into downstream UA parameters."
related: []
examples: []
tags: [twophaseoilrider, component, twophase, acausal]
references: []
---

# TwoPhaseOilRider

Oil-circulation-rate rider: declares the oil mass fraction on the stream (it rides every downstream pass-through node like W/z) and exposes the documented HTC degradation factor f_deg = 1 - k_deg*OCR to inject into downstream UA parameters.

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TwoPhaseOilRider inst(oc_set, k_deg, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `oc_set` | Number | Oil circulation ratio imposed on the stream [-]. |
| `k_deg` | Number | Fractional performance loss per unit oil circulation ratio [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.h &= in.h \\
out.oc &= oc_{set} \\
f_{deg} &= 1 - k_{deg}\cdot oc_{set}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Apply an oil concentration correction

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
TwoPhaseOilRider C(oc_set=0.03, k_deg=2)
C.in.mdot = 0.1
C.in.P = 500000
C.in.h = 300000

{ CHECK c.f_deg 0.94 9.399999999999999e-7 }
{ CHECK c.out.h 300000 0.3 }
{ CHECK c.out.mdot 0.1 1e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.f_deg = 0.94
c.out.h = 300000
c.out.mdot = 0.1
```

<!-- verified-reference-example:end -->
