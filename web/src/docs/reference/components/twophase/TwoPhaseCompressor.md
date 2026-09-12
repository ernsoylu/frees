---
name: TwoPhaseCompressor
category: Component (twophase)
summary: A refrigerant compressor with selectable isentropic/volumetric variants.
related: [Compressor, CompressorMap]
examples: [ev-thermal-management]
tags: [compressor, compressor-family, twophasecompressor, ports:in-out, flow-closed, energy-work, steady, twophase, component, acausal]
---

# TwoPhaseCompressor

A refrigerant compressor with selectable isentropic/volumetric variants.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseCompressor inst(fluid$, eta, domain$, model$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `eta` | Number | Efficiency (0–1). |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |
| `model$` | String | Model variant — selects the physics body (see Model Variants). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
s_{in} &= \text{Entropy}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
h_{s} &= \text{Enthalpy}\left(\mathrm{fluid}, =out.p, p=s_{in}\right) \\
out.mdot &= in.mdot \\
out.h &= in.h + \frac{h_{s} - in.h}{eta} \\
w &= in.mdot\cdot \left(out.h - in.h\right)
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `isentropic`

_No additional equations (uses the shared body)._

### `volumetric` — requires `eta_v`, `disp`, `rpm`

$$
\begin{aligned}
rho_{in} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
in.mdot &= eta_{v}\cdot disp\cdot \frac{rpm}{60}\cdot rho_{in}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhasePressureSource SUC(fluid$=R134a, P=350000, x=1)
TwoPhaseCompressor CMP(fluid$=R134a, eta=0.7, model$=volumetric, eta_v=0.9, disp=2e-5, rpm=2500.000000)
TwoPhaseSink DIS()
connect(SUC.out, CMP.in)
connect(CMP.out, DIS.in)
CMP.out.P = 900000

{ CHECK cmp.h_s 421105.296 0.4211052959538628 }
{ CHECK cmp.in.h 401508.3388 0.4015083387584498 }
{ CHECK cmp.in.mdot 0.0128603239 1.2860323902024868e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cmp.h_s = 421105.296
cmp.in.h = 401508.3388
cmp.in.mdot = 0.0128603239
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: ev-thermal-management]
