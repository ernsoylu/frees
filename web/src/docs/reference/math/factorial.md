---
name: factorial
category: Math
summary: Factorial n!
related: []
examples: []
tags: [factorial, math]
---

# factorial

Factorial n!


## Syntax

```
factorial(n)
```

## Description

Factorial n!

## Mathematical Formulation

$$ n! = \prod_{k=1}^{n} k = n\,(n-1)! $$

$$ \quad n! = \Gamma(n+1) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function factorial = factorial(n)
  IF n <= 1 THEN
    Factorial := 1
  ELSE
    Factorial := n * Factorial(n-1)
  END
END

y = Factorial(5)

{ CHECK y 120 0.00011999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
y = 120
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `n` | Number | Yes | Order / number of terms. |
