---
name: CALL
covers: [procedure, module, component, param]
category: Language Keywords
summary: Legacy CALL/PROCEDURE/MODULE/COMPONENT/PARAM syntax, rejected by the solver and converted by frees-cli migrate.
related: [FUNCTION, connect]
examples: []
tags: [keyword, legacy, migration, procedure, module, component, param, call]
references: []
---

# CALL, PROCEDURE, MODULE, COMPONENT, PARAM (legacy)

These words remain reserved but are no longer accepted by the solver. A document that uses them fails with `FREES-MIG-001`; convert it with `frees-cli migrate FILE`, which prints version-2 syntax.

| Legacy | Version 2 |
| --- | --- |
| `PROCEDURE f(a, b : q, r) … END` + `CALL f(1, 2 : q, r)` | `function [q, r] = f(a, b) … end` + `[q, r] = f(1, 2)` |
| `COMPONENT Gain(u, y)` + `PARAM k = 2` | `function [u, y] = Gain(k = 2)` + `port(u)`, `port(y)` |
| `MODULE m(x : y) … END` | No automatic conversion — rewrite as a `function` or a component. |

## Syntax

```
frees-cli migrate legacy.frees > model.frees
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — The legacy form is rejected

```frees error="FREES-MIG-001: `CALL` is legacy syntax"
CALL divmod(17, 5 : q, r)
```

### Verified example — The migrated form

```frees
function [q, r] = divmod(a, b)
  q := trunc(a / b)
  r := a - q*b
end
[q, r] = divmod(17, 5)

{ CHECK q 3 0.000001 }
{ CHECK r 2 0.000001 }
```

Expected output:

```text
q = 3
r = 2
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| ``FREES-MIG-001: `PROCEDURE` is legacy syntax; use the migration converter`` | Legacy block in the document. | Run `frees-cli migrate`. |
| `migration line 1: MODULE blocks require a model-specific conversion` | `migrate` cannot convert a `MODULE`. | Rewrite it by hand. |
