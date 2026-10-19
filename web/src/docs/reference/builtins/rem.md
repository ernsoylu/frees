---
name: rem
category: Math
summary: Remainder of a/b, with the sign of a.
related: [mod, int]
examples: []
tags: [rem, math, remainder, modulo]
---

# rem

Remainder of a/b, with the sign of a.

## Syntax

```
r = rem(a, b)
```

## Description

`rem(a, b)` returns a − b·trunc(a/b) (C `fmod`), so the result takes the sign of `a`: `rem(-7, 3) = -1`. `b` must be non-zero.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | Number | Yes | Dividend. |
| `b` | Number | Yes | Divisor (non-zero). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `r` | Number | Remainder, |r| < |b|. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Calculate a division remainder

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = rem(17, 5)

{ CHECK result 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 2
```

<!-- verified-reference-example:end -->
