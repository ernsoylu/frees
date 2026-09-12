---
name: fpdf
category: Built-in Functions
summary: Reference page for fpdf.
related: []
examples: []
tags: [fpdf]
---

# fpdf

`fpdf` is available in the frees built-in functions surface.

## Syntax

```
fpdf(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a variance-ratio density

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = fpdf(1, 4, 10)

{ CHECK result 0.4553496296 4.5534962958825516e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.4553496296
```

<!-- verified-reference-example:end -->
