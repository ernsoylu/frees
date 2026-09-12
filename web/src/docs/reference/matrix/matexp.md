---
name: matexp
category: Matrix
summary: Matrix exponential
related: []
examples: []
tags: [matexp, matrix]
---

# matexp

Matrix exponential


## Syntax

```
matexp(A)
```

## Description

Matrix exponential

## Mathematical Formulation

$$ e^{A} = \sum_{k=0}^{\infty} \frac{A^{k}}{k!} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Analyze a two-channel matrix

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = [4, 0; 0, 9]
[result] = matexp(A)

{ CHECK result[1,1] 54.59815003 0.0000545981500331439 }
{ CHECK result[1,2] 0 1e-8 }
{ CHECK result[2,1] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result[1,1] = 54.59815003
result[1,2] = 0
result[2,1] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |
