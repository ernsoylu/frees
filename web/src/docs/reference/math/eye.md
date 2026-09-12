---
name: eye
category: Math
summary: n×n identity
related: []
examples: []
tags: [eye, math]
references: []
---

# eye

n×n identity


## Syntax

```
eye(n) / identity(n)
```

## Description

n×n identity

## Mathematical Formulation

$$ I_{ij} = \delta_{ij} \quad (n\times n) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
I = eye(3)
Z = zeros(2,2)
u = ones(3,1)
D = diag([2; 5; 7])
g = linspace(0, 10, 5)

{ CHECK D[1,1] 2 0.000002 }
{ CHECK D[1,2] 0 1e-8 }
{ CHECK D[1,3] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
D[1,1] = 2
D[1,2] = 0
D[1,3] = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `n` | Number | Yes | Order / number of terms. |
