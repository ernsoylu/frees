# Draft: Unifying `MODULE` into the multi-output `FUNCTION`

**Status:** Design draft (not yet implemented). Part (c) of the multi-output / `CALL`
overhaul. Parts (a) `~`/partial outputs and (b) multi-output destructuring of every
`CALL` intrinsic are **implemented and tested**.

## Motivation

frees has two reusable-subsystem constructs that overlap heavily:

| Construct | Body | Direction | Invocation | Returns |
|---|---|---|---|---|
| `FUNCTION [a,b] = f(x)` | sequential `:=` | one-way (inputs → outputs) | `[a,b] = f(x)` or `CALL f(x : a,b)` | multiple values |
| `MODULE m(x : y)` | declarative `=` equations | **any direction** | `CALL m(x : y)` | multiple values |

The user's observation: a `MODULE` is just a multi-output function whose body is a set
of *implicit equations* instead of sequential assignments. If a multi-output `FUNCTION`
could host implicit equations, `MODULE` becomes redundant syntax.

## The one real semantic difference

This is **not** pure syntax sugar — the constructs are lowered differently today
(`EquationParser.flattenProcedureCall` vs `flattenModuleCall`):

- **`FUNCTION`/`PROCEDURE`** lowers to a single synthetic call per output
  (`proc$name$k`). The body is evaluated forward, as a black box; its internal
  unknowns never enter the global Newton system. Outputs are pure functions of inputs.
- **`MODULE`** is *inlined per call site*: the body equations are cloned with a
  per-instance namespace (`pipe_flow$1$V`, `pipe_flow$2$V`, …), inputs/outputs are
  bound with equations, and **all of it joins the global simultaneous solve**. That is
  what lets the same module be used for rating (`CALL m(D,Q : dP)`) and sizing
  (`CALL m(D,dP : Q)`) — the unknown can be on either side.

So unification means: **let a multi-output `FUNCTION` body contain `=` equations**, and
when it does, lower that call the way `MODULE` is lowered today (per-instance namespaced
inlining into the global system) rather than as a forward `proc$` call.

## Proposed design

### Surface syntax (no new keyword)

```
{ implicit-equation body — solved in any direction, like today's MODULE }
FUNCTION [dP, V] = pipe_flow(D, Q)
  V  = Q / (pi# / 4 * D^2)
  dP = 0.02 * (100 / D) * (1000 * V^2 / 2)
END

[dP1]    = pipe_flow(D1, Q1)     { rating: solve dP1 }
[Q2]     = pipe_flow(D2, dP2)    { sizing: bidirectional — dP2 in, Q2 out (see note) }
```

- A `FUNCTION` body is classified at parse time:
  - contains only `:=` (and control flow) → **imperative** (current behavior).
  - contains any top-level `=` equation → **implicit/declarative** (MODULE behavior).
  - mixing `:=` and `=` at the top level → parse error (ambiguous; keep the rule
    strict per the project's "strict over warn" convention).
- `V` (assigned in the body but not a declared output) is an **internal** variable:
  namespaced per instance and hidden from results, exactly like a MODULE's locals.

### Bidirectionality vs. positional destructuring

Today MODULE bidirectionality relies on the `CALL m(inputs : outputs)` split telling the
solver which names are knowns vs. unknowns. The `[outs] = f(ins)` form fixes which side is
"output", so the rating/sizing flip needs one of:

1. **Keep the colon `CALL` form as the bidirectional entry point** (`CALL pipe_flow(D2, dP2 : Q2)`),
   and treat `[outs] = f(ins)` as the convenience form for the common forward direction.
   *Recommended* — least surprising, preserves all existing MODULE call sites verbatim.
2. Allow the declared "inputs" to be solved when supplied as unknowns. More magic;
   defer unless needed.

### Lowering

- Reuse `flattenModuleCall`'s machinery (per-instance namespace, input/output binding
  equations, `namespaceExpr`) for implicit-bodied functions. The existing
  `ctx.moduleCounter()` instance counter and display-name registration apply unchanged.
- `expectedOutputCount` returns `-1` for user defs, so the `~`/partial padding from part
  (a) does **not** auto-pad user calls. To extend `~`/partial to user multi-output
  functions with implicit bodies, the padding/skip must instead drop the *output binding
  equation* for that slot (the internal equation must stay). This is the one new code path.

### Migration

- `MODULE … END` stays as a **back-compatible alias** that parses to an implicit-bodied
  `FUNCTION`. No existing `.frees` document breaks.
- Docs reframe `MODULE` as "a `FUNCTION` with an equation body"; the keyword is retained
  but de-emphasized. The Diagram/whiteboard and examples that reference `MODULE` keep working.

## Scope / open questions

1. **Output `~`/partial for implicit-bodied functions** needs the drop-binding-equation
   path (above) rather than sink padding, because the internal equations are required to
   keep the per-instance block square.
2. **Nested calls** (a function whose body calls another) — MODULE already supports this
   via namespacing; verify the imperative→implicit classification composes.
3. **Unit checking** — MODULE locals currently flow through the unit checker as namespaced
   vars; confirm parity for implicit-bodied functions.
4. **Recursion** — only meaningful for imperative bodies; implicit bodies should reject it.

## Test plan (when implemented)

- Implicit-bodied `FUNCTION` solves identically to today's `MODULE` (port
  `ProceduralFeaturesTest` MODULE cases to the new form, assert equal results).
- Rating/sizing bidirectionality via the colon `CALL` form.
- Two call sites get independent namespaced instances (no cross-talk).
- `MODULE` keyword still parses and matches the unified lowering.
- Mixed `:=`/`=` body → parse error.
