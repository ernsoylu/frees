---
name: hypot
category: Built-in Functions
summary: Euclidean length of two real components.
related: [sqrt, abs, magnitude]
examples: []
tags: [hypot]
---

# hypot

Computes the Euclidean length of two real scalar components.

## Syntax

```
r = hypot(x, y)
```

## Description

`r = hypot(x, y)` evaluates the square root of `x^2 + y^2` using the
backend's `libm::hypot` routine. Exactly two scalar arguments are required.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find the resultant of perpendicular components

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = hypot(3, 4)

{ CHECK result 5 0.0000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 5
```

<!-- verified-reference-example:end -->

```frees
r = hypot(3, 4)
{ CHECK r 5 0 }
```

Expected result:

```text
r = 5
```

## Input Arguments

### x — First component

Real scalar. Use the same units for both components.

**Example:** `hypot(3, 4)`

**Data Types:** `number`

### y — Second component

Real scalar, which may be positive, negative, or zero.

**Example:** `hypot(3, -4)`

**Data Types:** `number`

## Output Arguments

### r — Euclidean length

Nonnegative real scalar.

**Example:** `r = 5`

**Data Types:** `number`

## Common Errors

Check argument count, dimensions, and units before solving.
