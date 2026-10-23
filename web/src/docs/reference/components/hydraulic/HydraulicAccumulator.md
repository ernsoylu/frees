---
name: HydraulicAccumulator
category: Component (hydraulic)
summary: "Gas-charged accumulator: precharge P0 filling gas volume V0; the oil drives the gas polytropically (P·V^γ = P0·V0^γ) with the gas volume as the state."
related: []
examples: []
tags: [hydraulicaccumulator, component, hydraulic, acausal]
references: []
---

# HydraulicAccumulator

Gas-charged accumulator: precharge P0 filling gas volume V0; the oil drives the gas polytropically (P·V^γ = P0·V0^γ) with the gas volume as the state.

Reusable acausal **hydraulic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/hydraulic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicAccumulator inst(P0, V0, gamma, rho, Vg0, domain$)
```

## Ports

`port`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `P0` | Number | Gas precharge pressure [Pa]. |
| `V0` | Number | Gas volume at the precharge pressure [m^3]. |
| `gamma` | Number | Polytropic exponent of the gas [-]. |
| `rho` | Number | Oil density [kg/m^3]. |
| `Vg0` | Number | Initial gas volume [m^3]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

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
HydraulicSupply      SUP(P=15000000 [Pa])
HydraulicAccumulator ACC(P0=9000000 [Pa], V0=0.01 [m^3], gamma=1.4, rho=870 [kg/m^3], Vg0=0.01 [m^3])
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
