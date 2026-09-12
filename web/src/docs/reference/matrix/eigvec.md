---
name: eigvec
category: Matrix
summary: Unavailable eigenvector alias; use Eigen.
related: [Eigen, Eigenvalues]
examples: []
tags: [eigvec, matrix]
---

# eigvec

Registered eigenvector alias that is not implemented in the current runtime. Use `Eigen` instead.


## Syntax

```
eigvec(A)
```

## Description

The eigenvector problem below describes the intended operation, not an available implementation of this alias.

## Mathematical Formulation

$$ A v_i = \lambda_i v_i \quad\text{(columns are the eigenvectors)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Analyze a two-channel matrix

**Current runtime limitation:** this invocation is not supported by the current engine. The diagnostic below is verified, not a successful calculation. Use the working alternative that follows.

```frees error="Unknown PROCEDURE or MODULE: 'eigvec'"
A = [4, 0; 0, 9]
[result] = eigvec(A)
```

Expected diagnostic:

```text
Syntax error: Unknown PROCEDURE or MODULE: 'eigvec'
```

Working alternative — paste this complete document into the editor and solve:

```frees
A = [4, 0; 0, 9]
[values, vectors] = Eigen(A)

{ CHECK values[1] 4 0.000004 }
{ CHECK values[2] 9 0.000009 }
{ CHECK vectors[1,1] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
values[1] = 4
values[2] = 9
vectors[1,1] = 1
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |
