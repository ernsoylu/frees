---
name: var
category: Stats
summary: Variance of vector x
related: []
examples: []
tags: [var, stats]
---

# var

Variance of vector x


## Syntax

```
var(x)
```

## Description

Variance of vector x

## Mathematical Formulation

$$ s^2 = \frac{1}{n-1}\sum_{i=1}^{n}(x_i - \bar x)^2 $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = var(19, 20, 21)

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
