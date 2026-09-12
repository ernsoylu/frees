---
name: k_
category: Solid Materials
summary: Solid-material property accessor k_(Material[, T]).
related: []
examples: [material-conduction]
tags: [k, material, solid, property]
references: []
---

# k_

Returns a solid-material property via `k_(Material[, T])` from the built-in material database.

> Real-fluid/material/symbolic operation — see the inputs below.

## Syntax

```
k_(Material[, T])
```

## Description

Looks up a thermophysical/mechanical property of a named solid (e.g. Aluminum, Copper, Steel). Some properties accept an optional temperature.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
q = k_(Aluminum) * A * dT / L
A = 2
dT = 50
L = 0.1

{ CHECK q 237000 0.237 }
{ CHECK A 2 0.000002 }
{ CHECK dT 50 0.000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
q = 237000
A = 2
dT = 50
```

<!-- verified-reference-example:end -->
