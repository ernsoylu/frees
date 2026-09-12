---
name: Diffuser
category: Component (moistair)
summary: Acausal moistair-domain component Diffuser with ports in, out.
related: []
examples: []
tags: [diffuser, component, moistair, acausal]
references: []
generated: true
---

# Diffuser

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
Diffuser inst(A1, A2, eta_rec, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `A1` | Number |
| `A2` | Number |
| `eta_rec` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.w &= in.w \\
out.h &= in.h \\
rho &= \frac{1}{\text{Volume}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right)} \\
v1 &= \frac{in.mdot\cdot \left(1 + in.w\right)}{rho\cdot a1} \\
out.p &= in.p + eta_{rec}\cdot 0.5\cdot rho\cdot v1^{2}\cdot \left(1 - \left(\frac{a1}{a2}\right)^{2}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Outlet diffuser: 0.6 kg/s expands from A1 = 0.05 m2 to A2 = 0.15 m2 with
// 70% static-pressure recovery of the inlet velocity head.
MoistAirSource SUP(P=101325, T=295.15, W=0.009, mdot=0.6)
Diffuser       DIF(A1=0.05, A2=0.15, eta_rec=0.7)
MoistAirSink   SNK()
connect(SUP.out, DIF.in)
connect(DIF.out, SNK.in)
dp_rec = SNK.P - 101325
v_in   = DIF.V1

{ CHECK dif.in.h 44997.11324 0.044997113243082636 }
{ CHECK dif.in.mdot 0.6 6e-7 }
{ CHECK dif.in.p 101325 0.101325 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dif.in.h = 44997.11324
dif.in.mdot = 0.6
dif.in.p = 101325
```

<!-- verified-reference-example:end -->
