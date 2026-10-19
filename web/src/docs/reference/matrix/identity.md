---
name: identity
category: Matrix
summary: n × n identity matrix.
related: [eye, zeros, ones, diag]
examples: []
tags: [identity]
---

# identity

n × n identity matrix.

## Syntax

```
A = identity(n)
```

## Description

`A = identity(n)` returns the `n × n` identity matrix (same as `eye(n)`).

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

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `n` | Number | Yes | Matrix size (positive integer). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `A` | Matrix | n × n identity. |
