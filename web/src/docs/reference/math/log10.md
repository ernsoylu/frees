---
name: log10
category: Math
summary: Base-10 logarithm
related: []
examples: []
tags: [log10, math]
references: []
---

# log10

Base-10 logarithm


## Syntax

```
log10(x)
```

## Description

Base-10 logarithm

## Mathematical Formulation

$$ y = \log_{10}(x) = \frac{\ln x}{\ln 10}, \quad x > 0 $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
Re = 1e5
eps = 0.00015
D = 0.25 [m]
{ ff is unknown — set a guess of ~0.02 in Variable Info }
1/sqrt(ff) = -2*log10(eps/(3.7*D) + 2.51/(Re*sqrt(ff)))

{ CHECK ff 0.02072664385 2.0726643846400944e-8 }
{ CHECK Re 100000 0.09999999999999999 }
{ CHECK D 0.25 2.5e-7 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
ff = 0.02072664385
Re = 100000
D = 0.25 [m]
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
