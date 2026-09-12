---
name: E_
category: Solid Materials
summary: Solid-material property accessor E_(Material[, T]).
related: []
examples: [multi-objective-beam]
tags: [e, material, solid, property]
references: []
---

# E_

Returns a solid-material property via `E_(Material[, T])` from the built-in material database.

> Real-fluid/material/symbolic operation — see the inputs below.

## Syntax

```
E_(Material[, T])
```

## Description

Looks up a thermophysical/mechanical property of a named solid (e.g. Aluminum, Copper, Steel). Some properties accept an optional temperature.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
k = k_(Aluminum)
rho = rho_(Steel)
c = c_(Copper)
E = E_(Steel)
nu = nu_(Copper)

{ CHECK c 385 0.000385 }
{ CHECK E 200000000000 200000 }
{ CHECK k 237 0.000237 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c = 385
E = 200000000000
k = 237
```

<!-- verified-reference-example:end -->
