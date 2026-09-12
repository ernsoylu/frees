---
name: bootstrap_ci_hi
category: Built-in Functions
summary: Reference page for bootstrap_ci_hi.
related: []
examples: []
tags: [bootstrap_ci_hi]
---

# bootstrap_ci_hi

`bootstrap_ci_hi` is available in the frees built-in functions surface.

## Syntax

```
bootstrap_ci_hi(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Bootstrap a mean with a reproducible seed

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = bootstrap_ci_hi(0.95, 200, 42, [19, 20, 21, 22, 20])

{ CHECK result 21.4 0.0000214 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 21.4
```

<!-- verified-reference-example:end -->
