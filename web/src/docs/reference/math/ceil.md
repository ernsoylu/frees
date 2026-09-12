---
name: ceil
category: Math
summary: Ceiling
related: []
examples: []
tags: [ceil, math]
references: []
---

# ceil

Ceiling


## Syntax

```
ceil(x)
```

## Description

Ceiling

## Mathematical Formulation

$$ \lceil x \rceil = \min\{n \in \mathbb{Z} : n \ge x\} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
a = round(1.6)
b = round(1.2345, 2)
c = floor(2.8)
d = ceil(2.1)
e = trunc(-3.7)
f = sign(-4.2)
g = factorial(3.0)
h = step(0.0)
h2 = step(-0.5)

{ CHECK a 2 0.000002 }
{ CHECK b 1.23 0.0000012299999999999999 }
{ CHECK c 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
a = 2
b = 1.23
c = 2
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
