---
name: mason
category: Control Systems
summary: Overall gain of a signal-flow graph by Mason's gain formula.
related: [series, parallel, feedback]
examples: []
tags: [control, mason, signal flow graph, gain formula, block diagram]
---

# mason

Returns the **overall transfer gain** `T` between a source and sink node of a
signal-flow graph, using **Mason's gain formula**. It reduces an arbitrary
interconnection — including multiple loops and forward paths — to a single
input-output gain.

## Syntax

```
[T] = mason(G, source, sink)
T = mason(G, source, sink)
```

## Mathematical Formulation

Mason's rule:

$$ T = \frac{\sum_k P_k \Delta_k}{\Delta}, \qquad \Delta = 1 - \sum L_i + \sum L_iL_j - \dots $$

where `P_k` are the forward-path gains, `Δ` is the graph determinant built from the
loop gains `L_i`, and `Δ_k` is `Δ` with the paths touching `P_k` removed.

> **Method:** enumerate forward paths and loops on the graph `G`, then apply the
> formula.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
{ Mason's gain formula over a 3-node signal-flow graph. }
G[1,1] = 0; G[1,2] = 2; G[1,3] = 0
G[2,1] = 0; G[2,2] = 0; G[2,3] = 3
G[3,1] = 0; G[3,2] = 0; G[3,3] = 0
[T] = mason(G, 1, 3)

{ CHECK t 6 0.000006 }
{ CHECK G[1,1] 0 1e-8 }
{ CHECK G[1,2] 2 0.000002 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
t = 6
G[1,1] = 0
G[1,2] = 2
```

<!-- verified-reference-example:end -->

```
{ T = mason(G, source, sink) for a signal-flow graph G }
```

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `G` | Matrix | Yes | Signal-flow graph (branch-gain adjacency). |
| `source` | Number | Yes | Source node index. |
| `sink` | Number | Yes | Sink node index. |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `T` | Number | Overall source-to-sink gain. |
