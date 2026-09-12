---
name: random
category: Stats
summary: Uniform random number in [a, b]
related: []
examples: []
tags: [random, stats]
references: []
---

# random

Uniform random number in [a, b]


## Syntax

```
random(a, b)
```

## Description

Uniform random number in [a, b]

## Mathematical Formulation

$$ X \sim \mathcal{U}(a, b), \qquad X = a + (b-a)\,U,\ \ U\in[0,1) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Generate a reproducible measurement sample

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = random(0, 1, 42)

{ CHECK result 0.72756368 7.27563680032868e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.72756368
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | Number | Yes | First operand. |
| `b` | Number | Yes | Second operand. |
