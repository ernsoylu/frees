---
name: GUESS
category: Language Keywords
summary: Seeds a variable's starting value and bounds for the nonlinear solver.
related: [DYNAMIC]
examples: [cooling-coil-dehumidification]
tags: [keyword, guess, bounds, initial value, newton, convergence]
references: []
---

# GUESS

Writes a variable's starting guess and bounds into the document, so the seed travels with the text instead of living only in Variable Info.

## Syntax

```
GUESS x = 2
GUESS x [0, 10]
GUESS x = 2 [0, 10]
guess(x, 2, lower = 0, upper = 10)
```

## Description

A guess picks the root Newton converges to when an equation has several; bounds keep iteration in the physical range. Member paths (`HX.in.P`) are accepted. A `GUESS` in the text wins over Variable Information on conflict.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Selecting the root

`x^2 = 9` and `y^2 = 4` each have two roots; the guesses and bounds select `x = 3` and `y = -2`.

```frees
GUESS x = 2 [0, 10]
x^2 = 9
guess(y, -2, lower = -5, upper = 0)
y^2 = 4

{ CHECK x 3 0.000001 }
{ CHECK y -2 0.000001 }
```

Expected output:

```text
x = 3
y = -2
```

<!-- verified-reference-example:end -->

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| `GUESS x: declare a guess (GUESS x = 2), bounds (GUESS x [0, 10]), or both.` | A bare `GUESS x`. | Give a value, bounds, or both. |
| `GUESS x: the lower bound must be below the upper bound.` | Crossed bounds. | Swap them. |
| `GUESS x: the guess 20 lies outside [0, 10].` | Guess outside its own bounds. | Move the guess inside. |
