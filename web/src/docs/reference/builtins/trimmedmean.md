---
name: trimmedmean
category: Built-in Functions
summary: Reference page for trimmedmean.
related: []
examples: []
tags: [trimmedmean]
---

# trimmedmean

`trimmedmean` is available in the frees built-in functions surface.

## Syntax

```
trimmedmean(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Suppress extremes in sensor readings

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = trimmedmean(0.2, [1, 10, 11, 12, 100])

{ CHECK result 11 0.000011 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 11
```

<!-- verified-reference-example:end -->
