---
name: pi
category: Built-in Functions
summary: Reference page for pi.
related: []
examples: []
tags: [pi]
---

# pi

`pi` is available in the frees built-in functions surface.

## Syntax

```
pi(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Calculate a circular duct cross-section

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
diameter = 0.2 [m]
area = pi# * diameter^2 / 4

{ CHECK area 0.03141592654 3.141592653589793e-8 }
{ CHECK diameter 0.2 2e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
area = 0.03141592654 [m^2]
diameter = 0.2 [m]
```

<!-- verified-reference-example:end -->
