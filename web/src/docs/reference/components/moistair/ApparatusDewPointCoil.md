---
name: ApparatusDewPointCoil
category: Component (moistair)
summary: Acausal moistair-domain component ApparatusDewPointCoil with ports in, out.
related: []
examples: []
tags: [apparatusdewpointcoil, component, moistair, acausal]
references: []
generated: true
---

# ApparatusDewPointCoil

Reusable acausal **moistair-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ApparatusDewPointCoil inst(T_adp, BF, domain$, model$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `T_adp` | Number |
| `BF` | Number |
| `domain$` | String |
| `model$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.p &= in.p \\
t_{in} &= \text{Temperature}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right) \\
t_{out} &= \text{Temperature}\left(\mathrm{airh2o}, h=out.h, p=in.p, w=out.w\right) \\
t_{dp_in} &= \text{Dewpoint}\left(\mathrm{airh2o}, h=in.h, p=in.p, w=in.w\right) \\
margin_{adp} &= t_{dp_in} - t_{adp} \\
mdot_{w} &= in.mdot\cdot \left(in.w - out.w\right) \\
h_{f} &= 4186\,\left(t_{out} - 273.15\right) \\
q_{air} &= in.mdot\cdot \left(in.h - out.h\right) \\
q &= q_{air} - mdot_{w}\cdot h_{f} \\
q_{sens} &= in.mdot\cdot \text{Cp}\left(\mathrm{airh2o}, t=t_{in}, p=in.p, w=in.w\right)\cdot \left(t_{in} - t_{out}\right) \\
shr &= \frac{q_{sens}}{q_{air}}
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `wet`

$$
\begin{aligned}
w_{adp} &= \text{Humrat}\left(\mathrm{airh2o}, t=t_{adp}, p=in.p, r=1\right) \\
h_{adp} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{adp}, p=in.p, w=w_{adp}\right) \\
out.w &= w_{adp} + bf\cdot \left(in.w - w_{adp}\right) \\
out.h &= h_{adp} + bf\cdot \left(in.h - h_{adp}\right)
\end{aligned}
$$

### `dry`

$$
\begin{aligned}
out.w &= in.w \\
out.h &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{adp} + bf\cdot \left(t_{in} - t_{adp}\right), p=in.p, w=in.w\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
ApparatusDewPointCoil C(T_adp=283.15, BF=0.15)
C.in.mdot = 1 [kg/s]
C.in.P = 101325 [Pa]
C.in.W = 0.012
C.in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)

{ CHECK c.h_adp 29354.50208 0.029354502080723512 }
{ CHECK c.h_f 54506.17017 0.05450617017489104 }
{ CHECK c.in.h 60848.84667 0.06084884666848224 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.h_adp = 29354.50208
c.h_f = 54506.17017
c.in.h = 60848.84667
```

<!-- verified-reference-example:end -->
