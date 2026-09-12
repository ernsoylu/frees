---
name: real
category: Complex
summary: Real part of a complex value
related: []
examples: []
tags: [real, complex]
references: []
---

# real

Real part of a complex value


## Syntax

```
real(z)
```

## Description

Real part of a complex value

## Mathematical Formulation

$$ \Re(z) = \Re(a + jb) = a $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
x = 5
a = real(x)
b = imag(x)

{ CHECK a 5 0.0000049999999999999996 }
{ CHECK b 0 1e-8 }
{ CHECK x 5 0.0000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a = 5
b = 0
x = 5
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `z` | Number | Yes | Argument (complex or real). |
