---
name: EulerRotate
category: Matrix
summary: Unavailable Euler rotation intrinsic; construct a rotation matrix explicitly.
related: [Eigen, Transpose]
examples: []
tags: [matrix, rotation, euler angles, kinematics, attitude]
---

# EulerRotate

`EulerRotate` is registered but explicitly unported in the current engine.
Construct a rotation matrix explicitly for a specified axis convention, as in
the working alternative below.

## Syntax

```
[R] = EulerRotate(phi, theta, psi)
R = EulerRotate(phi, theta, psi)
```

## Description

Elementary rotations can be multiplied to form an orthonormal rotation
($R^\top = R^{-1}$, $\det R = 1$). No axis convention is implemented by this
unavailable intrinsic; the following formula is a mathematical illustration only.

## Mathematical Formulation

A possible rotation convention is the product of three elementary rotations:

$$ R(\phi, \theta, \psi) = R_z(\psi)\,R_x(\theta)\,R_z(\phi), \qquad R^\top R = I,\ \det R = 1 $$

(the standard `z–x–z` convention).

> **Method:** multiply the three elementary axis rotations.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Build a zero-angle rotation matrix

**Current runtime limitation:** this invocation is not supported by the current engine. The diagnostic below is verified, not a successful calculation. Use the working alternative that follows.

```frees error="not yet supported"
[R] = EulerRotate(0, 0, 0)
```

Expected diagnostic:

```text
CALL `eulerrotate` is not yet supported by the wasm engine
```

Working alternative — paste this complete document into the editor and solve:

```frees
theta = 0.5235987755982988
R = [cos(theta), -sin(theta), 0; sin(theta), cos(theta), 0; 0, 0, 1]

{ CHECK R[1,1] 0.8660254038 8.660254037844387e-7 }
{ CHECK R[1,2] -0.5 4.999999999999999e-7 }
{ CHECK R[1,3] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
R[1,1] = 0.8660254038
R[1,2] = -0.5
R[1,3] = 0
```

<!-- verified-reference-example:end -->

```
{ R = EulerRotate(phi, theta, psi) }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `phi` | Number | Yes | First rotation angle [rad]. |
| `theta` | Number | Yes | Second rotation angle [rad]. |
| `psi` | Number | Yes | Third rotation angle [rad]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `R` | Matrix | 3×3 orthonormal rotation matrix. |
