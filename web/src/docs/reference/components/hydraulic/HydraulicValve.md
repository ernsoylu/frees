---
name: HydraulicValve
category: Component (hydraulic)
summary: A hydraulic valve metering flow vs. pressure drop.
related: []
examples: []
tags: [hydraulicvalve, component, hydraulic, acausal]
---

# HydraulicValve

A hydraulic valve metering flow vs. pressure drop.

## Domain

A reusable **acausal hydraulic-domain** component — its oil-hydraulic ports carry pressure `P`, mass-flow `ṁ`, and enthalpy `h`. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `out`

## Usage

```
HydraulicValve inst(CdA_max, rho, u, domain$)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `CdA_max` | Number | Maximum Cd·A [m²]. |
| `rho` | Number | Density [kg/m³]. |
| `u` | Number | Specific internal energy [J/kg]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
in.mdot\cdot \left|in.mdot\right| &= \left(u\cdot cda_{max}\right)^{2}\cdot 2\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Calculate oil flow through a half-open valve

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
HydraulicValve C(CdA_max=0.00001, rho=850, u=0.5)
C.in.P = 1000000
C.out.P = 100000
C.in.h = 0

{ CHECK c.in.mdot 0.1955760722 1.9557607215607945e-7 }
{ CHECK c.out.h 0 1e-8 }
{ CHECK c.out.mdot 0.1955760722 1.9557607215607945e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.in.mdot = 0.1955760722
c.out.h = 0
c.out.mdot = 0.1955760722
```

<!-- verified-reference-example:end -->
