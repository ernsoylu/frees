---
name: permtest_pval
category: Built-in Functions
summary: Reference page for permtest_pval.
related: []
examples: []
tags: [permtest_pval]
---

# permtest_pval

`permtest_pval` is available in the frees built-in functions surface.

## Syntax

```
permtest_pval(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare two batches with a seeded permutation test

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = permtest_pval(200, 42, [9, 10, 11], [12, 13, 14])

{ CHECK result 0.1144278607 1.1442786069651741e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.1144278607
```

<!-- verified-reference-example:end -->
