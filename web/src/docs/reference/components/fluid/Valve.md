---
name: Valve
category: Component (fluid)
summary: A flow restriction characterized by a flow/pressure-drop coefficient.
related: []
examples: []
tags: [valve, component, fluid, acausal]
---

# Valve

A flow restriction characterized by a flow/pressure-drop coefficient.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Valve inst(Cv, rho)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Cv` | Number | Flow coefficient. |
| `rho` | Number | Density [kg/m³]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
in.mdot\cdot \left|in.mdot\right| &= cv^{2}\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [out] = PSource(P, h0)
port(out)
  out.P = P
  out.h = h0
end
function [in] = PSink(P)
port(in)
  in.P = P
end
PSource SRC(P=200000, h0=0)
Valve   VLV(Cv=0.001, rho=1000)
PSink   SNK(P=100000)
connect(SRC.out, VLV.in)
connect(VLV.out, SNK.in)

{ CHECK snk.in.h 0 1e-8 }
{ CHECK snk.in.mdot 10 0.000009999999999999999 }
{ CHECK snk.in.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
snk.in.h = 0
snk.in.mdot = 10
snk.in.p = 100000
```

<!-- verified-reference-example:end -->
