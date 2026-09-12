---
name: interpolate1
category: Interpolation
summary: Cubic-spline interpolation of table t at x
related: []
examples: []
tags: [interpolate1, interpolation]
---

# interpolate1

Cubic-spline interpolation of table t at x


## Syntax

```
Interpolate1('t', x)
```

## Description

Cubic-spline interpolation of table t at x

## Mathematical Formulation

$$ \text{piecewise cubic spline through the table knots (} C^2 \text{ continuous)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TABLE lin(x)
  0   0
  1   2
  2   4
  3   6
END
y = Interpolate1('lin', 1.5)

{ CHECK y 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
y = 3
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'t'` | Number | Yes | Name of a TABLE block (string). |
| `x` | Number | Yes | Vapor quality (0–1). |
