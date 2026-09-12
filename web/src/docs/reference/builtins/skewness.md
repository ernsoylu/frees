---
name: skewness
category: Built-in Functions
summary: Reference page for skewness.
related: []
examples: []
tags: [skewness]
---

# skewness

`skewness` is available in the frees built-in functions surface.

## Syntax

```
skewness(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a scalar engineering calculation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = skewness(1, 2, 2, 3, 7)

{ CHECK result 1.744369497 0.0000017443694974549943 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1.744369497
```

<!-- verified-reference-example:end -->
