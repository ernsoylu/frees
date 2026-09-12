---
name: mean
category: Stats
summary: Mean of vector x
related: []
examples: []
tags: [mean, stats]
---

# mean

Mean of vector x


## Syntax

```
mean(x)
```

## Description

Mean of vector x

## Mathematical Formulation

$$ \bar x = \frac{1}{n}\sum_{i=1}^{n} x_i $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
v = [2, 4, 4, 4, 5, 5, 7, 9]
m = Mean(v[1:8])
md = Median(v[1:8])
vr = Variance(v[1:8])
sd = StdDev(v[1:8])

{ CHECK m 5 0.0000049999999999999996 }
{ CHECK md 4.5 0.0000045 }
{ CHECK sd 2.138089935 0.000002138089935299395 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
m = 5
md = 4.5
sd = 2.138089935
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
