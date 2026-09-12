---
name: lcm
category: Math
summary: Least common multiple
related: []
examples: []
tags: [lcm, math]
references: []
---

# lcm

Least common multiple


## Syntax

```
lcm(a, b)
```

## Description

Least common multiple

## Mathematical Formulation

$$ \operatorname{lcm}(a,b) = \frac{|a\,b|}{\gcd(a,b)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
a = mod(10.5, 3)
b = gcd(24, 36)
c = lcm(12, 18)

{ CHECK a 1.5 0.0000015 }
{ CHECK b 12 0.000012 }
{ CHECK c 36 0.000036 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a = 1.5
b = 12
c = 36
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | Number | Yes | First operand. |
| `b` | Number | Yes | Second operand. |
