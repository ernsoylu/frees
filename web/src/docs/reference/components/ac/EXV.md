---
name: EXV
category: Component (ac)
summary: An electronic expansion valve with a commanded opening.
related: []
examples: []
tags: [exv, component, ac, acausal]
---

# EXV

An electronic expansion valve with a commanded opening.

## Domain

A reusable **acausal ac-domain** component — its refrigerant/air ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
EXV inst(fluid$, CdA_max, u, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `CdA_max` | Number | Maximum Cd·A [m²]. |
| `u` | Number | Specific internal energy [J/kg]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
rho_{in} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
in.mdot\cdot \left|in.mdot\right| &= \left(u\cdot cda_{max}\right)^{2}\cdot 2\cdot rho_{in}\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhasePressureSource HI(fluid$=R134a, P=900000, x=0)
EXV V(fluid$=R134a, CdA_max=2e-6, u=0.6)
TwoPhasePressureSink LO(P=350000)
connect(HI.out, V.in)
connect(V.out, LO.in)

{ CHECK hi.out.h 249779.7946 0.24977979464484554 }
{ CHECK hi.out.mdot 0.04296425443 4.296425443117416e-8 }
{ CHECK hi.out.p 900000 0.8999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
hi.out.h = 249779.7946
hi.out.mdot = 0.04296425443
hi.out.p = 900000
```

<!-- verified-reference-example:end -->
