---
name: FanCurve
category: Component (fluid)
summary: A fan whose pressure rise follows a tabulated pressure–flow performance curve.
related: [Fan, FanMap]
examples: []
tags: [fan, fan-family, fancurve, curve, data:rho-dP0-Q0, ports:in-out, flow-closed, energy-pressure, steady, component, fluid, acausal]
---

# FanCurve

A fan whose pressure rise follows a tabulated pressure–flow performance curve.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
FanCurve inst(rho, dP0, Q0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `rho` | Number | Density [kg/m³]. |
| `dP0` | Number | Reference pressure drop [Pa]. |
| `Q0` | Number | Reference heat [W]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
q &= \frac{in.mdot}{rho} \\
dp &= dp0\cdot \left(1 - \left(\frac{q}{q0}\right)^{2}\right) \\
out.mdot &= in.mdot \\
out.p &= in.p + dp
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Quadratic fan curve: 250 Pa shut-off rise, zero rise at 0.12 m^3/s. }
FanCurve F1(rho=1.2, dP0=250, Q0=0.12)
F1.in.mdot = 0.06          { 0.05 m^3/s of air }
F1.in.P    = 101325
F1.in.h    = 300000
F1.out.h   = 300000

dP_fan = F1.out.P - F1.in.P

{ CHECK dP_fan 206.5972222 0.0002065972222 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
dP_fan = 206.5972222
```

<!-- verified-reference-example:end -->
