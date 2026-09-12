---
name: std
category: Stats
summary: Standard deviation of vector x
related: []
examples: []
tags: [std, stats]
---

# std

Standard deviation of vector x


## Syntax

```
std(x)
```

## Description

Standard deviation of vector x

## Mathematical Formulation

$$ s = \sqrt{\frac{1}{n-1}\sum_{i=1}^{n}(x_i - \bar x)^2} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = std(19, 20, 21)

{ CHECK result 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
