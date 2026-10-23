---
name: HydraulicCheckValve
category: Component (hydraulic)
summary: "Check valve: square-law orifice gated smoothly to forward ΔP (width eps)."
related: []
examples: []
tags: [hydrauliccheckvalve, component, hydraulic, acausal]
references: []
---

# HydraulicCheckValve

Check valve: square-law orifice gated smoothly to forward ΔP (width eps).

Reusable acausal **hydraulic-domain** component: instantiate it and connect its ports; the constitutive equations below expand into the global system.

> **Generated** from the component library (`crates/frees-core/src/components/library-data/hydraulic.frees`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicCheckValve inst(CdA, rho, eps, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `CdA` | Number | Open discharge coefficient times flow area [m^2]. |
| `rho` | Number | Oil density [kg/m^3]. |
| `eps` | Number | Width of the opening transition [Pa]. |
| `domain$` | String | Connector fluid family — one of `fluid`, `gas`, `oil`, `moistair`, `liquid`, `twophase`. |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
dp &= in.p - out.p \\
g &= 0.5\,\left(1 + \tanh\left(\frac{dp}{eps}\right)\right) \\
in.mdot\cdot \left|in.mdot\right| &= g\cdot cda^{2}\cdot 2\cdot rho\cdot dp
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Hydraulic valve set, steady. Check valve: forward matches the square law,
// reverse blocks. Sequence valve: shut 30 bar below the setpoint, open above.
// Flow control holds Qset. Flow divider splits 70/30 with the power-mix inlet
// pressure. K-resistance and pipe drops replicate their own laws.
// EXPECT d_cv = 0 tol 1e-8
// EXPECT cvr.in.mdot = 0 tol 1e-6
// EXPECT d_sq = 0 tol 1e-6
// EXPECT sqs.in.mdot = 0 tol 1e-6
// EXPECT fc.in.mdot = 0.85 tol 1e-9
// EXPECT fd.outa.mdot = 1.4 tol 1e-9
// EXPECT d_fd = 0 tol 1e-6
// EXPECT d_kr = 0 tol 1e-8
// EXPECT d_pp = 0 tol 1e-2
HydraulicSupply    S1(P=1000000 [Pa])
HydraulicCheckValve CVF(CdA=1e-6 [m^2], rho=850 [kg/m^3], eps=100 [Pa])
HydraulicTank      T1(P=100000 [Pa])
connect(S1.out, CVF.in)
connect(CVF.out, T1.port)
d_cv = CVF.in.mdot - 1e-6 [m^2] * sqrt(2 * 850 [kg/m^3] * 900000 [Pa])
HydraulicSupply    S2(P=100000 [Pa])
HydraulicCheckValve CVR(CdA=1e-6 [m^2], rho=850 [kg/m^3], eps=100 [Pa])
HydraulicTank      T2(P=1000000 [Pa])
connect(S2.out, CVR.in)
connect(CVR.out, T2.port)

HydraulicSupply       S3(P=25000000 [Pa])
HydraulicSequenceValve SQO(Pset=20000000 [Pa], CdA=1e-6 [m^2], rho=850 [kg/m^3], eps=100000 [Pa])
HydraulicTank         T3(P=100000 [Pa])
connect(S3.out, SQO.in)
connect(SQO.out, T3.port)
d_sq = SQO.in.mdot - 1e-6 [m^2] * sqrt(2 * 850 [kg/m^3] * 24900000 [Pa])
HydraulicSupply       S4(P=17000000 [Pa])
HydraulicSequenceValve SQS(Pset=20000000 [Pa], CdA=1e-6 [m^2], rho=850 [kg/m^3], eps=100000 [Pa])
HydraulicTank         T4(P=100000 [Pa])
connect(S4.out, SQS.in)
connect(SQS.out, T4.port)

HydraulicSupply     S5(P=1000000 [Pa])
HydraulicFlowControl FC(Qset=0.001 [m^3/s], rho=850 [kg/m^3])
HydraulicTank       T5(P=100000 [Pa])
connect(S5.out, FC.in)
connect(FC.out, T5.port)

function [out] = OilFlowSource(mdot, domain$ = oil)
port(out)
  out.mdot = mdot
  out.h    = 0
end
OilFlowSource       FSD(mdot=2 [kg/s])
HydraulicFlowDivider FD(frac=0.7)
HydraulicTank       TA(P=500000 [Pa])
HydraulicTank       TB(P=300000 [Pa])
connect(FSD.out, FD.in)
connect(FD.outa, TA.port)
connect(FD.outb, TB.port)
d_fd = FD.in.P - (0.7 * 500000 [Pa] + 0.3 * 300000 [Pa])

OilFlowSource      FKR(mdot=1 [kg/s])
HydraulicResistance KR(K=2.5, rho=850 [kg/m^3], D=0.01 [m])
HydraulicTank      TK(P=100000 [Pa])
connect(FKR.out, KR.in)
connect(KR.out, TK.port)
vkr  = 1 [kg/s] / (850 [kg/m^3] * pi# / 4 * (0.01 [m])^2)
d_kr = (KR.in.P - 100000 [Pa]) - 2.5 * 850 [kg/m^3] * vkr^2 / 2

OilFlowSource FPP(mdot=1 [kg/s])
HydraulicPipe HP(rho=850 [kg/m^3], nu=4e-5 [m^2/s], L=5 [m], D=0.01 [m], rough=0 [m])
HydraulicTank TP(P=100000 [Pa])
connect(FPP.out, HP.in)
connect(HP.out, TP.port)
vpp  = 1 [kg/s] / (850 [kg/m^3] * pi# / 4 * (0.01 [m])^2)
repp = reynolds(850 [kg/m^3], vpp, 0.01 [m], 850 [kg/m^3] * 4e-5 [m^2/s])
fpp2 = friction_factor(repp, 0)
d_pp = (HP.in.P - 100000 [Pa]) - fpp2 * (5 [m] / 0.01 [m]) * 850 [kg/m^3] * vpp^2 / 2

{ CHECK cvf.dp 900000 0.8999999999999999 }
{ CHECK cvf.g 1 0.000001 }
{ CHECK cvf.in.h 0 1e-8 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cvf.dp = 900000
cvf.g = 1
cvf.in.h = 0
```

<!-- verified-reference-example:end -->
