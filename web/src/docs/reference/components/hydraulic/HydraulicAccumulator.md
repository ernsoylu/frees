---
name: HydraulicAccumulator
category: Component (hydraulic)
summary: Acausal hydraulic-domain component HydraulicAccumulator with ports port.
related: []
examples: []
tags: [hydraulicaccumulator, component, hydraulic, acausal]
references: []
generated: true
---

# HydraulicAccumulator

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicAccumulator inst(P0, V0, gamma, rho, Vg0, domain$)
```

## Ports

`port`

## Parameters

| Parameter | Type |
| --- | --- |
| `P0` | Number |
| `V0` | Number |
| `gamma` | Number |
| `rho` | Number |
| `Vg0` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(vg\right) &= \frac{-port.mdot}{rho} \\
\text{init}\left(vg\right) &= vg0 \\
port.p &= p0\cdot \left(\frac{v0}{vg}\right)^{gamma}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Gas-charged accumulator riding a 150 bar line at steady state (der(Vg) -> 0
// so port.mdot = 0): precharged to 90 bar over V0 = 10 L, the polytropic gas
// (gamma = 1.4) compresses to Vg = V0*(P0/P)^(1/gamma) = 6.944 L.
HydraulicSupply      SUP(P=15000000)
HydraulicAccumulator ACC(P0=9000000, V0=0.01, gamma=1.4, rho=870, Vg0=0.01)
connect(SUP.out, ACC.port)
v_gas = ACC.Vg
q_acc = ACC.port.mdot

{ CHECK acc.port.h 0 1e-8 }
{ CHECK acc.port.mdot 0 1e-8 }
{ CHECK acc.port.p 15000000 15 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
acc.port.h = 0
acc.port.mdot = 0
acc.port.p = 15000000
```

<!-- verified-reference-example:end -->
