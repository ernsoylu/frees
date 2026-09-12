---
name: arctanh
category: Math
summary: Inverse hyperbolic tangent (|x|<1)
related: []
examples: []
tags: [arctanh, math]
references: []
---

# arctanh

Inverse hyperbolic tangent (|x|<1)


## Syntax

```
arctanh(x)
```

## Description

Inverse hyperbolic tangent (|x|<1)

## Mathematical Formulation

$$ \operatorname{arctanh}(x) = \tfrac12\ln\!\frac{1+x}{1-x}, \quad |x| < 1 $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
y = sinh(x)
z = cosh(x)
w = tanh(x)
x_asinh = arcsinh(y)
x_acosh = arccosh(z)
x_atanh = arctanh(w)
x = 1.25

{ CHECK w 0.84828364 8.482836399575129e-7 }
{ CHECK x_acosh 1.25 0.0000012499999999999999 }
{ CHECK x_asinh 1.25 0.0000012499999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
w = 0.84828364
x_acosh = 1.25
x_asinh = 1.25
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
