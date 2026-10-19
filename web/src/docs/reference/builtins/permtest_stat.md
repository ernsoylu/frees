---
name: permtest_stat
category: Stats
summary: Permutation test for equal means — observed difference of means |x̄ − ȳ|.
related: [permtest_pval, ttest2_pval]
examples: []
tags: [permtest_stat, stats, permutation, nonparametric]
---

# permtest_stat

Permutation test for equal means — observed difference of means |x̄ − ȳ|.

## Syntax

```
y = permtest_stat(n_perms, seed, x, y)
```

## Description

`permtest_stat(n_perms, seed, x, y)` runs a seeded permutation test of whether two independent samples have equal means: labels are reshuffled `n_perms` times and the result is the **observed difference of means |x̄ − ȳ|**. The same seed always gives the same result.

Pass vectors as inline lists such as `[1, 2, 3]`: a named array variable is expanded into its elements and is not yet accepted as a single argument.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `n_perms` | Number | Yes | Number of random permutations. |
| `seed` | Number | Yes | Random seed (integer) for reproducibility. |
| `x` | Vector | Yes | First sample. |
| `y` | Vector | Yes | Second sample. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `y` | Number | Observed difference of means |x̄ − ȳ|. |

## Examples

<!-- verified-reference-example:start -->

### Verified example — Compare two batches with a seeded permutation test

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
result = permtest_stat(200, 42, [9, 10, 11], [12, 13, 14])

{ CHECK result 3 0.000003 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
result = 3
```

<!-- verified-reference-example:end -->
