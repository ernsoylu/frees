---
name: ss2ss
category: Control Systems
summary: Similarity transform of a state-space model, x = P·z.
related: [ss, balreal, ss2tf]
examples: []
tags: [control, similarity transform, state space, coordinate change]
---

# ss2ss

**Current limitation:** automatic output-shape inference rejects the invocation
shown below. Use the explicit matrix products in the verified example. The
formulation describes the intended similarity transform.

Applies a **similarity (coordinate) transform** `x = P·z` to a state-space model,
returning the equivalent realization `(An, Bn, Cn, Dn)`. The input-output behavior
is unchanged; only the state coordinates differ — used to reach canonical or
balanced forms.

## Syntax

```
[An, Bn, Cn, Dn] = ss2ss(A, B, C, D, P)
```

## Mathematical Formulation

With $x = Pz$:

$$ A_n = P^{-1}AP, \quad B_n = P^{-1}B, \quad C_n = CP, \quad D_n = D $$

The transfer function $C(sI-A)^{-1}B + D$ is invariant under the transform.

> **Method:** apply the change of basis `P` to the quadruple.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Rescale a two-state model

**Current runtime limitation:** this invocation is not supported by the current engine. The diagnostic below is verified, not a successful calculation. Use the working alternative that follows.

```frees error="Matrix must have exactly 2 dimensions: bn"
A = [-1, 0; 0, -2]
B = [1, 0; 0, 1]
C = [1, 0; 0, 1]
D = [0, 0; 0, 0]
P = [2, 0; 0, 1]
[An, Bn, Cn, Dn] = ss2ss(A, B, C, D, P)
```

Expected diagnostic:

```text
Syntax error: Matrix must have exactly 2 dimensions: bn
```

Working alternative — paste this complete document into the editor and solve:

```frees
A = [-1, 0; 0, -2]
B = [1, 0; 0, 1]
C = [1, 0; 0, 1]
D = [0, 0; 0, 0]
P = [2, 0; 0, 1]
An = inverse(P)*A*P
Bn = inverse(P)*B
Cn = C*P
Dn = copy(D)

{ CHECK An[1,1] -1 0.000001 }
{ CHECK An[1,2] 0 1e-8 }
{ CHECK An[2,1] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
An[1,1] = -1
An[1,2] = 0
An[2,1] = 0
```

<!-- verified-reference-example:end -->

```
{ [An,Bn,Cn,Dn] = ss2ss(A,B,C,D,P) }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A`, `B`, `C`, `D` | Matrix | Yes | Original realization. |
| `P` | Matrix | Yes | Invertible transform (`x = P·z`). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `An`, `Bn`, `Cn`, `Dn` | Matrix | Transformed realization. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `SINGULAR_TRANSFORM` | `P` not invertible | Use a nonsingular transform matrix. |
