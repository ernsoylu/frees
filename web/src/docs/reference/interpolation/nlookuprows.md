---
name: nlookuprows
category: Interpolation
summary: Number of data rows in table t
related: []
examples: []
tags: [nlookuprows, interpolation]
references: []
---

# nlookuprows

Number of data rows in table t


## Syntax

```
NLookupRows('t')
```

## Description

Number of data rows in table t

## Mathematical Formulation

$$ \operatorname{NLookupRows}(t) = \#\text{rows}(t) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
TABLE g(x)
  10   100
  20   400
  30   900
END
n = NLookupRows('g')
c = Lookup('g', 2, 2)
r = LookupRow('g', 1, 25)

{ CHECK c 400 0.00039999999999999996 }
{ CHECK n 3 0.000003 }
{ CHECK r 2.5 0.0000024999999999999998 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c = 400
n = 3
r = 2.5
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'t'` | Number | Yes | Name of a TABLE block (string). |
