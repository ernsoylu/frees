---
name: wvar
category: Built-in Functions
summary: Reference page for wvar.
related: []
examples: []
tags: [wvar]
---

# wvar

`wvar` is available in the frees built-in functions surface.

## Syntax

```
wvar(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Estimate weighted measurement variance

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = wvar([1, 2, 1], [18, 20, 22])

{ CHECK result 3.2 0.0000032 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3.2
```

<!-- verified-reference-example:end -->
