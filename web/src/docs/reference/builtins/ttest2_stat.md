---
name: ttest2_stat
category: Built-in Functions
summary: Reference page for ttest2_stat.
related: []
examples: []
tags: [ttest2_stat]
---

# ttest2_stat

`ttest2_stat` is available in the frees built-in functions surface.

## Syntax

```
ttest2_stat(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare measurements before and after calibration

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ttest2_stat([9, 10, 11, 12, 10], [10, 10, 12, 14, 13])

{ CHECK result -1.475729575 0.000001475729574745244 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = -1.475729575
```

<!-- verified-reference-example:end -->
