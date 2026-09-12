---
name: normalpdf
category: Stats
summary: Normal probability density at x
related: []
examples: []
tags: [normalpdf, stats]
---

# normalpdf

Normal probability density at x


## Syntax

```
normalpdf(x, mu, sigma)
```

## Description

Normal probability density at x

## Mathematical Formulation

$$ \phi(x;\mu,\sigma) = \frac{1}{\sigma\sqrt{2\pi}}\,e^{-(x-\mu)^2/(2\sigma^2)} $$

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
