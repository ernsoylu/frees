---
name: EulerRotate
category: Matrix
summary: 3×3 rotation matrix from ZYX (yaw–pitch–roll) Euler angles in radians.
related: [Eigen, Transpose]
examples: []
tags: [matrix, rotation, euler angles, kinematics, attitude]
---

# EulerRotate

Builds the **rotation matrix** for ZYX Euler angles: roll `phi` about x, pitch
`theta` about y and yaw `psi` about z, in radians. `R` maps body-frame vectors
into the reference frame — the aerospace yaw–pitch–roll convention, and
MATLAB's `eul2rotm([psi, theta, phi], 'ZYX')`.

## Syntax

```
[R] = EulerRotate(phi, theta, psi)
```

## Description

The nine entries are closed-form expressions in `sin` and `cos` of the angles,
so the angles may themselves be unknowns: the solver differentiates them
analytically. `R` is orthonormal ($R^\top = R^{-1}$, $\det R = 1$).

## Mathematical Formulation

$$ R(\phi, \theta, \psi) = R_z(\psi)\,R_y(\theta)\,R_x(\phi) $$

$$ R = \begin{bmatrix}
c_\psi c_\theta & c_\psi s_\theta s_\phi - s_\psi c_\phi & c_\psi s_\theta c_\phi + s_\psi s_\phi \\
s_\psi c_\theta & s_\psi s_\theta s_\phi + c_\psi c_\phi & s_\psi s_\theta c_\phi - c_\psi s_\phi \\
-s_\theta & c_\theta s_\phi & c_\theta c_\phi
\end{bmatrix} $$

where $c_x = \cos x$ and $s_x = \sin x$.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Attitude matrix of a banked, pitched, yawed body

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
phi = 0.1     { roll [rad] }
theta = 0.2   { pitch [rad] }
psi = 0.3     { yaw [rad] }
[R] = EulerRotate(phi, theta, psi)

{ CHECK R[1,1] 0.9362933636 0.0000009362933636 }
{ CHECK R[1,2] -0.2750958473 0.0000002750958473 }
{ CHECK R[2,3] -0.0369570135 0.0000000369570135 }
{ CHECK R[3,1] -0.1986693308 0.0000001986693308 }
{ CHECK R[3,3] 0.9751703272 0.0000009751703272 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
R[1,1] = 0.9362933636
R[1,2] = -0.2750958473
R[2,3] = -0.0369570135
R[3,1] = -0.1986693308
R[3,3] = 0.9751703272
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `phi` | Number | Yes | Roll angle about x [rad]. |
| `theta` | Number | Yes | Pitch angle about y [rad]. |
| `psi` | Number | Yes | Yaw angle about z [rad]. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `R` | Matrix | 3×3 orthonormal rotation matrix, `Rz(psi)·Ry(theta)·Rx(phi)`. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `EulerRotate expects 3 angles (phi, theta, psi) and 1 output matrix, e.g. [R] = EulerRotate(phi, theta, psi)` | Wrong number of angles or outputs | Pass exactly three angles and name one output. |
