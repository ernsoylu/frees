---
name: percentile
category: Stats
summary: p-th percentile, p in [0,100]
related: []
examples: []
tags: [percentile, stats]
references:
  - "the standard literature, D.C. & the standard literature, G.C., a standard statistics text"
---

# percentile

p-th percentile, p in [0,100]


## Syntax

```
percentile(p, x1, x2, ...)
```

## Description

p-th percentile, p in [0,100]

## Mathematical Formulation

$$ P_p = \text{value below which } p\% \text{ of the data fall (linear interpolation)} $$

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `p` | Number | Yes | Numeric argument. |
| `x1` | Number | Yes | Numeric argument. |
| `x2` | Number | Yes | Numeric argument. |
| `...` | Number | Yes | Numeric argument. |

## References

1. the standard literature, D.C. & the standard literature, G.C., a standard statistics text.

