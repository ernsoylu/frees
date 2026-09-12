---
name: place
category: Control Systems
summary: State-feedback pole placement to a set of desired closed-loop poles.
related: [acker, lqr, ctrb]
examples: []
tags: [control, pole placement, state feedback, ackermann, design]
---

# place

Returns the **state-feedback gain** `K` that moves the closed-loop poles of
`(A, B)` to the desired locations given by their real/imaginary parts (`pr`, `pi`).
The control law `u = −Kx` makes `eig(A − BK)` equal the requested poles.

## Syntax

```
[K] = place(A, B, pr, pi)
K = place(A, B, pr, pi)
```

## Description

The pair `(A, B)` must be controllable for arbitrary pole placement. Provide the
desired poles as conjugate pairs in `pr ± j·pi`.

## Mathematical Formulation

Find `K` such that

$$ \det\!\big(sI - (A - BK)\big) = \prod_i (s - p_i) $$

with the desired characteristic polynomial set by `{p_i}`.

> **Method:** solve for `K` from the desired characteristic polynomial (Ackermann /
> robust placement); see `acker` for the single-input Ackermann form.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Pole placement two ways on the same plant. }
A[1,1] = 0; A[1,2] = 1
A[2,1] = -2; A[2,2] = -3
B[1] = 0; B[2] = 1
pd_r = [-4, -5]
pd_i = [0, 0]
[Kp] = place(A, B, pd_r, pd_i)
[Ka] = acker(A, B, pd_r, pd_i)
Acl[1,1] = A[1,1]-B[1]*Kp[1]; Acl[1,2] = A[1,2]-B[1]*Kp[2]
Acl[2,1] = A[2,1]-B[2]*Kp[1]; Acl[2,2] = A[2,2]-B[2]*Kp[2]
[cr, ci] = pole(Acl)

{ CHECK Acl[1,1] 0 1e-8 }
{ CHECK Acl[1,2] 1 0.000001 }
{ CHECK Acl[2,1] -20 0.000019999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Acl[1,1] = 0
Acl[1,2] = 1
Acl[2,1] = -20
```

<!-- verified-reference-example:end -->

```
{ place the regulator poles of a controllable (A,B) at -2 +/- j }
{ K = place(A, B, [-2,-2], [1,-1]) }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `A` | Matrix | Yes | State matrix. |
| `B` | Matrix | Yes | Input matrix. |
| `pr` | Vector | Yes | Real parts of the desired poles. |
| `pi` | Vector | Yes | Imaginary parts of the desired poles. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `K` | Matrix | State-feedback gain (`u = −Kx`). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NOT_CONTROLLABLE` | `(A, B)` not controllable | Arbitrary placement needs a controllable pair (check `ctrb`). |
