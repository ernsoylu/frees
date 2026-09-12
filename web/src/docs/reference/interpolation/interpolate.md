---
name: interpolate
category: Interpolation
summary: Linear interpolation of table t at x (same as t(x))
related: []
examples: []
tags: [interpolate, interpolation]
---

# interpolate

Linear interpolation of table t at x (same as t(x))


## Syntax

```
Interpolate('t', x)
```

## Description

Linear interpolation of table t at x (same as t(x))

## Mathematical Formulation

$$ y = y_i + (y_{i+1}-y_i)\frac{x - x_i}{x_{i+1} - x_i} \quad\text{(linear)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TABLE flow(re)
  0     0
  100   100
END
y = Interpolate('flow', 50)

{ CHECK y 50 0.000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
y = 50
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'t'` | Number | Yes | Name of a TABLE block (string). |
| `x` | Number | Yes | Vapor quality (0–1). |
