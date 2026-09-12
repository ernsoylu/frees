---
name: betainc
category: Built-in Functions
summary: Reference page for betainc.
related: []
examples: []
tags: [betainc]
---

# betainc

`betainc` is available in the frees built-in functions surface.

## Syntax

```
betainc(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate an incomplete beta function

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = betainc(0.5, 2, 3)

{ CHECK result 0.6875 6.874999999999999e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.6875
```

<!-- verified-reference-example:end -->
