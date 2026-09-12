---
name: Pump
category: Component (fluid)
summary: Raises the pressure of a liquid stream, computing the work from a pump efficiency.
related: [PumpMap, LiquidPump]
examples: [pump-sizing, rankine-cycle]
tags: [pump, pump-family, data:eta, ports:in-out, flow-closed, energy-work, steady, component, fluid, acausal]
---

# Pump

Raises the pressure of a liquid stream, computing the work from a pump efficiency.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Pump inst(eta, fluid$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `eta` | Number | Efficiency (0–1). |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
v &= \text{Volume}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
out.mdot &= in.mdot \\
out.h &= in.h + \frac{v\cdot \left(out.p - in.p\right)}{eta} \\
w &= in.mdot\cdot \left(out.h - in.h\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [in, out] = pump()
port(in)
port(out)
  out.P = in.P * 2
end

P_in = 1 [bar]

{ CHECK P_in 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
P_in = 100000 [Pa]
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: pump-sizing]
