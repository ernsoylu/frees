---
name: normalcdf
category: Stats
summary: Normal cumulative distribution at x
related: []
examples: []
tags: [normalcdf, stats]
---

# normalcdf

Normal cumulative distribution at x


## Syntax

```
normalcdf(x, mu, sigma)
```

## Description

Normal cumulative distribution at x

## Mathematical Formulation

$$ \Phi(x;\mu,\sigma) = \tfrac12\left[1 + \operatorname{erf}\!\frac{x-\mu}{\sigma\sqrt2}\right] $$

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
| `x` | Number | Yes | Vapor quality (0–1). |
| `mu` | Number | Yes | Dynamic viscosity [Pa·s]. |
| `sigma` | Number | Yes | Surface tension [N/m]. |
