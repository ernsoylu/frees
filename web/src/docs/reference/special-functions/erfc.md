---
name: erfc
category: Special Functions
summary: Complementary error function erfc(x) = 1 − erf(x).
related: [erf, erfinv]
examples: []
tags: [special function, complementary error function, erfc, gaussian, tail]
references:
  - "NIST Digital Library of Mathematical Functions, §7.2"
---

# erfc

Returns the **complementary error function** `erfc(x) = 1 − erf(x)`. It is the
Gaussian tail probability and is computed directly (not as `1 − erf`) to preserve
precision for large `x`.

## Syntax

```
y = erfc(x)
```

## Description

Ranges from 2 (at `−∞`) to 0 (at `+∞`), with `erfc(0) = 1`. For large positive `x`
it is exponentially small, so the dedicated routine avoids catastrophic
cancellation.

## Mathematical Formulation

$$ \operatorname{erfc}(x) = 1 - \operatorname{erf}(x) = \frac{2}{\sqrt{\pi}}\int_x^\infty e^{-t^2}\,dt $$

> **Method:** direct rational/continued-fraction approximation of the tail.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
a = erf(0)
b = erfc(0)
c = gamma(4)
d = loggamma(4)
e = beta(2, 3)
f = besselj(2.5, 0)
g = erfinv(0.5)

{ CHECK a 0 1e-8 }
{ CHECK b 1 0.000001 }
{ CHECK c 6 0.000006 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a = 0
b = 1
c = 6
```

<!-- verified-reference-example:end -->

```
{ erfc(1) ~ 0.1573 }
y = erfc(1)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Real argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | erfc(x) ∈ (0, 2). |

## References

1. NIST *Digital Library of Mathematical Functions*, §7.2.
