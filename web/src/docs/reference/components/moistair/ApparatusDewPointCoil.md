---
name: ApparatusDewPointCoil
category: Component (moistair)
summary: "Cooling coil stated the way a designer actually sizes one: by its APPARATUS DEW POINT and its BYPASS FACTOR, not by an imposed leaving temperature."
related: []
examples: []
tags: [apparatusdewpointcoil, component, moistair, acausal]
references: []
---

# ApparatusDewPointCoil

Cooling coil stated the way a designer actually sizes one: by its APPARATUS DEW POINT and its BYPASS FACTOR, not by an imposed leaving temperature.

The leaving state lies on the straight line from the entering state to the ADP — the saturated state the coil surface would drive the air to if none of it slipped past unconditioned. BF is the fraction that does slip past, so the leaving state sits BF of the way back from the ADP toward the entering state. Because the construction is one linear interpolation on the (W, h) pair, all three textbook forms of the bypass factor hold identically:  BF = (t_lvg - t_adp)/(t_ent - t_adp) = (W_lvg - W_adp)/(W_ent - W_adp) = (h_lvg - h_adp)/(h_ent - h_adp)  which is worth checking rather than assuming: it is what makes a coil result reproducible against any textbook. Typical BF is 0.05-0.25. BF = 0 recovers the saturated-leaving-air idealisation that `CoolingCoil` imposes, which is a perfect coil — real leaving air sits at 85-95% RH, not on the saturation line.  The condensate leaves the airstream carrying its own enthalpy, so the coil load is NOT simply the air-side enthalpy drop. `h_f` is the ASHRAE condensate term, 4.186*t at the leaving temperature. It is under 1% of the total at ordinary conditions, which is exactly why it gets dropped silently — and why `Q_air` (the air-side drop) and `Q` (the load the plant actually sees) are both written out here instead of quietly conflated.  The construction only applies to a coil that GETS WET. Run it on a surface above the entering dew point and it interpolates toward an apparatus dew point that does not exist, handing back air wetter than it entered — a cooling coil that humidifies. The `dry` rung is the coil in that regime, and `margin_adp` (entering dew point less T_adp) is the number that says which rung a design belongs on rather than leaving it to judgement.

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ApparatusDewPointCoil inst(T_adp, BF, domain$, model$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `T_adp` | Number | Apparatus dew point (`wet`) or mean surface temperature (`dry`) [K]. |
| `BF` | Number | Bypass factor [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |
| `model$` | String | Variant — `wet` (default) or `dry`. |

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
h_{f} &= 4186\,\left[J/kg-K\right]\,\left(t_{out} - 273.15\,\left[K\right]\right) \\
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
ApparatusDewPointCoil C(T_adp=283.15 [K], BF=0.15)
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
