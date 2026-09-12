---
name: norm
category: Matrix
summary: Matrix norm
related: []
examples: []
tags: [norm, matrix]
---

# norm

Matrix norm


## Syntax

```
norm(A)
```

## Description

Matrix norm

## Mathematical Formulation

$$ \lVert v \rVert_2 = \sqrt{\textstyle\sum_i v_i^2} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find the magnitude of a force vector

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
x = [3, 4]
result = norm(x)

{ CHECK result 5 0.0000049999999999999996 }
{ CHECK x[1] 3 0.000003 }
{ CHECK x[2] 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 5
x[1] = 3
x[2] = 4
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |
