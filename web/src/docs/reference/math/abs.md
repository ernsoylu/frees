---
name: abs
category: Math
summary: Absolute value
related: [sign, hypot, magnitude]
examples: []
tags: [abs, math]
references: []
---

# abs

Absolute value


## Syntax

```
y = abs(x)
```

## Description

`y = abs(x)` returns the nonnegative magnitude of the real scalar `x`.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Worked calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
y = abs(-3.5)
{ CHECK y 3.5 0 }

{ CHECK y 3.5 0.0000035 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
y = 3.5
```

<!-- verified-reference-example:end -->

```frees
y = abs(-3.5)
{ CHECK y 3.5 0 }
```

Expected result:

```text
y = 3.5
```

## Mathematical Formulation

$$ |x| = \begin{cases} x & x \ge 0 \\ -x & x < 0 \end{cases} $$

## Input Arguments

### x — Real scalar

Required numeric expression. Negative and positive inputs are both accepted.

**Example:** `abs(-3.5)`

**Data Types:** `number`

## Output Arguments

### y — Absolute value

Nonnegative scalar with the same units as the input.

**Example:** `y = 3.5`

**Data Types:** `number`
