---
name: Dot
category: Math
summary: Vector dot product
related: []
examples: []
tags: [dot, math]
references: []
---

# Dot

Vector dot product


## Syntax

```
Dot(a, b)
```

## Description

Vector dot product

## Mathematical Formulation

$$ a \cdot b = \sum_i a_i b_i $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Calculate work from force and displacement

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
force = [2, 3, 4]
distance = [1, 0, 2]
result = dot(force, distance)

{ CHECK result 10 0.000009999999999999999 }
{ CHECK distance[1] 1 0.000001 }
{ CHECK distance[2] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 10
distance[1] = 1
distance[2] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | Number | Yes | First operand. |
| `b` | Number | Yes | Second operand. |
