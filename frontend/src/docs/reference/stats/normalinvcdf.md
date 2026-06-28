---
name: normalinvcdf
category: Stats
summary: Inverse normal CDF (quantile) at p
related: []
examples: []
tags: [normalinvcdf, stats]
references:
  - "Montgomery, D.C. & Runger, G.C., Applied Statistics and Probability for Engineers"
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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `p` | Number | Yes | Numeric argument. |
| `mu` | Number | Yes | Numeric argument. |
| `sigma` | Number | Yes | Numeric argument. |

## References

1. Montgomery, D.C. & Runger, G.C., Applied Statistics and Probability for Engineers.

