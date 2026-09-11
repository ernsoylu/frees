# Callable inventory

This inventory freezes the U0 source of truth for callable names. Arity and
dispatch metadata stay beside the implementation until U1 introduces the
shared resolver; copying those rows into a second table would drift.

| Callable family | Canonical registry | Signature fields currently available |
| --- | --- | --- |
| Scalar, lazy, statistics, special functions | [`eval::INTRINSICS`](../crates/frees-core/src/eval.rs) | lowercase name, arity, strict/lazy evaluation body |
| Matrix expansion | [`parser::expand::MATRIX_FUNCTIONS`](../crates/frees-core/src/parser/expand.rs) | lowercase name, matrix result classification and shape checks |
| Signal and statistics expansion | [`parser::expand::flatten_call_proc`](../crates/frees-core/src/parser/expand.rs) | lowercase name, input/output shape rules in each handler |
| Control systems | [`control::flatten::CALL_NAMES`](../crates/frees-core/src/control/flatten.rs) | lowercase name, input/output shape rules in each handler |
| Thermodynamic properties | [`props::propfun`](../crates/frees-core/src/props/propfun.rs) | output/property name, input pair, fluid/material selector, units and backend |
| Analysis jobs | [`analysis/`](../crates/frees-core/src/analysis) and [`crates/frees/src/analysis.rs`](../crates/frees/src/analysis.rs) | request schema, result schema, execution context and progress/cancellation |
| User functions, procedures, modules and tables | [`parser::defs::Definitions`](../crates/frees-core/src/parser/defs.rs) | name, ordered inputs, outputs, defaults/units where declared, body kind |
| Physical components and ports | [`components::def`](../crates/frees-core/src/components/def.rs) and [`components/library-data`](../crates/frees-core/src/components/library-data) | component name, ports, parameters, variants and constitutive equations |

The current checked inventory contains 40 control-system names and 16 matrix
classification names. The complete intrinsic inventory is the `INTRINSICS`
slice; its unit test rejects duplicate or mis-cased names. Property aliases and
component definitions are data-driven in their respective registries and are
covered by their existing parser/property/component tests.

U1 must make the following fields explicit for every family without changing
the existing numeric kernels:

1. ordered required and optional argument names and defaults;
2. accepted value types and fixed or dependent output shapes;
3. output count, units, and result ownership;
4. strict, lazy, graph-building, analysis, or presentation evaluation mode;
5. valid contexts, work-budget cost, and determinism.

Before that shared schema exists, adding a duplicate hand-maintained list is a
compatibility risk. This file therefore records every registry and its current
signature source, while the registries remain authoritative for dispatch.
