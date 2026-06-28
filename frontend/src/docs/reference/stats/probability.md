---
name: probability
category: Stats
summary: Normal CDF at x
related: []
examples: []
tags: [probability, stats]
references:
  - "Montgomery, D.C. & Runger, G.C., Applied Statistics and Probability for Engineers"
---

# probability

Normal CDF at x


## Syntax

```
probability(x, mu, sigma)
```

## Description

Normal CDF at x

## Mathematical Formulation

$$ \Pr(X \le x) = \Phi\!\left(\frac{x-\mu}{\sigma}\right) $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
| `mu` | Number | Yes | Dynamic viscosity [Pa·s]. |
| `sigma` | Number | Yes | Surface tension [N/m]. |

## References

1. Montgomery, D.C. & Runger, G.C., Applied Statistics and Probability for Engineers.

