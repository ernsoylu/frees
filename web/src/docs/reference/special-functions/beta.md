---
name: beta
category: Special Functions
summary: Beta function B(a, b) = Γ(a)Γ(b)/Γ(a+b).
related: [gamma, loggamma]
examples: []
tags: [special function, beta, gamma, integral]
references:
  - "NIST Digital Library of Mathematical Functions, §5.12"
---

# beta

Returns the **Beta function** `B(a, b)` — a normalizing constant built from
`gamma` functions, central to the Beta distribution and to many definite
integrals.

## Syntax

```
y = beta(a, b)
```

## Description

Symmetric in its arguments (`B(a, b) = B(b, a)`); defined for positive `a`, `b`.

## Mathematical Formulation

$$ B(a, b) = \int_0^1 t^{a-1}(1-t)^{b-1}\,dt = \frac{\Gamma(a)\,\Gamma(b)}{\Gamma(a+b)} $$

> **Method:** evaluated via `exp(loggamma(a) + loggamma(b) − loggamma(a+b))` for
> numerical safety.

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
{ B(2,3) = 1!*2!/4! = 1/12 ~ 0.0833 }
y = beta(2, 3)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | Number | Yes | First positive parameter. |
| `b` | Number | Yes | Second positive parameter. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | B(a, b). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `DOMAIN_ERROR` | `a ≤ 0` or `b ≤ 0` | Use positive parameters. |

## References

1. NIST *Digital Library of Mathematical Functions*, §5.12.
