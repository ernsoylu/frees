---
name: TotalEnergyExchanger
category: Component (moistair)
summary: "Total-energy exchanger in the ASHRAE Standard 84 form: separate sensible and latent effectivenesses plus the EATR and OACF leakage terms."
related: []
examples: []
tags: [totalenergyexchanger, component, moistair, acausal]
references: []
---

# TotalEnergyExchanger

Total-energy exchanger in the ASHRAE Standard 84 form: separate sensible and latent effectivenesses plus the EATR and OACF leakage terms.

Total-energy exchanger stated the way ASHRAE Standard 84 defines it: SENSIBLE effectiveness on TEMPERATURE and LATENT effectiveness on HUMIDITY RATIO, as two independently rated numbers, plus the two leakage terms — EATR and OACF — that a recovery device cannot honestly be specified without.  This is the Std 84 form. `EnthalpyWheel` is the TOTAL-effectiveness form, exchanging enthalpy under a single eff_h. Both are legitimate and they are not the same model: a device whose sensible and latent effectivenesses differ cannot be described by one enthalpy effectiveness, and a membrane core is exactly such a device.  One component covers the two total-energy devices that are not wheels (Std 84 / Handbook—Systems Ch. 25, Table 3):  membrane plate  eps_s 50-75%  eps_L 50-73%  eatr 0-5%  oacf 0.97-1.06 twin towers     eps_s 40-60%  eps_L 40-60%  eatr 0     oacf 1.0  Twin towers circulate a sorbent solution between two physically separate contactor towers, so there is no shared surface and no carryover at all: eatr = 0 and oacf = 1 are structural there, not ratings.  eatr is the fraction of the SUPPLY leaving stream that is really exhaust air, so the leaving humidity is a mix of the conditioned outdoor air and that carryover. oacf is supply inlet flow over supply outlet flow — the leakage that makes a rated exchanger deliver less outdoor air than it is fed, and therefore the factor the supply fan has to be oversized by. Both are required rather than defaulted: leaving them implicit is the omission this component exists to prevent.

Reusable acausal **moistair-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Auto-generated** from this port's component library (`crates/frees-core/src/components/library-data/`). The ports, parameters, and variants are taken from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
TotalEnergyExchanger inst(eps_s, eps_L, eatr, oacf, domain$)
```

## Ports

`sup_in`, `sup_out`, `exh_in`, `exh_out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `eps_s` | Number | Sensible effectiveness [-]. |
| `eps_L` | Number | Latent effectiveness [-]. |
| `eatr` | Number | Exhaust air transfer ratio [-]. |
| `oacf` | Number | Outdoor air correction factor [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
sup_{out.mdot} &= \frac{sup_{in.mdot}}{oacf} \\
exh_{out.mdot} &= exh_{in.mdot} + sup_{in.mdot} - sup_{out.mdot} \\
sup_{out.p} &= sup_{in.p} \\
exh_{out.p} &= exh_{in.p} \\
t_{s_in} &= \text{Temperature}\left(\mathrm{airh2o}, h=sup_{in.h}, p=sup_{in.p}, w=sup_{in.w}\right) \\
t_{e_in} &= \text{Temperature}\left(\mathrm{airh2o}, h=exh_{in.h}, p=exh_{in.p}, w=exh_{in.w}\right) \\
w_{x} &= sup_{in.w} + eps_{l}\cdot \left(exh_{in.w} - sup_{in.w}\right) \\
t_{s_out} &= t_{s_in} + eps_{s}\cdot \left(t_{e_in} - t_{s_in}\right) \\
sup_{out.w} &= w_{x} + eatr\cdot \left(exh_{in.w} - w_{x}\right) \\
sup_{out.h} &= \text{Enthalpy}\left(\mathrm{airh2o}, t=t_{s_out}, p=sup_{in.p}, w=sup_{out.w}\right) \\
exh_{out.mdot}\cdot exh_{out.w} &= exh_{in.mdot}\cdot exh_{in.w} + sup_{in.mdot}\cdot sup_{in.w} - sup_{out.mdot}\cdot sup_{out.w} \\
exh_{out.mdot}\cdot exh_{out.h} &= exh_{in.mdot}\cdot exh_{in.h} + sup_{in.mdot}\cdot sup_{in.h} - sup_{out.mdot}\cdot sup_{out.h}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rate an HVAC component at specified inlet conditions

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
TotalEnergyExchanger C(eps_s=0.7, eps_L=0.6, eatr=0.02, oacf=1)
C.sup_in.mdot = 1 [kg/s]
C.sup_in.P = 101325 [Pa]
C.sup_in.W = 0.012
C.sup_in.h = Enthalpy(AirH2O, T=303.15, P=101325, W=0.012)
C.exh_in.mdot = 1 [kg/s]
C.exh_in.P = 101325 [Pa]
C.exh_in.W = 0.008
C.exh_in.h = Enthalpy(AirH2O, T=293.15, P=101325, W=0.008)

{ CHECK c.exh_in.h 40414.42776 0.04041442776219719 }
{ CHECK c.exh_out.h 53799.12373 0.05379912373285043 }
{ CHECK c.exh_out.mdot 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.exh_in.h = 40414.42776
c.exh_out.h = 53799.12373
c.exh_out.mdot = 1
```

<!-- verified-reference-example:end -->
