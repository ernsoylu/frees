---
name: sinh
category: Math
summary: Hyperbolic sine
related: []
examples: []
tags: [sinh, math]
references: []
---

# sinh

Hyperbolic sine


## Syntax

```
sinh(x)
```

## Description

Hyperbolic sine

## Mathematical Formulation

$$ \sinh(x) = \frac{e^{x} - e^{-x}}{2} $$

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
