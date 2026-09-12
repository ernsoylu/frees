---
name: ttest2_pval
category: Built-in Functions
summary: Reference page for ttest2_pval.
related: []
examples: []
tags: [ttest2_pval]
---

# ttest2_pval

`ttest2_pval` is available in the frees built-in functions surface.

## Syntax

```
ttest2_pval(...)
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
result = ttest2_pval([9, 10, 11, 12, 10], [10, 10, 12, 14, 13])

{ CHECK result 0.1848228852 1.848228851621454e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.1848228852
```

<!-- verified-reference-example:end -->
