---
name: erf
category: Special Functions
summary: Error function erf(x).
related: [erfc, erfinv, normalcdf]
examples: []
tags: [special function, error function, erf, gaussian, probability]
references:
  - "NIST Digital Library of Mathematical Functions, §7.2"
---

# erf

Returns the **error function** `erf(x)` — the scaled integral of the Gaussian. It
underlies the normal distribution, diffusion, and transient-conduction solutions.

## Syntax

```
y = erf(x)
```

## Description

An odd function (`erf(−x) = −erf(x)`) ranging from −1 to 1, with `erf(0) = 0` and
`erf(∞) = 1`.

## Mathematical Formulation

$$ \operatorname{erf}(x) = \frac{2}{\sqrt{\pi}}\int_0^x e^{-t^2}\,dt $$

related to the normal CDF by `Φ(x) = ½[1 + erf(x/√2)]`.

> **Method:** rational/continued-fraction approximation to machine precision.

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
{ erf(1) ~ 0.8427 }
y = erf(1)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Real argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | erf(x) ∈ (−1, 1). |

## References

1. NIST *Digital Library of Mathematical Functions*, §7.2.
