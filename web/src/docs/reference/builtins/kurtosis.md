---
name: kurtosis
category: Built-in Functions
summary: Reference page for kurtosis.
related: []
examples: []
tags: [kurtosis]
---

# kurtosis

`kurtosis` is available in the frees built-in functions surface.

## Syntax

```
kurtosis(...)
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
result = kurtosis(1, 2, 2, 3, 7)

{ CHECK result 3.32231405 0.000003322314049586774 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3.32231405
```

<!-- verified-reference-example:end -->
