---
name: besselj
category: Special Functions
summary: Bessel function of the first kind, order n — J_n(x).
related: [bessely, besseli, besselk, besselj0, besselj1]
examples: []
tags: [special function, bessel, first kind, cylinder, wave]
references:
  - "NIST Digital Library of Mathematical Functions, §10.2"
---

# besselj

Returns the **Bessel function of the first kind** `J_n(x)` of integer order `n`. It
is the finite-at-origin solution of Bessel's equation — the radial mode shape in
cylindrical wave, vibration, and diffusion problems.

## Syntax

```
y = besselj(n, x)
```

## Description

`J_n` oscillates with a slowly decaying amplitude. For the common fixed orders use
`besselj0` / `besselj1`.

## Mathematical Formulation

`J_n(x)` solves Bessel's equation and has the series

$$ x^2 y'' + x y' + (x^2 - n^2)y = 0, \qquad J_n(x) = \sum_{k=0}^{\infty} \frac{(-1)^k}{k!\,(n+k)!}\left(\frac{x}{2}\right)^{2k+n} $$

with the recurrence `J_{n-1}(x) + J_{n+1}(x) = (2n/x)J_n(x)`.

> **Method:** series for small `x`, asymptotic/recurrence for large `x`.

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
{ besselj(0, 0) = 1 }
y = besselj(0, 0)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `n` | Number | Yes | Integer order. |
| `x` | Number | Yes | Argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | J_n(x). |

## References

1. NIST *Digital Library of Mathematical Functions*, §10.2.
