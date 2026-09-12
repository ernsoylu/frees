---
name: Turbocharger
category: Component (fluid)
summary: A turbine-driven compressor pair coupled on a common shaft.
related: []
examples: []
tags: [turbocharger, component, fluid, acausal]
---

# Turbocharger

A turbine-driven compressor pair coupled on a common shaft.

## Domain

A reusable **acausal fluid-domain** component — its thermofluid ports carry pressure `P`, mass-flow `ṁ`, and specific enthalpy `h`; a node enforces equal `P` and `Σṁ = 0`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`t_in`, `t_out`, `c_in`, `c_out`

## Usage

```
Turbocharger inst(cp, eta_t, eta_c, gam)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `cp` | Number | Specific heat [J/kg·K]. |
| `eta_t` | Number | Turbine efficiency (0–1). |
| `eta_c` | Number | Compressor efficiency (0–1). |
| `gam` | Number | Ratio of specific heats. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
prt &= \frac{t_{in.p}}{t_{out.p}} \\
t_{out.t} &= t_{in.t}\cdot \left(1 - eta_{t}\cdot \left(1 - prt^{\frac{1 - gam}{gam}}\right)\right) \\
t_{out.mdot} &= t_{in.mdot} \\
wt &= t_{in.mdot}\cdot cp\cdot \left(t_{in.t} - t_{out.t}\right) \\
prc &= \frac{c_{out.p}}{c_{in.p}} \\
c_{out.t} &= c_{in.t}\cdot \left(1 + \frac{prc^{\frac{gam - 1}{gam}} - 1}{eta_{c}}\right) \\
c_{out.mdot} &= c_{in.mdot} \\
wc &= c_{in.mdot}\cdot cp\cdot \left(c_{out.t} - c_{in.t}\right) \\
wt &= wc
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Turbocharger TC(t1, t2, c1, c2, cp=1005, eta_t=0.8, eta_c=0.78, gam=1.4)
t1.T = 900
t1.P = 200000
t1.mdot = 0.1
t2.P = 100000
c1.T = 300
c1.P = 100000
c1.mdot = 0.1

{ CHECK c2.mdot 0.1 1e-7 }
{ CHECK c2.p 275867.4952 0.2758674952151855 }
{ CHECK c2.t 429.3585437 0.0004293585436745006 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c2.mdot = 0.1
c2.p = 275867.4952
c2.t = 429.3585437
```

<!-- verified-reference-example:end -->
