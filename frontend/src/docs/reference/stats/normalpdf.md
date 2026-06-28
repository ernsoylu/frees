---
name: normalpdf
category: Stats
summary: Normal probability density at x
related: []
examples: []
tags: [normalpdf, stats]
references:
  - "the standard literature, D.C. & the standard literature, G.C., a standard statistics text"
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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
| `mu` | Number | Yes | Dynamic viscosity [Pa·s]. |
| `sigma` | Number | Yes | Surface tension [N/m]. |

## References

1. the standard literature, D.C. & the standard literature, G.C., a standard statistics text.

