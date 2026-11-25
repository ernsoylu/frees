---
name: FOR
covers: [to]
category: Language Keywords
summary: Repeats equations or assignments over an integer index.
related: [FUNCTION]
examples: [linear-regression-diagnostics, quadratic-regression]
tags: [keyword, loop, for, array, index]
references: []
---

# FOR

Generates one equation per index value. At the top level each iteration adds an equation to the system; inside a function body it is an ordinary loop over `:=` assignments.

Both bounds must be integers. The step is 1 unless written, and a range the step points away from runs zero times: `FOR i = 3 TO 1` generates nothing. To count down, write the step: `FOR i = 3 : -1 : 1`.

## Syntax

```
FOR i = 1 TO n
  x[i] = …
END

FOR i = 1 : n
  …
END

FOR i = n : -1 : 1
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
| `FOR range end must be an integer, got 2.5` | A bound is not a whole number. | Round the bound, e.g. `floor(n)`. |
| A reversed loop such as `FOR i = 3 TO 1` creates no equations | The default step is `+1`, so a descending range is empty. | Write the step: `FOR i = 3 : -1 : 1`. |
| `CALL is not supported inside a FOR loop within a PROCEDURE or FUNCTION …` | Legacy `CALL` in a loop body. | Call the function directly. |
