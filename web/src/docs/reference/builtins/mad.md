---
name: mad
category: Built-in Functions
summary: Reference page for mad.
related: []
examples: []
tags: [mad]
---

# mad

`mad` is available in the frees built-in functions surface.

## Syntax

```
mad(...)
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
result = mad(9, 10, 10, 11, 30)

{ CHECK result 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1
```

<!-- verified-reference-example:end -->
