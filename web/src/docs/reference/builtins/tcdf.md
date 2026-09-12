---
name: tcdf
category: Built-in Functions
summary: Reference page for tcdf.
related: []
examples: []
tags: [tcdf]
---

# tcdf

`tcdf` is available in the frees built-in functions surface.

## Syntax

```
tcdf(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a Student-t tail threshold

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = tcdf(2, 9)

{ CHECK result 0.9617235881 9.617235881146496e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.9617235881
```

<!-- verified-reference-example:end -->
