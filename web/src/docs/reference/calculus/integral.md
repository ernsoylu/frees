---
name: integral
category: Calculus
summary: Definite integral; with self-reference, a scalar first-order ODE.
related: [gaussintegral, differentiate, IntegralValue]
examples: [tank-draining, newton-cooling]
tags: [calculus, integral, quadrature, ode, definite integral]
---

# integral

Computes a **definite integral** of an expression with respect to a variable over a
range. When the integrand references the result variable itself, frees detects the
self-reference and integrates the corresponding **first-order initial-value ODE**
starting from 0 at the lower limit.

## Syntax

```
A = Integral(expr, var, lower, upper)
A = Integral(expr, var, lower, upper, step)
```

## Description

For a plain definite integral, `expr` depends only on `var`. For the ODE pattern,
`expr` contains the result variable — frees then integrates the *change*, so you
rebuild the quantity of interest from the integrated increment. For coupled,
stiff, or multi-state systems use a `DYNAMIC` block instead.

`var` is the integral's dummy variable, not a result: it does not appear among
the solved variables. Other variables that depend on it are reported at
`var = upper`.

The optional `step` is an accuracy hint, not a different method: no step is
taken wider than it, so a feature narrower than the range is not stepped
over. The same integral gives the same value with or without it, and whether
the limits are numbers or unknowns.

## Mathematical Formulation

$$ A = \int_{\text{lower}}^{\text{upper}} \text{expr}(\text{var})\,d(\text{var}) $$

In the self-referential (ODE) form, with `y` the result and `y(lower) = 0`,

$$ \frac{dy}{d\,\text{var}} = \text{expr}(y, \text{var}), \qquad y = \int_{\text{lower}}^{\text{var}} \text{expr}\,d(\text{var}) $$

> **Method:** with numeric limits, adaptive Dormand–Prince 5(4) stepping of
> $dA/d\,\text{var} = \text{expr}$, which re-solves the rest of the system at
> each point and also serves the self-referential form; with an unknown limit,
> adaptive Simpson quadrature inside the equation. Both are held to about
> $10^{-10}$ relative error.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
F = Integral(t, t, 0, 1)
G = Integral(t^2, t, 0, 2, 0.5)     { step 0.5 is a hint: still 8/3 }

{ CHECK F 0.5 1e-12 }
{ CHECK G 2.6666666666666667 1e-12 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
F = 0.5
G = 2.66667
```

<!-- verified-reference-example:end -->

### Example 1 — Draining-tank ODE via the self-reference pattern

[Run: tank-draining]

**Expected:** integrating the volume drop and rebuilding `V = V0 − drop` gives the
tank volume after the elapsed time.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `expr` | Expression | Yes | Integrand (may self-reference the result for the ODE form). |
| `var` | Variable | Yes | Integration variable. |
| `lower` | Number | Yes | Lower limit. |
| `upper` | Number | Yes | Upper limit (may be an unknown). |
| `step` | Number | No | Largest step: an accuracy hint for narrow features. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `A` | Number | The definite integral (or integrated change for the ODE form). |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `NON_CONVERGENT` | integrand singular/stiff | Use `GaussIntegral`, a finer setup, or a `DYNAMIC` block. |
