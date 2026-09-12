---
name: TwoPhaseReceiver
category: Component (twophase)
summary: A liquid receiver buffering refrigerant charge at saturation.
related: []
examples: []
tags: [twophasereceiver, component, twophase, acausal]
---

# TwoPhaseReceiver

A liquid receiver buffering refrigerant charge at saturation.

## Domain

A reusable **acausal twophase-domain** component — its two-phase refrigerant ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h` (quality/void follow from the properties). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
TwoPhaseReceiver inst(fluid$, V, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `V` | Number | Volume [m³]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid}, =in.p, p=0\right) \\
rho_{l} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=0\right) \\
rho_{g} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=1\right) \\
m &= v\cdot \left(ll\cdot rho_{l} + \left(1 - ll\right)\cdot rho_{g}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=900000, x=0.05)
TwoPhaseReceiver RCV(fluid$=R134a, V=0.002)
TwoPhaseSink SNK()
connect(SRC.out, RCV.in)
connect(RCV.out, SNK.in)
RCV.m = 1.000000

{ CHECK rcv.in.h 258162.3429 0.25816234293944756 }
{ CHECK rcv.in.mdot 0.02 2e-8 }
{ CHECK rcv.in.p 900000 0.8999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
rcv.in.h = 258162.3429
rcv.in.mdot = 0.02
rcv.in.p = 900000
```

<!-- verified-reference-example:end -->
