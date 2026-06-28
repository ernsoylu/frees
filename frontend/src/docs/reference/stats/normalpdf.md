---
name: normalpdf
category: Stats
summary: Normal probability density at x
related: []
examples: []
tags: [normalpdf, stats]
references:
  - "Montgomery, D.C. & Runger, G.C., Applied Statistics and Probability for Engineers"
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
| `x` | Number | Yes | Numeric argument. |
| `mu` | Number | Yes | Numeric argument. |
| `sigma` | Number | Yes | Numeric argument. |

## References

1. Montgomery, D.C. & Runger, G.C., Applied Statistics and Probability for Engineers.

