---
name: normalcdf
category: Stats
summary: Normal cumulative distribution at x
related: []
examples: []
tags: [normalcdf, stats]
references:
  - "the standard literature, D.C. & the standard literature, G.C., a standard statistics text"
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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Numeric argument. |
| `mu` | Number | Yes | Numeric argument. |
| `sigma` | Number | Yes | Numeric argument. |

## References

1. the standard literature, D.C. & the standard literature, G.C., a standard statistics text.

