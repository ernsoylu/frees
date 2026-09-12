---
name: inv
category: Matrix
summary: Matrix inverse
related: []
examples: []
tags: [inv, matrix]
---

# inv

Matrix inverse


## Syntax

```
inv(A)
```

## Description

Matrix inverse

## Mathematical Formulation

$$ A\,A^{-1} = A^{-1}A = I $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Transform a two-channel matrix

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [4, 0; 0, 9]
B = inv(A)

{ CHECK A[1,1] 4 0.000004 }
{ CHECK A[1,2] 0 1e-8 }
{ CHECK A[2,1] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 4
A[1,2] = 0
A[2,1] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |
