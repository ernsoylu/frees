---
name: Cross
category: Math
summary: Cross product of 3-vectors
related: []
examples: []
tags: [cross, math]
references: []
---

# Cross

Cross product of 3-vectors


## Syntax

```
Cross(a, b)
```

## Description

Cross product of 3-vectors

## Mathematical Formulation

$$ a \times b = (a_2 b_3 - a_3 b_2,\ a_3 b_1 - a_1 b_3,\ a_1 b_2 - a_2 b_1) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Cross product of two 3-vectors. }
u = [1; 0; 0]
v = [0; 1; 0]
w = cross(u, v)

{ CHECK u[1] 1 0.000001 }
{ CHECK u[2] 0 1e-8 }
{ CHECK u[3] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
u[1] = 1
u[2] = 0
u[3] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | Number | Yes | First operand. |
| `b` | Number | Yes | Second operand. |
