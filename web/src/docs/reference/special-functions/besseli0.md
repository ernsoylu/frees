---
name: besseli0
category: Special Functions
summary: Modified Bessel function of the first kind, order 0 — I_0(x).
related: [besseli, besseli1, besselk0]
examples: []
tags: [special function, modified bessel, i0, first kind]
---

# besseli0

Returns `I_0(x)`, the **order-0 modified Bessel function of the first kind** — the
fixed-order specialization of `besseli`. `I_0(0) = 1`; it grows like
`e^x/√(2πx)`.

## Syntax

```
y = besseli0(x)
```

## Mathematical Formulation

$$ I_0(x) = \sum_{k=0}^{\infty}\frac{1}{(k!)^2}\left(\frac{x}{2}\right)^{2k} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Evaluate a radial-mode special function

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = besseli0(1)

{ CHECK result 1.266065848 0.0000012660658480342602 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 1.266065848
```

<!-- verified-reference-example:end -->

```
{ besseli0(0) = 1 }
y = besseli0(0)
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Argument. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | I_0(x). |
