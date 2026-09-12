---
name: ThermalStorageTank
category: Component (liquid)
summary: Acausal liquid-domain component ThermalStorageTank with ports in, out.
related: []
examples: []
tags: [thermalstoragetank, component, liquid, acausal]
references: []
generated: true
---

# ThermalStorageTank

Reusable acausal **liquid-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ThermalStorageTank inst(fluid$, m_node, cp_f, UA_loss, T_amb, kmix, T10, T20, T30, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `fluid$` | String |
| `m_node` | Number |
| `cp_f` | Number |
| `UA_loss` | Number |
| `T_amb` | Number |
| `kmix` | Number |
| `T10` | Number |
| `T20` | Number |
| `T30` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
t_{in} &= \text{Temperature}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
\text{der}\left(t1\right) &= \frac{in.mdot\cdot cp_{f}\cdot \left(t_{in} - t1\right) + kmix\cdot \left(t2 - t1\right) - ua_{loss}\cdot \left(t1 - t_{amb}\right)}{m_{node}\cdot cp_{f}} \\
\text{init}\left(t1\right) &= t10 \\
\text{der}\left(t2\right) &= \frac{in.mdot\cdot cp_{f}\cdot \left(t1 - t2\right) + kmix\cdot \left(t1 - t2\right) + kmix\cdot \left(t3 - t2\right) - ua_{loss}\cdot \left(t2 - t_{amb}\right)}{m_{node}\cdot cp_{f}} \\
\text{init}\left(t2\right) &= t20 \\
\text{der}\left(t3\right) &= \frac{in.mdot\cdot cp_{f}\cdot \left(t2 - t3\right) + kmix\cdot \left(t2 - t3\right) - ua_{loss}\cdot \left(t3 - t_{amb}\right)}{m_{node}\cdot cp_{f}} \\
\text{init}\left(t3\right) &= t30 \\
out.h &= \text{Enthalpy}\left(\mathrm{fluid}, =out.p, p=t3\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// ThermalStorageTank charging at steady state: 340 K water into the top
// node, three-node stratification with kmix = 20 W/K mixing and small
// shell losses to 293 K ambient; der(Ti) = 0 solves the 3x3 node balance.
LiquidSource       LS(l1, fluid$ = Water, mdot = 0.2, P = 150000, T = 340)
ThermalStorageTank TST(l1, l2, fluid$ = Water, m_node = 50, cp_f = 4180, UA_loss = 5, T_amb = 293, kmix = 20, T10 = 320, T20 = 310, T30 = 300)
LiquidSink         SK(l2)

t_top    = TST.T1
t_mid    = TST.T2
t_bottom = TST.T3
h_out    = SK.h

{ CHECK h_out 276477.24 0.2764772399690453 }
{ CHECK l1.h 279966.8047 0.27996680472482555 }
{ CHECK l1.mdot 0.2 2e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
h_out = 276477.24 [J/kg]
l1.h = 279966.8047
l1.mdot = 0.2
```

<!-- verified-reference-example:end -->
