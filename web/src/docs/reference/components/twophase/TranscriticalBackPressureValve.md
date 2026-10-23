---
name: TranscriticalBackPressureValve
category: Component (twophase)
summary: "Transcritical back-pressure valve: signal-commanded high-side pressure control (CO2 cycles) — commanded-area odd-symmetric square law."
related: []
examples: []
tags: [transcriticalbackpressurevalve, component, twophase, acausal]
references: []
---

# TranscriticalBackPressureValve

Transcritical back-pressure valve: signal-commanded high-side pressure control (CO2 cycles) — commanded-area odd-symmetric square law.

Reusable acausal **twophase-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/twophase.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TranscriticalBackPressureValve inst(fluid$, CdA_max, domain$)
```

## Ports

`in`, `out`, `u`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Refrigerant name (e.g. R134a, R744, R1234yf). |
| `CdA_max` | Number | Fully open discharge coefficient times flow area [m^2]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
rho &= \text{Density}\left(\mathrm{fluid\$}, p=in.p, h=in.h\right) \\
out.mdot &= in.mdot \\
out.h &= in.h \\
in.mdot\cdot \left|in.mdot\right| &= \left(u.sig\cdot cda_{max}\right)^{2}\cdot 2\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// TranscriticalBackPressureValve: signal-commanded odd-symmetric square-law
// valve between fixed 1.2 MPa / 400 kPa rails at half opening (u.sig = 0.5).
// R744 is not in this build; the commanded-area law itself is fluid-agnostic.
TwoPhasePressureSource         HI(fluid$ = R134a, P = 1200000 [Pa], x = 0)
TranscriticalBackPressureValve BPV(fluid$ = R134a, CdA_max = 2e-6 [m^2])
SigConstant                    CMD(k = 0.5)
TwoPhasePressureSink           LO(P = 400000 [Pa])
connect(HI.out, BPV.in)
connect(BPV.out, LO.in)
connect(CMD.out, BPV.u)
mdot_v = BPV.in.mdot

{ CHECK bpv.in.h 265947.2005 0.26594720054814847 }
{ CHECK bpv.in.mdot 0.04231657854 4.2316578538075415e-8 }
{ CHECK bpv.in.p 1200000 1.2 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
bpv.in.h = 265947.2005
bpv.in.mdot = 0.04231657854
bpv.in.p = 1200000
```

<!-- verified-reference-example:end -->
