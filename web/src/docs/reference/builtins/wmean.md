---
name: wmean
category: Built-in Functions
summary: Reference page for wmean.
related: []
examples: []
tags: [wmean]
---

# wmean

`wmean` is available in the frees built-in functions surface.

## Syntax

```
wmean(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Average weighted temperature readings

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = wmean([1, 2, 1], [18, 20, 22])

{ CHECK result 20 0.000019999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 20
```

<!-- verified-reference-example:end -->
