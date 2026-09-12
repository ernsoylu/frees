---
name: bitxor
category: Math
summary: Bitwise XOR
related: []
examples: []
tags: [bitxor, math]
references: []
---

# bitxor

Bitwise XOR


## Syntax

```
bitxor(a, b)
```

## Description

Bitwise XOR

## Mathematical Formulation

$$ (a \oplus b)\ \text{— bitwise XOR of the integer operands} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
a = bitand(5, 6)
b = bitor(5, 6)
c = bitxor(5, 6)
d = bitnot(0)
e = bitshiftl(2, 3)
f = bitshiftr(16, 2)

{ CHECK a 4 0.000004 }
{ CHECK b 7 0.000007 }
{ CHECK c 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a = 4
b = 7
c = 3
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | Number | Yes | First operand. |
| `b` | Number | Yes | Second operand. |
