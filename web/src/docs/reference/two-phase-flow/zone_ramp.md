---
name: zone_ramp
category: Two-Phase Flow
summary: Smooth zone-collapse ramp tanh(L/eps) (moving-boundary models)
related: []
examples: []
tags: [zone, ramp, two, phase, flow]
---

# zone_ramp

Smooth zone-collapse ramp tanh(L/eps) (moving-boundary models)


## Syntax

```
zone_ramp(L, eps)
```

## Description

Returns a **smooth `tanh(L/ε)` ramp** that fades a moving-boundary zone in/out as its length `L` approaches zero. It is a numerical `C¹` smoothing, not a physical correlation.

## Mathematical Formulation

$$ r(L) = \tanh\!\left(\frac{L}{\varepsilon}\right) \quad\text{(smooth zone-collapse ramp)} $$

## Applicability

- **Where it applies:** Moving-boundary heat-exchanger models (subcooled / two-phase / superheat zones).
- **Valid when:** Whenever a zone length can shrink to zero during a solve/transient.
- **How it's used:** Blends a zone's contribution smoothly so the corrector does not chatter at a regime switch.

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
| `L` | Number | Yes | Length [m]. |
| `eps` | Number | Yes | Effectiveness ε (0–1). |
