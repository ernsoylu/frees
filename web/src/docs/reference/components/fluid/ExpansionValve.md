---
name: ExpansionValve
category: Component (fluid)
summary: Throttles a fluid to a lower pressure isenthalpically (Joule–Thomson).
related: []
examples: []
tags: [expansionvalve, component, fluid, acausal]
---

# ExpansionValve

Throttles a fluid to a lower pressure isenthalpically (Joule–Thomson).

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
ExpansionValve inst(CdA, rho_in)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `CdA` | Number | Discharge coefficient × area Cd·A [m²]. |
| `rho_in` | Number | Inlet density [kg/m³]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
in.mdot\cdot \left|in.mdot\right| &= cda^{2}\cdot 2\cdot rho_{in}\cdot \left(in.p - out.p\right)
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
PSource       SRC(P=1200000, h0=250000)
ExpansionValve TXV(CdA=1e-6, rho_in=1200)
PSink         SNK(P=300000)
connect(SRC.out, TXV.in)
connect(TXV.out, SNK.in)

{ CHECK snk.in.h 250000 0.25 }
{ CHECK snk.in.mdot 0.04647580015 4.6475800154489004e-8 }
{ CHECK snk.in.p 300000 0.3 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
snk.in.h = 250000
snk.in.mdot = 0.04647580015
snk.in.p = 300000
```

<!-- verified-reference-example:end -->
