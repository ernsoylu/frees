---
name: SigTimer
category: Component (signal)
summary: "Timer on a logical input: an on-delay output and a one-shot pulse, both of duration T."
related: [SigPulse, SigStep]
examples: []
tags: [sigtimer, component, signal, acausal]
references: ["IEC 61131-3:2013, Programmable controllers \u2014 Part 3: Programming languages (the TON and TP timer functions)"]
---

# SigTimer

Timer on a logical input: an on-delay output and a one-shot pulse, both of duration T.

## What it models

A PLC-style timer. The input counts as high above 0.5. `delayed` rises once the input has been high for `T`, and falls with it (an on-delay, TON). `pulse` is high for the first `T` after each rising edge, provided the input stays high that long; it ends early if the input falls first, so it is not a retriggerable monostable. An elapsed-time state counts while the input is high, and relaxes to zero with time constant `tr` while it is low, which re-arms the timer; leave the input low for about 5·tr between uses. The input level is smoothed over `eps` and the output edges over eps·T. It needs a `DYNAMIC` block.

## Domain

A **causal signal-domain** block — each port carries one value `sig`; a signal wire copies the output's value to the inputs it feeds. Instantiate it and connect its ports; the constitutive equations below expand into the global scalar system.

## Ports

`in`, `delayed`, `pulse`

## Usage

```
SigTimer inst(T, tr, eps)
```

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `T` | Number | Delay and pulse duration [s]. |
| `tr` | Number | Re-arm time constant while the input is low [s]. |
| `eps` | Number | Smoothing of the input level, and of the output edges as a fraction of T [-]. |

## Constitutive Equations

Instantiating the component expands these acausal equations (over its port members and parameters) into scalar equations solved by the standard Newton/Tarjan pipeline:

$$
\begin{aligned}
w &= 0.5\,\left(1 + \tanh\left(\frac{in.sig - 0.5}{eps}\right)\right) \\
\text{der}\left(c\right) &= w - \frac{\left(1 - w\right)\cdot c}{tr} \\
\text{init}\left(c\right) &= 0\,\left[s\right] \\
delayed.sig &= 0.5\,\left(1 + \tanh\left(\frac{c - t}{eps\cdot t}\right)\right) \\
pulse.sig &= w\cdot 0.5\cdot \left(1 + \tanh\left(\frac{t - c}{eps\cdot t}\right)\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — on-delay and one-shot on a 0.5 s pulse

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results against the analytic values in the comment; they do not change the calculation.

```frees
// frees-language: 2
{ A 0.1 s timer on an input that is high from 0.2 s to 0.7 s. The on-delay
  output rises at 0.3 s and falls with the input; the one-shot output is high
  from 0.2 s to 0.3 s. }
SigPulse      IN(t0=0.2 [s], width=0.5 [s], high=1, low=0, eps=1e-4 [s])
SigTimer      TM(T=0.1 [s], tr=0.01 [s], eps=0.01)
SigFirstOrder V1(tau=1 [s], y0=0)
SigFirstOrder V2(tau=1 [s], y0=0)
connect(IN.out, TM.in)
connect(TM.delayed, V1.in)
connect(TM.pulse, V2.in)
DYNAMIC timer (method = ida, time = 0 .. 1, points = 1001)
END
delayed_025 = ODEValue('tm.delayed.sig', 0.25)
delayed_035 = ODEValue('tm.delayed.sig', 0.35)
delayed_080 = ODEValue('tm.delayed.sig', 0.8)
pulse_025   = ODEValue('tm.pulse.sig', 0.25)
pulse_035   = ODEValue('tm.pulse.sig', 0.35)

{ CHECK delayed_025 0 1e-09 }
{ CHECK delayed_035 1 1e-09 }
{ CHECK delayed_080 0 1e-09 }
{ CHECK pulse_025 1 1e-09 }
{ CHECK pulse_035 0 1e-09 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
delayed_025 = 0
delayed_035 = 1
delayed_080 = 0
pulse_025 = 1
pulse_035 = 0
```

<!-- verified-reference-example:end -->
