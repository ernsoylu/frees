---
name: baseconvert
category: Math
summary: Convert a based-number string literal to a value
related: []
examples: []
tags: [baseconvert, math]
references: []
---

# baseconvert

Convert a based-number string literal to a value


## Syntax

```
baseconvert(s$)
```

## Description

Convert a based-number string literal to a value

## Mathematical Formulation

$$ \operatorname{baseconvert}(s) = \text{numeric value of the based literal } s \ (\text{e.g. } \mathtt{0xFF} \to 255) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
a = BaseConvert('FF', 16, 10)
b = BaseConvert('1010', 2, 10)
c = BaseConvert('255', 10, 2)
d = BaseConvert(777, 8, 10)

{ CHECK a 255 0.00025499999999999996 }
{ CHECK b 10 0.000009999999999999999 }
{ CHECK c 11111111 11.111111 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a = 255
b = 10
c = 11111111
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `s$` | String | Yes | String literal. |
