---
name: sign
category: Math
summary: Sign function (-1, 0, or 1)
related: []
examples: []
tags: [sign, math]
references: []
---

# sign

Sign function (-1, 0, or 1)


## Syntax

```
sign(x)
```

## Description

Sign function (-1, 0, or 1)

## Mathematical Formulation

$$ \operatorname{sign}(x) = \begin{cases} -1 & x<0 \\ 0 & x=0 \\ 1 & x>0 \end{cases} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Intrinsics at their domain edges. }
a = arcsin(1)
b = arccos(-1)
c = ln(1)
d = exp(0)
e = tanh(0)
f = sign(-3)
g = trunc(-2.7)
h = round(2.5)

{ CHECK a 1.570796327 0.0000015707963267948965 }
{ CHECK b 3.141592654 0.000003141592653589793 }
{ CHECK c 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a = 1.570796327
b = 3.141592654
c = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
