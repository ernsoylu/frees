---
name: percentile
category: Stats
summary: p-th percentile, p in [0,100]
related: []
examples: []
tags: [percentile, stats]
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

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
v = [2, 4, 4, 4, 5, 5, 7, 9]
p50 = Percentile(50, v[1:8])
p25 = Percentile(25, v[1:8])

{ CHECK p25 4 0.000004 }
{ CHECK p50 4.5 0.0000045 }
{ CHECK v[1] 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
p25 = 4
p50 = 4.5
v[1] = 2
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `p` | Number | Yes | Probability (0–1) / percentile rank. |
| `x1` | Number | Yes | First value. |
| `x2` | Number | Yes | Second value. |
| `...` | Number | Yes | Additional values (variadic). |
