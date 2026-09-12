---
name: tinv
category: Built-in Functions
summary: Reference page for tinv.
related: []
examples: []
tags: [tinv]
---

# tinv

`tinv` is available in the frees built-in functions surface.

## Syntax

```
tinv(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Find a two-sided 95 percent t threshold

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = tinv(0.975, 9)

{ CHECK result 2.262157163 0.0000022621571627982053 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 2.262157163
```

<!-- verified-reference-example:end -->
