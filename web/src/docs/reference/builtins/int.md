---
name: int
category: Built-in Functions
summary: Reference page for int.
related: []
examples: []
tags: [int]
---

# int

`int` is available in the frees built-in functions surface.

## Syntax

```
int(...)
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
result = int(3.9)

{ CHECK result 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3
```

<!-- verified-reference-example:end -->
