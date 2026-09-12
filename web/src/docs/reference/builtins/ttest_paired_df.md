---
name: ttest_paired_df
category: Built-in Functions
summary: Reference page for ttest_paired_df.
related: []
examples: []
tags: [ttest_paired_df]
---

# ttest_paired_df

`ttest_paired_df` is available in the frees built-in functions surface.

## Syntax

```
ttest_paired_df(...)
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
result = ttest_paired_df([9, 10, 11, 12, 10], [10, 10, 12, 14, 13])

{ CHECK result 4 0.000004 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 4
```

<!-- verified-reference-example:end -->
