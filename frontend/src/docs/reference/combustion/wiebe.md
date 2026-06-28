---
name: wiebe
category: Combustion
summary: Wiebe burned mass fraction
related: []
examples: []
tags: [wiebe, combustion]
references:
  - "Heywood, J.B., Internal Combustion Engine Fundamentals, Ch. 9"
---

# wiebe

Wiebe burned mass fraction


## Syntax

```
wiebe(theta, theta0, dtheta, a, m)
```

## Description

Wiebe burned mass fraction

## Mathematical Formulation

$$ x_b(\theta) = 1 - \exp\!\left[-a\left(\frac{\theta-\theta_0}{\Delta\theta}\right)^{m+1}\right] $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `theta` | Number | Yes | Numeric argument. |
| `theta0` | Number | Yes | Numeric argument. |
| `dtheta` | Number | Yes | Numeric argument. |
| `a` | Number | Yes | Numeric argument. |
| `m` | Number | Yes | Numeric argument. |

## References

1. Turns, S.R., An Introduction to Combustion (3rd ed.).
2. Heywood, J.B., Internal Combustion Engine Fundamentals.

