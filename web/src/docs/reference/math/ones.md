---
name: ones
category: Math
summary: m×n ones matrix
related: []
examples: []
tags: [ones, math]
references: []
---

# ones

m×n ones matrix


## Syntax

```
ones(m, n)
```

## Description

m×n ones matrix

## Mathematical Formulation

$$ J_{ij} = 1 \quad (m\times n) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
C = ones(2,2) .* 3

{ CHECK C[1,1] 3 0.000003 }
{ CHECK C[1,2] 3 0.000003 }
{ CHECK C[2,1] 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
C[1,1] = 3
C[1,2] = 3
C[2,1] = 3
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `m` | Number | Yes | Shape / form parameter. |
| `n` | Number | Yes | Order / number of terms. |
