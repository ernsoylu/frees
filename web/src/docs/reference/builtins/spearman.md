---
name: spearman
category: Built-in Functions
summary: Reference page for spearman.
related: []
examples: []
tags: [spearman]
---

# spearman

`spearman` is available in the frees built-in functions surface.

## Syntax

```
spearman(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare ranks of paired readings

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = spearman([1, 2, 3, 4], [3, 4, 6, 7])

{ CHECK result 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1
```

<!-- verified-reference-example:end -->
