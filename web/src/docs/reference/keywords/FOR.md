---
name: FOR
covers: [to]
category: Language Keywords
summary: Repeats equations or assignments over an integer index.
related: [FUNCTION]
examples: []
tags: [keyword, loop, for, array, index]
references: []
---

# FOR

Generates one equation per index value. At the top level each iteration adds an equation to the system; inside a function body it is an ordinary loop over `:=` assignments.

## Syntax

```
FOR i = 1 TO n
  x[i] = …
END

FOR i = 1 : n
  …
END
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Filling an array

```frees
FOR i = 1 TO 4
  q[i] = 10 * i
END
Q_total = q[1] + q[2] + q[3] + q[4]

{ CHECK Q_total 100 0.000001 }
```

Expected output:

```text
q[1..4] = 10, 20, 30, 40
Q_total = 100
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| ``unterminated FOR block: expected `END` `` | Missing `END`. | Close the loop. |
| `CALL is not supported inside a FOR loop within a PROCEDURE or FUNCTION …` | Legacy `CALL` in a loop body. | Call the function directly. |
