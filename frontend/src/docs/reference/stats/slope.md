---
name: slope
category: Stats
summary: Least-squares linear-fit slope
related: []
examples: []
tags: [slope, stats]
references:
  - "Montgomery, D.C. & Runger, G.C., Applied Statistics and Probability for Engineers"
---

# slope

Least-squares linear-fit slope


## Syntax

```
slope(xvals, yvals)
```

## Description

Least-squares linear-fit slope

## Mathematical Formulation

$$ m = \frac{\sum (x_i-\bar x)(y_i-\bar y)}{\sum (x_i-\bar x)^2} \quad\text{(least squares)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `xvals` | Number | Yes | Numeric argument. |
| `yvals` | Number | Yes | Numeric argument. |

## References

1. Montgomery, D.C. & Runger, G.C., Applied Statistics and Probability for Engineers.

