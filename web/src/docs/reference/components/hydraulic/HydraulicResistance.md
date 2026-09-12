---
name: HydraulicResistance
category: Component (hydraulic)
summary: Acausal hydraulic-domain component HydraulicResistance with ports in, out.
related: []
examples: []
tags: [hydraulicresistance, component, hydraulic, acausal]
references: []
generated: true
---

# HydraulicResistance

Reusable acausal **hydraulic-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
HydraulicResistance inst(K, rho, D, domain$)
```

## Ports

`in`, `out`

## Parameters

| Parameter | Type |
| --- | --- |
| `K` | Number |
| `rho` | Number |
| `D` | Number |
| `domain$` | String |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
out.mdot &= in.mdot \\
out.h &= in.h \\
a &= \frac{3.141592653589793}{4}\cdot d^{2} \\
v &= \frac{in.mdot}{rho\cdot a} \\
out.p &= in.p - \frac{k\cdot rho\cdot v\cdot \left|v\right|}{2}
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
HydraulicSupply    S1(P=1000000)
HydraulicCheckValve CVF(CdA=1e-6, rho=850, eps=100)
HydraulicTank      T1(P=100000)
connect(S1.out, CVF.in)
connect(CVF.out, T1.port)
d_cv = CVF.in.mdot - 1e-6 * sqrt(2 * 850 * 900000)
HydraulicSupply    S2(P=100000)
HydraulicCheckValve CVR(CdA=1e-6, rho=850, eps=100)
HydraulicTank      T2(P=1000000)
connect(S2.out, CVR.in)
connect(CVR.out, T2.port)

HydraulicSupply       S3(P=25000000)
HydraulicSequenceValve SQO(Pset=20000000, CdA=1e-6, rho=850, eps=100000)
HydraulicTank         T3(P=100000)
connect(S3.out, SQO.in)
connect(SQO.out, T3.port)
d_sq = SQO.in.mdot - 1e-6 * sqrt(2 * 850 * 24900000)
HydraulicSupply       S4(P=17000000)
HydraulicSequenceValve SQS(Pset=20000000, CdA=1e-6, rho=850, eps=100000)
HydraulicTank         T4(P=100000)
connect(S4.out, SQS.in)
connect(SQS.out, T4.port)

HydraulicSupply     S5(P=1000000)
HydraulicFlowControl FC(Qset=0.001, rho=850)
HydraulicTank       T5(P=100000)
connect(S5.out, FC.in)
connect(FC.out, T5.port)

function [out] = OilFlowSource(mdot, domain$ = oil)
port(out)
  out.mdot = mdot
  out.h    = 0
end
OilFlowSource       FSD(mdot=2)
HydraulicFlowDivider FD(frac=0.7)
HydraulicTank       TA(P=500000)
HydraulicTank       TB(P=300000)
connect(FSD.out, FD.in)
connect(FD.outa, TA.port)
connect(FD.outb, TB.port)
d_fd = FD.in.P - (0.7 * 500000 + 0.3 * 300000)

OilFlowSource      FKR(mdot=1)
HydraulicResistance KR(K=2.5, rho=850, D=0.01)
HydraulicTank      TK(P=100000)
connect(FKR.out, KR.in)
connect(KR.out, TK.port)
vkr  = 1 / (850 * pi# / 4 * 0.01^2)
d_kr = (KR.in.P - 100000) - 2.5 * 850 * vkr^2 / 2

OilFlowSource FPP(mdot=1)
HydraulicPipe HP(rho=850, nu=4e-5, L=5, D=0.01, rough=0)
HydraulicTank TP(P=100000)
connect(FPP.out, HP.in)
connect(HP.out, TP.port)
vpp  = 1 / (850 * pi# / 4 * 0.01^2)
repp = reynolds(850, vpp, 0.01, 850 * 4e-5)
fpp2 = friction_factor(repp, 0)
d_pp = (HP.in.P - 100000) - fpp2 * (5 / 0.01) * 850 * vpp^2 / 2

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
