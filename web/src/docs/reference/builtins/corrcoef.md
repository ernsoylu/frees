---
name: corrcoef
category: Built-in Functions
summary: Reference page for corrcoef.
related: []
examples: []
tags: [corrcoef]
---

# corrcoef

`corrcoef` is available in the frees built-in functions surface.

## Syntax

```
corrcoef(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Measure linear correlation

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = corrcoef([1, 2, 3, 4], [3, 4, 6, 7])

{ CHECK result 0.9899494937 9.899494936611665e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.9899494937
```

<!-- verified-reference-example:end -->
