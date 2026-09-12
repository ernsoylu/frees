---
name: fcdf
category: Built-in Functions
summary: Reference page for fcdf.
related: []
examples: []
tags: [fcdf]
---

# fcdf

`fcdf` is available in the frees built-in functions surface.

## Syntax

```
fcdf(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a variance-ratio probability

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = fcdf(2, 4, 10)

{ CHECK result 0.8294730742 8.294730741512228e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.8294730742
```

<!-- verified-reference-example:end -->
