---
name: eig
category: Matrix
summary: Unavailable eigenvalue alias; use Eigenvalues.
related: [Eigenvalues, Eigen]
examples: []
tags: [eig, matrix]
---

# eig

Registered eigenvalue alias that is not implemented in the current runtime. Use `Eigenvalues` instead.


## Syntax

```
eig(A)
```

## Description

The eigenvalue problem below describes the intended operation, not an available implementation of this alias.

## Mathematical Formulation

$$ A v = \lambda v, \qquad \det(A - \lambda I) = 0 $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Analyze a two-channel matrix

**Current runtime limitation:** this invocation is not supported by the current engine. The diagnostic below is verified, not a successful calculation. Use the working alternative that follows.

```frees error="Unknown PROCEDURE or MODULE: 'eig'"
A = [4, 0; 0, 9]
[result] = eig(A)
```

Expected diagnostic:

```text
Syntax error: Unknown PROCEDURE or MODULE: 'eig'
```

Working alternative — paste this complete document into the editor and solve:

```frees
A = [4, 0; 0, 9]
[values] = Eigenvalues(A)

{ CHECK values[1] 4 0.000004 }
{ CHECK values[2] 9 0.000009 }
{ CHECK A[1,1] 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
values[1] = 4
values[2] = 9
A[1,1] = 4
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Number | Yes | Square input matrix. |
