---
name: SYMBOLIC
category: Language Keywords
summary: Marks an independent variable so equations containing it are solved as identities.
related: [tf, residue]
examples: []
tags: [keyword, cas, identity, laplace, partial fractions]
references: []
---

# SYMBOLIC

Marks a variable — usually the Laplace variable `s` — as symbolic. Any equation containing it must hold for all values of that variable; frees matches coefficients and solves for the remaining unknowns.

## Syntax

```
SYMBOLIC s
```

## Description

Both sides are brought over a common denominator and every power of the symbolic variable must match. The unknown coefficients become ordinary solved variables. An identity may contain only one symbolic variable, and `SYMBOLIC` is not allowed inside a function body.

## Mathematical Formulation

$$ \frac{s+3}{s^2+3s+2} = \frac{A}{s+1} + \frac{B}{s+2} \;\Longrightarrow\; s + 3 = A(s+2) + B(s+1) \;\; \forall s $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Partial fractions

```frees
SYMBOLIC s
(s + 3)/(s^2 + 3*s + 2) = A/(s+1) + B/(s+2)

{ CHECK A 2 0.000001 }
{ CHECK B -1 0.000001 }
```

Expected output:

```text
A = 2
B = -1
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `An identity may involve only one SYMBOLIC variable, but found: [s, z]` | Two symbolic variables in one identity. | Use one symbolic variable per identity. |
| `could not solve the identity for: a (it may be inconsistent or underdetermined)` | The template cannot match the left side for all `s`. | Add the missing terms to the decomposition. |
| `SYMBOLIC declarations are not allowed inside a PROCEDURE or FUNCTION.` | Declared inside a function body. | Declare it at the top level. |
