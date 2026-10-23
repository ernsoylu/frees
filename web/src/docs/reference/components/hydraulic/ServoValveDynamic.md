---
name: ServoValveDynamic
category: Component (hydraulic)
summary: "Servo valve with 2nd-order spool dynamics: the spool position tracks the command through (wn, zeta) and gates the odd-symmetric square-law flow — the dynamic rung above HydraulicValveCmd."
related: []
examples: []
tags: [servovalvedynamic, component, hydraulic, acausal]
references: []
---

# ServoValveDynamic

Servo valve with 2nd-order spool dynamics: the spool position tracks the command through (wn, zeta) and gates the odd-symmetric square-law flow — the dynamic rung above HydraulicValveCmd.

Reusable acausal **hydraulic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/hydraulic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
ServoValveDynamic inst(CdA_max, rho, wn, zeta, xs0, domain$)
```

## Ports

`in`, `out`, `u`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `CdA_max` | Number | Fully open discharge coefficient times flow area [m^2]. |
| `rho` | Number | Oil density [kg/m^3]. |
| `wn` | Number | Spool natural frequency [rad/s]. |
| `zeta` | Number | Spool damping ratio [-]. |
| `xs0` | Number | Initial spool opening [-]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
\text{der}\left(xs\right) &= vs \\
\text{init}\left(xs\right) &= xs0 \\
\text{der}\left(vs\right) &= wn^{2}\cdot \left(u.sig - xs\right) - 2\,zeta\cdot wn\cdot vs \\
\text{init}\left(vs\right) &= 0 \\
out.mdot &= in.mdot \\
out.h &= in.h \\
in.mdot\cdot \left|in.mdot\right| &= \left(xs\cdot cda_{max}\right)^{2}\cdot 2\cdot rho\cdot \left(in.p - out.p\right)
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Servo valve with 2nd-order spool dynamics at its settled point (der -> 0
// gives vs = 0 and xs = u.sig): 50% command on CdA_max = 4e-6 across
// 100 -> 1 bar. mdot = 0.5*4e-6*sqrt(2*870*9.9e6) = 0.26254 kg/s.
SigConstant       CMD(k=0.5)
HydraulicSupply   SUP(P=10000000 [Pa])
ServoValveDynamic SV(CdA_max=4e-6 [m^2], rho=870 [kg/m^3], wn=300 [rad/s], zeta=0.8, xs0=0)
HydraulicTank     TNK(P=100000 [Pa])
connect(SUP.out, SV.in)
connect(SV.out, TNK.port)
connect(CMD.out, SV.u)
x_spool = SV.xs
q_sv    = SV.in.mdot

{ CHECK cmd.out.sig 0.5 5e-7 }
{ CHECK q_sv 0.2624957143 2.624957142507283e-7 }
{ CHECK sup.out.h 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cmd.out.sig = 0.5
q_sv = 0.2624957143 [kg/s]
sup.out.h = 0
```

<!-- verified-reference-example:end -->
