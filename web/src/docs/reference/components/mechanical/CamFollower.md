---
name: CamFollower
category: Component (mechanical)
summary: Acausal mechanical-domain component CamFollower with ports rod.
related: []
examples: []
tags: [camfollower, component, mechanical, acausal]
references: []
generated: true
---

# CamFollower

Reusable acausal **mechanical-domain** component. Instantiate it and connect its ports; instantiation expands the constitutive equations below into scalar equations solved by the standard Newton/Tarjan pipeline.

> **Auto-generated** from the component library (`backend/core/src/main/resources/components/`). The ports, parameters, and constitutive equations are taken verbatim from the component definition; a worked example and prose discussion are added as the page is curated.

## Usage

```
CamFollower inst(m, kspring, x0, v0)
```

## Ports

`rod`

## Parameters

| Parameter | Type |
| --- | --- |
| `m` | Number |
| `kspring` | Number |
| `x0` | Number |
| `v0` | Number |

## Constitutive Equations

The acausal equations this component expands into (over its port members and parameters):

```
TransMass   M(m=m, v0=v0)
TransSpring S(k=kspring, x0=x0)
TransGround G()
connect(rod, M.port, S.a)
connect(S.b, G.port)
```

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// CamFollower steady: a 50 N preload on the rod node compresses the internal
// 5000 N/m return spring by 0.01 m; mass and node settle at zero velocity.
// EXPECT v_rod = 0 tol 1e-9
ForceSource FS(F = 50)
TransGround G()
CamFollower CF(m = 2, kspring = 5000, x0 = 0, v0 = 0)
connect(FS.a, CF.rod)
connect(FS.b, G.port)
v_rod = CF.rod.vel

{ CHECK cf.rod.f 50 0.000049999999999999996 }
{ CHECK cf.rod.vel 0 1e-8 }
{ CHECK cf.g.port.f -50 0.000049999999999999996 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
cf.rod.f = 50
cf.rod.vel = 0
cf.g.port.f = -50
```

<!-- verified-reference-example:end -->
