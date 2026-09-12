---
name: LiquidDesiccantContactor
category: Component (moistair)
summary: Acausal moistair-domain component LiquidDesiccantContactor with ports in, out, wall.
related: []
examples: []
tags: [liquiddesiccantcontactor, component, moistair, acausal]
references: []
generated: true
---

# LiquidDesiccantContactor

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
LiquidDesiccantContactor inst(eff_L, W_eq, eps_T, f_excess, domain$, model$)
```

## Ports

`in`, `out`, `wall`

## Parameters

| Parameter | Type |
| --- | --- |
| `eff_L` | Number |
| `W_eq` | Number |
| `eps_T` | Number |
| `f_excess` | Number |
| `domain$` | String |
| `model$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
out.w &= in.w - eff_{l}\cdot \left(in.w - w_{eq}\right) \\
t_{in} &= \text{Temperature}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right) \\
mdot_{w} &= in.mdot\cdot \left(in.w - out.w\right)
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `cooled` — requires `eps_T`

$$
\begin{aligned}
t_{out} &= t_{in} - eps_{t}\cdot \left(t_{in} - wall.t\right) \\
out.h &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{out}, p=in.p, w=out.w\right) \\
h_{f} &= 4186\,\left(wall.t - 273.15\right) \\
q &= in.mdot\cdot \left(in.h - out.h\right) - mdot_{w}\cdot h_{f} \\
wall.qdot &= -q
\end{aligned}
$$

### `adiabatic` — requires `f_excess`

$$
\begin{aligned}
h_{f} &= 4186\,\left(t_{in} - 273.15\right) \\
h_{pure} &= in.h - \frac{mdot_{w}\cdot h_{f}}{in.mdot} \\
t_{pure} &= \text{Temperature}\left(\mathrm{airh2o}, h=h_{pure}, p=in.p, w=out.w\right) \\
t_{out} &= t_{in} + \left(1 + f_{excess}\right)\cdot \left(t_{pure} - t_{in}\right) \\
out.h &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{out}, p=in.p, w=out.w\right) \\
q &= 0 \\
wall.qdot &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
LiquidDesiccantContactor C(eff_L=0.6, W_eq=0.005, eps_T=0.7)
C.in.mdot = 1 [kg/s]
C.in.P = 101325 [Pa]
C.in.W = 0.012
C.in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.wall.T = 289.15 [K]

{ CHECK c.h_f 66976 0.066976 }
{ CHECK c.in.h 60848.84667 0.06084884666848224 }
{ CHECK c.mdot_w 0.0042 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.h_f = 66976
c.in.h = 60848.84667
c.mdot_w = 0.0042
```

<!-- verified-reference-example:end -->
