---
name: t2_t1_shock
category: Compressible Flow
summary: Normal-shock static temperature ratio
related: []
examples: []
tags: [t2, t1, shock, compressible, flow]
---

# t2_t1_shock

Normal-shock static temperature ratio


## Syntax

```
T2_T1_shock(M1, k)
```

## Description

Normal-shock static temperature ratio

## Mathematical Formulation

$$ \frac{T_2}{T_1} = \frac{\big[1 + \tfrac{k-1}{2}M_1^2\big]\big[\tfrac{2k}{k-1}M_1^2 - 1\big]}{M_1^2\,(k+1)^2/[2(k-1)]} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Normal-shock relations across a stationary shock
{ Downstream state 2 from upstream Mach M1 for air and for a monatomic gas.
  All five ratios plus the sonic limit M1 = 1 where the shock vanishes. }
k = 1.4
M1 = 3.0

M2 = M2_shock(M1, k)
M2b = mach_shock(M1, k)
P21 = P2_P1_shock(M1, k)
T21 = T2_T1_shock(M1, k)
R21 = rho2_rho1_shock(M1, k)
P0201 = P02_P01_shock(M1, k)

Mone = 1.0
M2_one = M2_shock(Mone, k)
P21_one = P2_P1_shock(Mone, k)
T21_one = T2_T1_shock(Mone, k)
R21_one = rho2_rho1_shock(Mone, k)
P0201_one = P02_P01_shock(Mone, k)

kmono = 1.6666666666666667
M2_mono = M2_shock(4.5, kmono)
P21_mono = P2_P1_shock(4.5, kmono)
T21_mono = T2_T1_shock(4.5, kmono)
R21_mono = rho2_rho1_shock(4.5, kmono)
P0201_mono = P02_P01_shock(4.5, kmono)

{ CHECK M2 0.4751909633 4.751909633114914e-7 }
{ CHECK M2_mono 0.4815809376 4.815809376431411e-7 }
{ CHECK M2_one 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
M2 = 0.4751909633
M2_mono = 0.4815809376
M2_one = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `M1` | Number | Yes | Upstream Mach number (≥ 1). |
| `k` | Number | Yes | Ratio of specific heats (e.g. 1.4 for air). |
