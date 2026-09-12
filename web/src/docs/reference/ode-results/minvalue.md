---
name: minvalue
category: ODE Results
summary: Minimum value of an ODE column
related: []
examples: []
tags: [minvalue, ode, results]
references: []
---

# minvalue

Minimum value of an ODE column


## Syntax

```
MinValue('col')
```

## Description

Minimum value of an ODE column

## Mathematical Formulation

$$ \min_{0 \le i \le N} \text{col}(t_i) $$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
BatteryRC B(Voc=48, R0=0.1, R1=0.2, C1=1000, Vrc0=0)
Resistor  RL(R=4.7)
Ground    G()
connect(B.p, RL.a)
connect(B.n, RL.b, G.port)
DYNAMIC drive(method = ode45, time = 0 .. 2000, points = 100)
END
Vrc_final = FinalValue('b.vrc')
Vrc_start = MinValue('b.vrc')

{ CHECK Vrc_final 1.919942535 0.0000019199425353992433 }
{ CHECK Vrc_start 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
Vrc_final = 1.919942535
Vrc_start = 0
```

<!-- verified-reference-example:end -->

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `'col'` | Number | Yes | Name of a result-table column (string). |
