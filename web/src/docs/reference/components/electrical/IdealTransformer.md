---
name: IdealTransformer
category: Component (electrical)
summary: "Ideal transformer, turns ratio N = N1/N2: v1 = N·v2 and N·i1 + i2 = 0."
related: [Resistor]
examples: []
tags: [idealtransformer, component, electrical, acausal]
references: ["J. W. Nilsson and S. A. Riedel, Electric Circuits, 11th ed., Pearson, 2019 (the ideal transformer)"]
---

# IdealTransformer

Ideal transformer, turns ratio N = N1/N2: v1 = N·v2 and N·i1 + i2 = 0.

## What it models

A lossless, leakage-free transformer with no magnetizing current: the voltages scale by `N` and the currents by `1/N`, so it stores and dissipates nothing and the power in equals the power out. Because it passes DC as readily as AC, each winding needs its own reference (a `Ground` on each side). It does not saturate.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p1`, `n1`, `p2`, `n2`

## Usage

```
IdealTransformer inst(N)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `N` | Number | Turns ratio N1/N2, primary to secondary [-]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
p1.v - n1.v &= n\cdot \left(p2.v - n2.v\right) \\
p2.i &= -n\cdot p1.i \\
p1.i + n1.i &= 0 \\
p2.i + n2.i &= 0
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — step 120 V down to 12 V

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A 10:1 transformer steps 120 V down to 12 V across 12 Ω. The load draws
  1 A, the primary 0.1 A: the primary sees N²·R_L = 1200 Ω, and the power is
  12 W on both sides. Each winding has its own ground reference. }
VoltageSource    VS(E=120 [V])
IdealTransformer TR(N=10)
Resistor         RL(R=12 [ohm])
Ground           G1()
Ground           G2()
connect(VS.p, TR.p1)
connect(VS.n, TR.n1, G1.port)
connect(TR.p2, RL.a)
connect(RL.b, TR.n2, G2.port)
v_2  = TR.p2.V - TR.n2.V
i_1  = TR.p1.I
P_1  = (TR.p1.V - TR.n1.V) * TR.p1.I
P_2  = v_2 * RL.a.I
R_in = (TR.p1.V - TR.n1.V) / TR.p1.I

{ CHECK v_2 12 1e-09 }
{ CHECK i_1 0.1 1e-12 }
{ CHECK p_1 12 1e-09 }
{ CHECK p_2 12 1e-09 }
{ CHECK r_in 1200 1e-06 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_2 = 12
i_1 = 0.1
p_1 = 12
p_2 = 12
r_in = 1200
```

<!-- verified-reference-example:end -->
