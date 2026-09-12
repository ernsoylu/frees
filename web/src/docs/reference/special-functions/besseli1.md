---
name: besseli1
category: Special Functions
summary: Modified Bessel function of the first kind, order 1 — I_1(x).
related: [besseli, besseli0, besselk1]
examples: []
tags: [special function, modified bessel, i1, first kind]
---

# besseli1

Returns `I_1(x)`, the **order-1 modified Bessel function of the first kind** — the
fixed-order specialization of `besseli`. `I_1(0) = 0`, with
`I_0'(x) = I_1(x)`.

## Syntax

```
y = besseli1(x)
```

## Mathematical Formulation

$$ I_1(x) = \sum_{k=0}^{\infty}\frac{1}{k!\,(k+1)!}\left(\frac{x}{2}\right)^{2k+1}, \qquad I_0'(x) = I_1(x) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a radial-mode special function

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = besseli1(1)

{ CHECK result 0.5651590976 5.651590975819435e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 0.5651590976
```

<!-- verified-reference-example:end -->

```
{ besseli1(0) = 0 }
y = besseli1(0)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | I_1(x). |
