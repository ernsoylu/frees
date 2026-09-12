---
name: SigPID
category: Component (signal)
summary: Acausal signal-domain component SigPID with ports sp, pv, out.
related: []
examples: []
tags: [sigpid, component, signal, acausal]
references: []
generated: true
---

# SigPID

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigPID inst(Kp, Ki, Kd, tau, i0, d0, model$)
```

## Ports

`sp`, `pv`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `Kp` | Number |
| `Ki` | Number |
| `Kd` | Number |
| `tau` | Number |
| `i0` | Number |
| `d0` | Number |
| `model$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
e &= sp.sig - pv.sig \\
\text{der}\left(df\right) &= \frac{e - df}{tau} \\
\text{init}\left(df\right) &= d0 \\
dterm &= \frac{e - df}{tau} \\
\text{init}\left(ie\right) &= i0 \\
u_{raw} &= kp\cdot e + ki\cdot ie + kd\cdot dterm
\end{aligned}
$$

## Model Variants

Selected via the `model$` parameter; each adds its own equations (and `REQUIRE`d parameters):

### `basic`

$$
\begin{aligned}
\text{der}\left(ie\right) &= e \\
out.sig &= u_{raw}
\end{aligned}
$$

### `clamped` — requires `umin`, `umax`, `Taw`

$$
\begin{aligned}
out.sig &= \text{min}\left(\text{max}\left(u_{raw}, umin\right), umax\right) \\
\text{der}\left(ie\right) &= e + \frac{out.sig - u_{raw}}{taw}
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Integrate a fixed tracking error with a PI controller

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
SigPID C(Kp=2, Ki=1, Kd=0, tau=0.1, i0=0, d0=0)
C.sp.sig = 1
C.pv.sig = 0
DYNAMIC response(method=ode45, time=0..2, points=5)
END

{ CHECK c.pv.sig 0 1e-8 }
{ CHECK c.sp.sig 1 0.000001 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
c.pv.sig = 0
c.sp.sig = 1
```

<!-- verified-reference-example:end -->
