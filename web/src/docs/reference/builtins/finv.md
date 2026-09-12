---
name: finv
category: Built-in Functions
summary: Reference page for finv.
related: []
examples: []
tags: [finv]
---

# finv

`finv` is available in the frees built-in functions surface.

## Syntax

```
finv(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find a variance-ratio critical value

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = finv(0.95, 4, 10)

{ CHECK result 3.478049691 0.0000034780496907652303 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3.478049691
```

<!-- verified-reference-example:end -->
