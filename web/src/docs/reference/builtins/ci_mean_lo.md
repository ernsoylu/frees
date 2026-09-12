---
name: ci_mean_lo
category: Built-in Functions
summary: Reference page for ci_mean_lo.
related: []
examples: []
tags: [ci_mean_lo]
---

# ci_mean_lo

`ci_mean_lo` is available in the frees built-in functions surface.

## Syntax

```
ci_mean_lo(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Bound a mean temperature at 95 percent confidence

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ci_mean_lo(0.95, [19, 20, 21, 22, 20])

{ CHECK result 18.98428522 0.000018984285223017727 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 18.98428522
```

<!-- verified-reference-example:end -->
