---
name: trunc
category: Math
summary: Discard the fractional part (round toward zero)
related: []
examples: []
tags: [trunc, math]
references: []
---

# trunc

Discard the fractional part (round toward zero)


## Syntax

```
trunc(x)
```

## Description

Discard the fractional part (round toward zero)

## Mathematical Formulation

$$ \operatorname{trunc}(x) = \operatorname{sign}(x)\,\lfloor |x| \rfloor $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
function [q, r] = divmod(a, b)
  q := trunc(a / b)
  r := a - q * b
END

[whole, rem] = DivMod(17, 5)

{ CHECK rem 2 0.000002 }
{ CHECK whole 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
rem = 2
whole = 3
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
