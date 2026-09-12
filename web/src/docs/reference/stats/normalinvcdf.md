---
name: normalinvcdf
category: Stats
summary: Inverse normal CDF (quantile) at p
related: []
examples: []
tags: [normalinvcdf, stats]
---

# normalinvcdf

Inverse normal CDF (quantile) at p


## Syntax

```
normalinvcdf(p, mu, sigma)
```

## Description

Inverse normal CDF (quantile) at p

## Mathematical Formulation

$$ x = \Phi^{-1}(p;\mu,\sigma) = \mu + \sigma\sqrt2\,\operatorname{erf}^{-1}(2p-1) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
a = normalCDF(0)
b = normalCDF(1.96)
c = normalInvCDF(0.975)
d = normalPDF(0)

{ CHECK a 0.5 5e-7 }
{ CHECK b 0.9750021049 9.750021048517795e-7 }
{ CHECK c 1.959963985 0.000001959963984540054 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a = 0.5
b = 0.9750021049
c = 1.959963985
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `p` | Number | Yes | Probability (0–1) / percentile rank. |
| `mu` | Number | Yes | Dynamic viscosity [Pa·s]. |
| `sigma` | Number | Yes | Surface tension [N/m]. |
