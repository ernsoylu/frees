---
name: ss2ss
category: Control Systems
summary: Similarity transform of a state-space model, x = P·z.
related: [ss, balreal, ss2tf]
examples: []
tags: [control, similarity transform, state space, coordinate change]
---

# ss2ss

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

### Verified example — Change coordinates of a two-state plant

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation. A single-input, single-output model can give `B` as a column and `C` as a row.

```frees
A = [0, 1; -2, -3]
B = [0; 1]
C = [1, 0]
D = [0]
P = [1, 1; 0, 1]
[An, Bn, Cn, Dn] = ss2ss(A, B, C, D, P)

{ CHECK An[1,1] 2 0.000002 }
{ CHECK An[1,2] 6 0.000006 }
{ CHECK An[2,1] -2 0.000002 }
{ CHECK An[2,2] -5 0.000005 }
{ CHECK Bn[1,1] -1 0.000001 }
{ CHECK Cn[1,2] 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
An = [2, 6; -2, -5]
Bn = [-1; 1]
Cn = [1, 1]
```

<!-- verified-reference-example:end -->

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
