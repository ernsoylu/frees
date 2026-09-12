---
name: identity
category: Matrix Functions
summary: Reference page for identity.
related: []
examples: []
tags: [identity]
---

# identity

`identity` is available in the frees matrix functions surface.

## Syntax

```
identity(...)
```

## Description

See the backend signature for accepted arguments and returned values.

## Common Errors

Check argument count, dimensions, and units before solving.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Construct a three-channel identity map

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
A = identity(3)

{ CHECK A[1,1] 1 0.000001 }
{ CHECK A[1,2] 0 1e-8 }
{ CHECK A[1,3] 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
A[1,1] = 1
A[1,2] = 0
A[1,3] = 0
```

<!-- verified-reference-example:end -->
