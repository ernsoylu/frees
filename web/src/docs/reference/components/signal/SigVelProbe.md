---
name: SigVelProbe
category: Component (signal)
summary: Acausal signal-domain component SigVelProbe with ports port, out.
related: []
examples: []
tags: [sigvelprobe, component, signal, acausal]
references: []
generated: true
---

# SigVelProbe

Reusable acausal **signal-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
SigVelProbe inst(param = value, ...)
```

## Ports

`port`, `out`

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

$$
\begin{aligned}
port.f &= 0 \\
out.sig &= port.vel
\end{aligned}
$$

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// SigVelProbe: force-free velocity pickup. 10 N through a 2 N.s/m damper to
// ground -> the probed node moves at 5 m/s and the probe draws no force.
// EXPECT y = 5 tol 1e-9
ForceSource FS(F = 10)
TransDamper TD(c = 2)
TransGround G1()
TransGround G2()
SigVelProbe PR()
connect(FS.a, TD.a, PR.port)
connect(FS.b, G1.port)
connect(TD.b, G2.port)
y = PR.out.sig

{ CHECK fs.a.f -10 0.000009999999999999999 }
{ CHECK fs.a.vel 5 0.0000049999999999999996 }
{ CHECK fs.b.f 10 0.000009999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
fs.a.f = -10
fs.a.vel = 5
fs.b.f = 10
```

<!-- verified-reference-example:end -->
