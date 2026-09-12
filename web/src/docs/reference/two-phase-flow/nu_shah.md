---
name: nu_shah
category: Two-Phase Flow
summary: Shah condensation Nusselt number
related: []
examples: []
tags: [nu, shah, two, phase, flow]
---

# nu_shah

Shah condensation Nusselt number


## Syntax

```
nu_shah(Re_l, Pr_l, x, p_red)
```

## Description

Returns the **in-tube condensation Nusselt number** by the Shah correlation — an enhancement on the liquid-only Nusselt number that captures the thinning film and vapor shear.

## Mathematical Formulation

$$ Nu_{TP} = Nu_l\left(1 + \frac{3.8}{Z^{0.95}}\right), \quad Z = (1/x - 1)^{0.8}p_r^{0.4} \quad\text{(Shah)} $$

## Applicability

- **Where it applies:** The condensing two-phase refrigerant side of a condenser / gas-cooler.
- **Valid when:** In-tube condensation across a wide quality and reduced-pressure range; depends on the reduced pressure `p_red`.
- **How it's used:** Gives the condensing film coefficient (`h = Nu·k_l/D_h`) for the refrigerant side. A robust general-purpose alternative to `nu_cavallini_zecchin` / `nu_traviss`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ ConvectiveHeat correlations. }
db_a = nu_dittus_boelter(20000, 4.0, 0.4)
db_b = nu_dittus_boelter(20000, 4.0, 0.3)
db_c = nu_dittus_boelter(1e-6, 1e-6, 0.4)
db_d = nu_dittus_boelter(5e6, 0.7, 0.4)

gn_a = nu_gnielinski(20000, 4.0)
gn_b = nu_gnielinski(3000, 0.71)
gn_c = nu_gnielinski(5e6, 7.0)
gn_d = nu_gnielinski(500, 4.0)

cf_a = chen_f(10)
cf_b = chen_f(5)
cf_c = chen_f(0.5)
cf_d = chen_f(1e-6)

cs_a = chen_s(20000, 1.0)
cs_b = chen_s(20000, 4.7)
cs_c = chen_s(1e-6, 1e-6)

sh_a = nu_shah(20000, 3.0, 0.5, 0.2)
sh_b = nu_shah(20000, 3.0, 0.0, 0.2)
sh_c = nu_shah(20000, 3.0, 1.0, 0.2)
sh_d = nu_shah(20000, 3.0, -5, 0.2)
sh_e = nu_shah(20000, 3.0, 5, 0.2)
sh_f = nu_shah(20000, 3.0, 0.5, 0.999999)

cz_a = nu_cavallini_zecchin(20000, 3.0, 0.5, 1200, 25)
cz_b = nu_cavallini_zecchin(20000, 3.0, 0.0, 1200, 25)
cz_c = nu_cavallini_zecchin(20000, 3.0, 1.0, 1200, 25)
cz_d = nu_cavallini_zecchin(20000, 3.0, -1, 1200, 25)

zr_a = zone_ramp(0.5, 0.01)
zr_b = zone_ramp(0.001, 0.01)
zr_c = zone_ramp(0, 0.01)
zr_d = zone_ramp(-1, 0.01)
zr_e = zone_ramp(1e-9, 0.01)

{ CHECK cf_a 1 0.000001 }
{ CHECK cf_b 1.225764672 0.0000012257646719418594 }
{ CHECK cf_c 4.21671436 0.000004216714359955286 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cf_a = 1
cf_b = 1.225764672
cf_c = 4.21671436
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `Re_l` | Number | Yes | Liquid-only Reynolds number. |
| `Pr_l` | Number | Yes | Liquid Prandtl number. |
| `x` | Number | Yes | Vapor quality (0–1). |
| `p_red` | Number | Yes | Reduced pressure P/Pcrit. |
