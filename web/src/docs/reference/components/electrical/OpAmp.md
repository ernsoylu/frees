---
name: OpAmp
category: Component (electrical)
summary: "Ideal operational amplifier with rails: no input current, open-loop gain A, output saturating at Vneg and Vpos."
related: [Resistor]
examples: []
tags: [opamp, component, electrical, acausal]
references: ["P. Horowitz and W. Hill, The Art of Electronics, 3rd ed., Cambridge University Press, 2015 (op-amp golden rules)", "A. S. Sedra and K. C. Smith, Microelectronic Circuits, 7th ed., Oxford University Press, 2014 (the inverting amplifier with finite open-loop gain)"]
---

# OpAmp

Ideal operational amplifier with rails: no input current, open-loop gain A, output saturating at Vneg and Vpos.

## What it models

An op-amp with infinite input impedance, zero output impedance and a finite open-loop gain `A`. The output voltage, referred to ground, follows A·(v+ − v−) and saturates smoothly (tanh) at the rails, so feedback circuits reach their textbook gain and stop at the supply. The supply current is not modelled; the output port sources or sinks whatever current the circuit needs. There is no slew-rate, bandwidth or offset model.

## Domain

A reusable **acausal electrical-domain** component — its electrical ports carry potential `V` and current `I`; a node enforces equal `V` and `ΣI = 0` (Kirchhoff). Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`inp`, `inn`, `out`

## Usage

```
OpAmp inst(A, Vpos, Vneg)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `A` | Number | Open-loop voltage gain [-]. |
| `Vpos` | Number | Positive output rail [V]. |
| `Vneg` | Number | Negative output rail [V]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
inp.i &= 0 \\
inn.i &= 0 \\
vmid &= 0.5\,\left(vpos + vneg\right) \\
vhalf &= 0.5\,\left(vpos - vneg\right) \\
out.v &= vmid + vhalf\cdot \tanh\left(\frac{a\cdot \left(inp.v - inn.v\right)}{vhalf}\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — an inverting amplifier, linear and at the rail

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ Inverting amplifiers, Rf/Rin = 10 with ±12 V rails. With 0.5 V in the
  output is −Rf/Rin·vin = −5 V, short of it only by the finite open-loop gain
  (about 11/A of the output). With 2 V in, −20 V is past the rail and the
  output stops at −12 V. }
VoltageSource VA(E=0.5 [V])
Resistor      RinA(R=1000 [ohm])
Resistor      RfA(R=10000 [ohm])
OpAmp         OA(A=1e5, Vpos=12 [V], Vneg=-12 [V])
Ground        GA()
connect(VA.p, RinA.a)
connect(RinA.b, RfA.a, OA.inn)
connect(RfA.b, OA.out)
connect(OA.inp, VA.n, GA.port)
v_lin = OA.out.V

VoltageSource VB(E=2 [V])
Resistor      RinB(R=1000 [ohm])
Resistor      RfB(R=10000 [ohm])
OpAmp         OB(A=1e5, Vpos=12 [V], Vneg=-12 [V])
Ground        GB()
connect(VB.p, RinB.a)
connect(RinB.b, RfB.a, OB.inn)
connect(RfB.b, OB.out)
connect(OB.inp, VB.n, GB.port)
v_sat = OB.out.V

{ CHECK v_lin -5 0.001 }
{ CHECK v_sat -12 1e-06 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
v_lin = -5
v_sat = -12
```

<!-- verified-reference-example:end -->
