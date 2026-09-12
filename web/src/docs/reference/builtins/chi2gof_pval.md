---
name: chi2gof_pval
category: Built-in Functions
summary: Reference page for chi2gof_pval.
related: []
examples: []
tags: [chi2gof_pval]
---

# chi2gof_pval

`chi2gof_pval` is available in the frees built-in functions surface.

## Syntax

```
chi2gof_pval(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare observed and expected category counts

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = chi2gof_pval([18, 22, 20], [20, 20, 20])

{ CHECK result 0.8187307531 8.187307530779818e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.8187307531
```

<!-- verified-reference-example:end -->
