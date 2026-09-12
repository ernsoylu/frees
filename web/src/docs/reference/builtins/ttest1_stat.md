---
name: ttest1_stat
category: Built-in Functions
summary: Reference page for ttest1_stat.
related: []
examples: []
tags: [ttest1_stat]
---

# ttest1_stat

`ttest1_stat` is available in the frees built-in functions surface.

## Syntax

```
ttest1_stat(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare sensor readings with a nominal value

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = ttest1_stat(10, [9, 10, 11, 12, 10])

{ CHECK result 0.7844645406 7.844645405527369e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.7844645406
```

<!-- verified-reference-example:end -->
