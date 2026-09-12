# Frees language contract, version 2

Status: frozen for the U0 migration stage (11 September 2026).

This is the compatibility contract for the unified language work. It defines
meaning before parser changes begin. Existing documents keep the legacy
grammar until the migration adapter is enabled.

## Statements and operators

- `=` is a numerical equation. It contributes a relation to the model and is
  independent of source order.
- `:=` is an ordered calculation. It creates a local value version and reads
  the latest preceding version.
- `==`, `~=`, `<`, `<=`, `>`, and `>=` are comparisons. `&&`, `||`, and `~`
  are boolean operators with short-circuit behavior.
- Newlines and semicolons separate statements. `end` closes every block.
- Canonical control flow is `if`, `else`, `for`, `while`, and `break`.
  Construction-time control flow may select equations; ordered control flow
  may not change the model graph during residual evaluation.

Ranges are inclusive and use `start:stop` or `start:step:stop`. The default
step is `1`; a range whose step points away from its stop is empty. Zero,
non-finite, and fractional steps are errors. Equation-generating bounds must
be known while the graph is built. Ordered loops have a finite work budget.

## Functions and scope

The canonical declaration is `function output = name(inputs) ... end`.
Multiple outputs use `[a, b]`. Calls use `name(arguments, option=value)`;
positional arguments precede named arguments. Unknown, repeated, or duplicated
arguments are errors, and omitted arguments use only declared defaults.

Functions are lexically scoped. Formal inputs and explicitly passed values are
available in the body; caller locals are not captured. A legacy function that
reads a caller name must be migrated by adding that name as an input, and the
adapter must report the source name and declaration location.

An equation-only function lowers to the equation/module path. A calculation-
only function lowers to the ordered procedure path. Mixed bodies are accepted
only after definite assignment and value-version checks are available; until
then they produce a migration diagnostic rather than inferred behavior.

Each output is evaluated once per logical call. Discarded outputs remain part
of the internal call when required by its equations. Recursive calls require a
bounded base case and a construction/evaluation limit.

## Values and names

Identifiers remain case-insensitive and are stored canonically in lowercase.
Single-quoted strings, numeric arrays, units such as `10 [Ohm]`, named function
references (`@name`), ports, models, and analysis results are distinct values.
Nonnumeric values do not become scalar equations. Numeric arrays use one-based
indexing; canonical access is `a(i)` and ranges such as `a(1:n)`. Index zero,
fractional indices, and shape mismatches are errors. Legacy `a[i]` is accepted
only by the migration adapter.

`initial(x, value)` declares an initial condition. `guess(x, value, ...)`
provides a solver seed or bounds and never pins a variable. SI conversion and
the distinction between absolute temperatures and temperature differences are
preserved.

## Callable contract

Every callable has one registered signature containing required and optional
arguments, accepted value types, output order/types/shapes, evaluation mode,
valid contexts, work-budget cost, and determinism. Resolution happens before
Newton for fixed arity, shape, and type errors. Value-dependent domain errors
remain evaluation errors so solver backtracking can handle them.

Lazy calls receive unevaluated arguments where needed (`if`, reductions,
`guess`, `connect`, and analysis/presentation calls). `plot`, `table`,
`simulate`, `sweep`, `linearize`, and related domain calls construct or execute
explicit jobs; they are not scalar residual intrinsics.

## Migration diagnostics

Diagnostics are stable by category and include source location:

| Code | Meaning |
| --- | --- |
| `FREES-MIG-001` | legacy declaration or call syntax |
| `FREES-MIG-002` | implicit caller-scope capture |
| `FREES-MIG-003` | mixed body needs explicit `:=` versioning |
| `FREES-MIG-004` | legacy equation silently ignored in a procedure |
| `FREES-MIG-005` | legacy descending or unbounded range |
| `FREES-MIG-006` | array indexing syntax or invalid index |
| `FREES-MIG-007` | unknown, repeated, or ambiguous named argument |
| `FREES-MIG-008` | unsupported recursive or graph-changing evaluation |

The legacy adapter may preserve behavior, but it must not silently reinterpret
a construct whose equation/ordered meaning changes. Native and WASM builds
share these categories and the same callable resolution rules.

