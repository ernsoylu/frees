---
name: PMSM
category: Component (electrical)
summary: A permanent-magnet synchronous motor.
related: []
examples: []
tags: [pmsm, component, electrical, acausal]
---

# PMSM

A permanent-magnet synchronous motor.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`, `shaft`

## Usage

```
PMSM inst(Rs, lambda_pm, poles)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Rs` | Number | Series resistance [Ω]. |
| `lambda_pm` | Number | PM flux linkage [Wb]. |
| `poles` | Number | Number of magnetic pole pairs. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
kt &= 1.5\,poles\cdot lambda_{pm} \\
p.v - n.v &= rs\cdot p.i + kt\cdot shaft.w \\
p.i + n.i &= 0 \\
shaft.tau &= -kt\cdot p.i
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
VoltageSource    VS(E=48)
PMSM             M(Rs=0.5, lambda_pm=0.1, poles=4)
RotationalDamper LOAD(c=0.05)
Ground           G()
MechGround       MG()
connect(VS.p, M.p)
connect(VS.n, M.n, G.port)
connect(M.shaft, LOAD.a)
connect(LOAD.b, MG.port)

{ CHECK g.port.i 0 1e-8 }
{ CHECK g.port.v 0 1e-8 }
{ CHECK load.a.tau 3.74025974 0.00000374025974025974 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
g.port.i = 0
g.port.v = 0
load.a.tau = 3.74025974
```

<!-- verified-reference-example:end -->
