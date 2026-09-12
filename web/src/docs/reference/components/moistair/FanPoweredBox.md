---
name: FanPoweredBox
category: Component (moistair)
summary: Acausal moistair-domain component FanPoweredBox with ports pri_in, ind_in, out.
related: []
examples: []
tags: [fanpoweredbox, component, moistair, acausal]
references: []
generated: true
---

# FanPoweredBox

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
FanPoweredBox inst(Q_fan, Q_reheat, domain$)
```

## Ports

`pri_in`, `ind_in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `Q_fan` | Number |
| `Q_reheat` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.p &= pri_{in.p} \\
out.mdot &= pri_{in.mdot} + ind_{in.mdot} \\
out.mdot\cdot out.w &= pri_{in.mdot}\cdot pri_{in.w} + ind_{in.mdot}\cdot ind_{in.w} \\
out.mdot\cdot out.h &= pri_{in.mdot}\cdot pri_{in.h} + ind_{in.mdot}\cdot ind_{in.h} + q_{fan} + q_{reheat}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
FanPoweredBox C(Q_fan=100, Q_reheat=1000)
C.pri_in.mdot = 1 [kg/s]
C.pri_in.P = 101325 [Pa]
C.pri_in.W = 0.012
C.pri_in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.ind_in.mdot = 1 [kg/s]
C.ind_in.P = 101325 [Pa]
C.ind_in.W = 0.008
C.ind_in.h = Enthalpy(AirH2O, T=293.15, P=101325, W=0.008)

{ CHECK c.ind_in.h 40414.42776 0.04041442776219719 }
{ CHECK c.out.h 51181.63722 0.05118163721533971 }
{ CHECK c.out.mdot 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.ind_in.h = 40414.42776
c.out.h = 51181.63722
c.out.mdot = 2
```

<!-- verified-reference-example:end -->
