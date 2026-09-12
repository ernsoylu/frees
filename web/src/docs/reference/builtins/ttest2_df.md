---
name: ttest2_df
category: Built-in Functions
summary: Reference page for ttest2_df.
related: []
examples: []
tags: [ttest2_df]
---

# ttest2_df

`ttest2_df` is available in the frees built-in functions surface.

## Syntax

```
ttest2_df(...)
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
result = ttest2_df([9, 10, 11, 12, 10], [10, 10, 12, 14, 13])

{ CHECK result 6.789606035 0.0000067896060352053624 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 6.789606035
```

<!-- verified-reference-example:end -->
