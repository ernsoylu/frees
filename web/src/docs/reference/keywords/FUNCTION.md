---
name: FUNCTION
covers: [end, then, else, while, do, repeat, until]
category: Language Keywords
summary: Defines a reusable function, with IF/WHILE/REPEAT control flow in ordered bodies.
related: [FOR, and, if, connect]
examples: []
tags: [keyword, function, procedure, control flow, if, while, repeat, loop]
references: []
---

# FUNCTION

Defines a callable. An **ordered** body uses `:=` assignments that run top to bottom and may use `IF … THEN … ELSE … END`, `WHILE … DO … END` and `REPEAT … UNTIL`. Multiple outputs are declared in brackets and destructured at the call site.

## Syntax

```
function y = name(a, b)
  y := expression
end

function [q, r] = name(a, b)
  q := …
  r := …
end

IF condition THEN … ELSE … END
WHILE condition DO … END
REPEAT … UNTIL condition
```

## Description

Keywords are case-insensitive. Control flow is only legal inside function bodies — the top level is declarative and uses the inline `If(…)` instead. Every output must be assigned on every path. A header of the form `function [ports] = Name(params)` with `port(...)` lines defines a **component** instead; see `connect`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Loops and branches

```frees
function s = sumto(n)
  s := 0
  i := 0
  while i < n do
    i := i + 1
    s := s + i
  end
end
function f = fact(n)
  f := 1
  k := 0
  repeat
    k := k + 1
    f := f * k
  until k >= n
end
function y = clip(x)
  if x > 1 then
    y := 1
  else
    y := x
  end
end
a = sumto(10)
b = fact(5)
c = clip(3)
d = clip(0.5)

{ CHECK a 55 0.000001 }
{ CHECK b 120 0.000001 }
{ CHECK c 1 0.000001 }
{ CHECK d 0.5 0.000001 }
```

Expected output:

```text
a = 55   b = 120   c = 1   d = 0.5
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `FUNCTION f never assigned a return value ('y := ...' missing)` | A branch leaves the output unassigned. | Assign the output on every path. |
| `SYMBOLIC declarations are not allowed inside a PROCEDURE or FUNCTION.` | `SYMBOLIC` in a body. | Move it to the top level. |
| `FUNCTION f defines 'y' with the equation … and also assigns it elsewhere` | A body both assigns `y := …` and defines it with an equation `y = …`. | An equation defines a variable once; use `:=` for every assignment to it. |
