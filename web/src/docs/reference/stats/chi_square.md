---
name: chi_square
category: Stats
summary: Chi-square CDF with df degrees of freedom
related: []
examples: []
tags: [chi, square, stats]
---

# chi_square

Chi-square CDF with df degrees of freedom


## Syntax

```
chi_square(x, df)
```

## Description

Chi-square CDF with df degrees of freedom

## Mathematical Formulation

$$ F(x; k) = \frac{\gamma(k/2,\ x/2)}{\Gamma(k/2)} \quad\text{(chi-square CDF, } k \text{ d.o.f.)} $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
j0_val = bessel_j0(2)
j1_val = bessel_j1(2)
i0_val = bessel_i0(2)
i1_val = bessel_i1(2)
k0_val = bessel_k0(2)
k1_val = bessel_k1(2)
y0_val = bessel_y0(2)
y1_val = bessel_y1(2)

k_order2 = bessel_k(2, 2)
y_order2 = bessel_y(2, 2)

chi2_val = chi_square(4, 2)

{ CHECK chi2_val 0.8646647168 8.646647167633872e-7 }
{ CHECK i0_val 2.279585307 0.0000022795853072960256 }
{ CHECK i1_val 1.590636857 0.0000015906368572633083 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
chi2_val = 0.8646647168
i0_val = 2.279585307
i1_val = 1.590636857
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | Number | Yes | Vapor quality (0–1). |
| `df` | Number | Yes | Degrees of freedom. |
