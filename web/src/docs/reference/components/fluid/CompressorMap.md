---
name: CompressorMap
category: Component (fluid)
summary: A compressor whose isentropic efficiency comes from a tabulated map (eta vs pressure ratio).
related: [Compressor, TwoPhaseCompressor]
examples: []
tags: [compressor, compressor-family, compressormap, map, data:map-eta, ports:in-out, flow-closed, energy-work, steady, map-driven, component, fluid, acausal]
---

# CompressorMap

A compressor whose isentropic efficiency comes from a tabulated map (eta vs pressure ratio).

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
CompressorMap inst(fluid$, map_eta$, model$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `fluid$` | String | Fluid name (e.g. R134a, Air). |
| `map_eta$` | String | Name of a TABLE/FUNCTION giving isentropic efficiency (0–1) vs pressure ratio (out.P/in.P). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
s_{in} &= \text{Entropy}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
h_{s} &= \text{Enthalpy}\left(\mathrm{fluid}, =out.p, p=s_{in}\right) \\
pr &= \frac{out.p}{in.p} \\
eta &= \text{map\_eta\$}\left(pr\right) \\
out.mdot &= in.mdot \\
out.h &= in.h + \frac{h_{s} - in.h}{eta} \\
w &= in.mdot\cdot \left(out.h - in.h\right)
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `eta`

_No additional equations (uses the shared body; the through-flow is imposed by the surrounding network)._

### `flow` — requires `map_mdot$`

$$
\begin{aligned}
in.mdot &= \text{map\_mdot\$}\left(pr\right)
\end{aligned}
$$

The flow rung makes the machine a true flow-determining (R) element — the mass
flow comes from the pressure-ratio characteristic, so a supply → compressor →
volume chain is well-posed on every integrator.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// CompressorMap, default `eta` variant: isentropic efficiency off a 1-D map
// vs pressure ratio. PR = 2.5 interpolates eta = 0.76 between the rows.
TABLE etamap(pr)
  1    0.82
  4    0.70
END

Source        SRC(a1, fluid$ = Air, mdot = 0.15, P = 100000, T = 300)
CompressorMap CM(a1, a2, fluid$ = Air, map_eta$ = etamap)
Sink          SK(a2)

a2.P     = 250000
w_c      = CM.W
eta_used = CM.eta

{ CHECK a1.h 426300.7759 0.42630077587390564 }
{ CHECK a1.mdot 0.15 1.5e-7 }
{ CHECK a1.p 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a1.h = 426300.7759
a1.mdot = 0.15
a1.p = 100000
```

<!-- verified-reference-example:end -->
