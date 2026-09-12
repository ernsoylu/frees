---
name: tpdf
category: Built-in Functions
summary: Reference page for tpdf.
related: []
examples: []
tags: [tpdf]
---

# tpdf

`tpdf` is available in the frees built-in functions surface.

## Syntax

```
tpdf(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a Student-t density

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = tpdf(0, 9)

{ CHECK result 0.3880349089 3.880349088716686e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.3880349089
```

<!-- verified-reference-example:end -->
