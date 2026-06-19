[Topic: symbolic-cas]
# Symbolic Identities & Partial Fractions (CAS)

frees can solve **symbolic identities** — equations that must hold for *all* values of an independent variable — using an embedded computer-algebra system (CAS). The classic use is decomposing a Laplace transfer function into partial fractions and reading off the residues, which then appear in the Solution window like any other variable.

## Declaring a symbolic variable

Use `SYMBOLIC` to mark one or more independent variables (for control work this is usually the Laplace variable `s`):

```
SYMBOLIC s
```

A `SYMBOLIC` variable is **not** solved for. Instead, any equation that contains it is treated as an identity: frees brings both sides over a common denominator, requires every power of the variable to match, and solves the resulting system for the remaining unknown coefficients.

## Partial-fraction decomposition

Write the decomposition you want as an ordinary equation, naming the residues yourself:

```
SYMBOLIC s
(s + 3)/(s^2 + 3*s + 2) = A/(s+1) + B/(s+2)
```

frees solves this for **A = 2** and **B = -1**. Because you name the residues against the poles you chose, there is never any ambiguity about which residue is which. `A` and `B` are now ordinary variables — use them in downstream equations (for example, the inverse Laplace transform `y(t) = A*exp(-t) + B*exp(-2*t)`).

## Transfer functions: tf(num, den)

`tf(num, den)` builds a transfer function `num(s)/den(s)` from coefficient arrays in **descending powers** (MATLAB-style): `[1, 3]` is `s + 3` and `[1, 3, 2]` is `s^2 + 3*s + 2`. Use it on the left of an identity instead of writing the fraction out:

```
SYMBOLIC s
tf([1, 3], [1, 3, 2]) = A/(s+1) + B/(s+2)
```

This is equivalent to the explicit form above and also yields `A = 2`, `B = -1`.

## Notes and limits

- An identity may involve **only one** `SYMBOLIC` variable — it is solved with respect to that single independent variable.
- The coefficient arrays passed to `tf(...)` must be **constant** (numeric array literals such as `[1, 3, 2]`).
- An identity that cannot hold for all values of the symbolic variable (an inconsistent or under-determined decomposition) is reported as an error.
- The residues are solved numerically and shown with their units (dimensionless here) in the Solution window.

## LTI Model Representations

frees represents LTI systems using standard array/matrix variables rather than introducing custom data types. This integrates seamlessly with the existing matrix/array algebra and unit checker.

- **Transfer Function (TF)**: Represented as a pair of coefficient arrays in descending powers (MATLAB-style). E.g. `num = [0, 0, 1]` and `den = [1, 3, 2]` represents the system:
  $$G(s) = \frac{1}{s^2 + 3s + 2}$$
- **State Space (SS)**: Represented as matrices `A` ($n \times n$), `B` ($n \times 1$), `C` ($1 \times n$), and scalar `D` ($1 \times 1$):
  $$\dot{x} = A x + B u$$
  $$y = C x + D u$$
- **Zero-Pole-Gain (ZPK)**: Represented as real and imaginary components of zeros (`zr`, `zi`) and poles (`pr`, `pi`), plus a scalar gain `k`:
  $$H(s) = k \frac{\prod (s - z_i)}{\prod (s - p_i)}$$

## Model Conversions

Use `CALL` dispatches to convert between representations. The solver automatically registers output shapes so variables can be used as bare names downstream.

### 1. State Space to Transfer Function: ss2tf
```
CALL ss2tf(A, B, C, D : num[1:3], den[1:3])
```

### 2. Transfer Function to State Space: tf2ss
```
CALL tf2ss(num, den : A[1:2,1:2], B[1:2], C[1:2], D)
```

### 3. Zero-Pole-Gain to Transfer Function: zp2tf
```
CALL zp2tf(zr, zi, pr, pi, k : num[1:3], den[1:3])
```

### 4. Transfer Function to Zero-Pole-Gain: tf2zp
```
CALL tf2zp(num, den : zr[1:1], zi[1:1], pr[1:2], pi[1:2], k)
```
