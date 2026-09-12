---
name: anova1_pval
category: Built-in Functions
summary: Reference page for anova1_pval.
related: []
examples: []
tags: [anova1_pval]
---

# anova1_pval

`anova1_pval` is available in the frees built-in functions surface.

## Syntax

```
anova1_pval(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare readings from three sensor batches

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = anova1_pval([9, 10, 11], [11, 12, 13], [13, 14, 15])

{ CHECK result 0.008 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.008
```

<!-- verified-reference-example:end -->
