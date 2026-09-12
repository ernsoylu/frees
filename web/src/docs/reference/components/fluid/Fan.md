---
name: Fan
category: Component (fluid)
summary: Adds a pressure rise to a gas/air stream, computing the fan work.
related: [FanCurve, FanMap]
examples: []
tags: [fan, fan-family, constant-rise, data:dP0-Q0-eta, ports:in-out, flow-closed, energy-work, steady, component, fluid, acausal]
---

# Fan

Adds a pressure rise to a gas/air stream, computing the fan work.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Fan inst(fluid$, dP0, Q0, eta)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `dP0` | Number | Reference pressure drop [Pa]. |
| `Q0` | Number | Reference heat [W]. |
| `eta` | Number | Efficiency (0–1). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
rho &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
q &= \frac{in.mdot}{rho} \\
dp &= dp0\cdot \left(1 - \left(\frac{q}{q0}\right)^{2}\right) \\
out.mdot &= in.mdot \\
out.p &= in.p + dp \\
out.h &= in.h + \frac{dp}{rho\cdot eta}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Calculate an air fan operating point

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
Fan C(fluid$=Air, dP0=500, Q0=2, eta=0.7)
C.in.P = 101325
C.in.h = Enthalpy(Air, T=300, P=101325)
C.in.mdot = 1

{ CHECK c.dp 409.76805 0.0004097680500074819 }
{ CHECK c.in.h 426297.7744 0.4262977743916913 }
{ CHECK c.out.h 426795.1279 0.4267951279369021 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.dp = 409.76805
c.in.h = 426297.7744
c.out.h = 426795.1279
```

<!-- verified-reference-example:end -->
