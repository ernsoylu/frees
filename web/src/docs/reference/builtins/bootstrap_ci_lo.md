---
name: bootstrap_ci_lo
category: Built-in Functions
summary: Reference page for bootstrap_ci_lo.
related: []
examples: []
tags: [bootstrap_ci_lo]
---

# bootstrap_ci_lo

`bootstrap_ci_lo` is available in the frees built-in functions surface.

## Syntax

```
bootstrap_ci_lo(...)
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
result = bootstrap_ci_lo(0.95, 200, 42, [19, 20, 21, 22, 20])

{ CHECK result 19.6 0.000019600000000000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 19.6
```

<!-- verified-reference-example:end -->
