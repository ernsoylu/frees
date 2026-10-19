---
name: and
covers: [or, not]
category: Language Keywords
summary: Logical operators for conditions inside function bodies and events.
related: [FUNCTION, if]
examples: []
tags: [keyword, logic, boolean, condition, and, or, not]
references: []
---

# and / or / not

Combine comparisons in `IF`, `WHILE` and `UNTIL` conditions. `not` has the highest precedence, then `and`, then `or`; use parentheses to make intent explicit.

## Syntax

```
IF a > 0 and b > 0 THEN … END
IF x < lo or not (x <= hi) THEN … END
```

## Description

The operators are conditions, not values: a top-level equation such as `x = 1 and 0` is a syntax error. For a value that switches at the top level use `If(a, b, lt, eq, gt)` or a smooth surrogate.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Band checks

```frees
function y = band(x, lo, hi)
  if x >= lo and x <= hi then
    y := 1
  else
    y := 0
  end
end
function y = outside(x, lo, hi)
  if x < lo or not (x <= hi) then
    y := 1
  else
    y := 0
  end
end
inside_ok  = band(25, 20, 30)
outside_ok = outside(35, 20, 30)

{ CHECK inside_ok 1 0.000001 }
{ CHECK outside_ok 1 0.000001 }
```

Expected output:

```text
inside_ok = 1
outside_ok = 1
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| ``expected end of statement, found `AND` `` | A logical operator in a top-level equation. | Move the logic into a function, or use `If(…)`. |
