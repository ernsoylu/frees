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
