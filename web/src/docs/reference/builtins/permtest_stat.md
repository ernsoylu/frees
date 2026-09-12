---
name: permtest_stat
category: Built-in Functions
summary: Reference page for permtest_stat.
related: []
examples: []
tags: [permtest_stat]
---

# permtest_stat

`permtest_stat` is available in the frees built-in functions surface.

## Syntax

```
permtest_stat(...)
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
result = permtest_stat(200, 42, [9, 10, 11], [12, 13, 14])

{ CHECK result 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3
```

<!-- verified-reference-example:end -->
