---
name: cov
category: Built-in Functions
summary: Reference page for cov.
related: []
examples: []
tags: [cov]
---

# cov

`cov` is available in the frees built-in functions surface.

## Syntax

```
cov(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Measure covariance of paired readings

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = cov([1, 2, 3, 4], [3, 4, 6, 7])

{ CHECK result 2.333333333 0.0000023333333333333336 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 2.333333333
```

<!-- verified-reference-example:end -->
