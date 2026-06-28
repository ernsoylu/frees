---
name: Battery2RC
category: Component (electrical)
summary: A battery with two RC branches for second-order transient terminal behavior.
related: []
examples: []
tags: [battery2rc, component, electrical, acausal]
references:
  - "the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., a standard system-dynamics text (5th ed.) — acausal/bond-graph formalism"
  - "the standard literature, J.W. & the standard literature, S.A., a standard circuits text"
---

# Battery2RC

A battery with two RC branches for second-order transient terminal behavior.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`p`, `n`

## Usage

```
Battery2RC inst(Voc, R0, R1, C1, R2, C2, Vrc1_0, Vrc2_0)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `Voc` | Number | Open-circuit voltage [V]. |
| `R0` | Number | Series (ohmic) resistance [Ω]. |
| `R1` | Number | First RC-branch resistance [Ω]. |
| `C1` | Number | First RC-branch capacitance [F]. |
| `R2` | Number | Second RC-branch resistance [Ω]. |
| `C2` | Number | Second RC-branch capacitance [F]. |
| `Vrc1_0` | Number | Initial first-RC voltage [V]. |
| `Vrc2_0` | Number | Initial second-RC voltage [V]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

```
p.V - n.V  = Voc + R0 * p.I - Vrc1 - Vrc2
der(Vrc1)  = -p.I / C1 - Vrc1 / (R1 * C1)
init(Vrc1) = Vrc1_0
der(Vrc2)  = -p.I / C2 - Vrc2 / (R2 * C2)
init(Vrc2) = Vrc2_0
p.I + n.I  = 0
```

## References

1. the standard literature, D.C., the standard literature, D.L. & Rosenberg, R.C., *a standard system-dynamics text* (5th ed.) — acausal/bond-graph formalism.
2. the standard literature, J.W. & the standard literature, S.A., *Electric Circuits* (11th ed.).
