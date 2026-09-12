---
name: Compressor
category: Component (fluid)
summary: Raises the pressure of a fluid stream, computing the work from an isentropic efficiency.
related: [CompressorMap, TwoPhaseCompressor]
examples: [ev-thermal-management]
tags: [compressor, compressor-family, data:eta, ports:in-out, flow-closed, energy-work, steady, component, fluid, acausal]
---

# Compressor

Raises the pressure of a fluid stream, computing the work from an isentropic efficiency.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
Compressor inst(eta, fluid$, model$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `eta` | Number | Efficiency (0–1). |
| `fluid$` | String | Fluid name (e.g. Water, R134a, Air). |
| `model$` | String | Model variant — selects the physics body (see Model Variants). |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
s_{in} &= \text{Entropy}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
h_{s} &= \text{Enthalpy}\left(\mathrm{fluid}, =out.p, p=s_{in}\right) \\
out.mdot &= in.mdot \\
out.h &= in.h + \frac{h_{s} - in.h}{eta} \\
w &= in.mdot\cdot \left(out.h - in.h\right)
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `isentropic`

_No additional equations (uses the shared body)._

### `volumetric` — requires `eta_v`, `disp`, `rpm`

$$
\begin{aligned}
rho_{in} &= \text{Density}\left(\mathrm{fluid}, =in.p, p=in.h\right) \\
in.mdot &= eta_{v}\cdot disp\cdot \frac{rpm}{60}\cdot rho_{in}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Compressor K(s1, s2, eta=0.8, fluid$=R134a)
s1.P = 200000
s1.T = 283.15
s1.mdot = 0.05
s2.P = 1000000

{ CHECK k.h_s 446718.4718 0.44671847177539586 }
{ CHECK k.s_in 1796.067258 0.0017960672575811013 }
{ CHECK k.w 2312.063806 0.002312063805680466 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
k.h_s = 446718.4718
k.s_in = 1796.067258
k.w = 2312.063806
```

<!-- verified-reference-example:end -->

Instantiated in the verified example below:

[Run: ev-thermal-management]
