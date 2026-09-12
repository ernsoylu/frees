---
name: stringpos
category: Strings
summary: 1-based position of substring sub$ in s$ (0 if absent)
related: []
examples: []
tags: [stringpos, strings]
references: []
---

# stringpos

1-based position of substring sub$ in s$ (0 if absent)


## Syntax

```
StringPos(s$, sub$)
```

## Description

1-based position of substring sub$ in s$ (0 if absent)

## Mathematical Formulation

$$ \operatorname{StringPos}(s, t) = \text{1-based index of } t \text{ in } s,\ 0 \text{ if absent} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
n = StringLen('frees')
p = StringPos('hello world', 'world')
v = StringVal('3.14')

{ CHECK n 5 0.0000049999999999999996 }
{ CHECK p 7 0.000007 }
{ CHECK v 3.14 0.00000314 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
n = 5
p = 7
v = 3.14
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `s$` | String | Yes | String literal. |
| `sub$` | String | Yes | Substring to search for. |
