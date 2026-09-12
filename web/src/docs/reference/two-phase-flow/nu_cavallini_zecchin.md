---
name: nu_cavallini_zecchin
category: Two-Phase Flow
summary: Cavallini-Zecchin condensation Nusselt number
related: []
examples: []
tags: [nu, cavallini, zecchin, two, phase, flow]
---

# nu_cavallini_zecchin

Cavallini-Zecchin condensation Nusselt number


## Syntax

```
nu_cavallini_zecchin(Re_l, Pr_l, x, rho_l, rho_g)
```

## Description

Returns the **in-tube condensation Nusselt number** by the Cavallini–Zecchin correlation; the condensing-side film coefficient follows as `h = Nu·k_l/D_h`. It is one of the standard shear-dominated condensation correlations.

## Mathematical Formulation

$$ Nu = 0.05\,Re_{eq}^{0.8}\,Pr_l^{0.33} \quad\text{(Cavallini–Zecchin condensation)} $$

## Applicability

- **Where it applies:** The condensing two-phase refrigerant **inside the tubes of a condenser or gas-cooler**.
- **Valid when:** Annular, vapor-shear-controlled in-tube condensation with a turbulent liquid film; evaluate at the local vapor quality `x` (integrate across the pass for a mean value).
- **How it's used:** Convert to a film coefficient `h = Nu·k_l/D_h`, then combine it with the air/coolant side and the wall via `ua_hx`. Alternatives: `nu_shah` (broader range) and `nu_traviss`.

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
| `rho_l` | Number | Yes | Saturated-liquid density [kg/m³]. |
| `rho_g` | Number | Yes | Saturated-vapor density [kg/m³]. |
