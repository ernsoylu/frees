---
name: differentiate
category: Calculus
summary: Numerical dy/dx at xv from a TABLE
related: []
examples: []
tags: [differentiate, calculus]
---

# differentiate

Numerical dy/dx at xv from a TABLE


## Syntax

```
Differentiate('t', y, x, xv)
```

## Description

Numerical dy/dx at xv from a TABLE

## Mathematical Formulation

$$ \left.\frac{dy}{dx}\right|_{x_v} \approx \frac{y_{i+1}-y_{i-1}}{x_{i+1}-x_{i-1}} \quad\text{(central difference on the table)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TABLE g(x)
  10   100
  20   400
  30   900
END
d = Differentiate('g', 2, 1, 25)

{ CHECK d 50 0.000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
d = 50
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'t'` | Number | Yes | Name of a TABLE block (string). |
| `y` | Number | Yes | Value / second coordinate. |
| `x` | Number | Yes | Vapor quality (0–1). |
| `xv` | Number | Yes | Point at which to evaluate. |
