---
name: wiebe_rate
category: Combustion
summary: Wiebe heat-release rate dxb/dθ for an engine combustion model.
related: [wiebe, AdiabaticFlameTemp]
examples: [engine-cycle-wiebe]
tags: [combustion, engine, wiebe, vibe, heat release, burn rate, crank angle]
---

# wiebe_rate

Returns the **Wiebe (Vibe) burn rate** `dxb/dθ` — the rate of change of burned mass
fraction with crank angle — for a single-zone engine heat-release model. Multiply
by the total heat release to get the instantaneous heat-release rate `dQ/dθ` that
drives the cylinder-pressure trace.

## Syntax

```
rate = wiebe_rate(theta, theta0, dtheta, a, m)
```

## Description

The Wiebe function is the standard empirical S-curve for the cumulative mass-fraction
burned over a combustion event; its derivative is the bell-shaped heat-release rate.
`theta0` is the start of combustion, `dtheta` the burn duration, `a` the efficiency
parameter (≈ 5 for ~99% completion), and `m` the form factor (≈ 2 for SI engines).

## Mathematical Formulation

Burned mass fraction and its rate:

$$ x_b(\theta) = 1 - \exp\!\left[-a\left(\frac{\theta-\theta_0}{\Delta\theta}\right)^{m+1}\right] $$

$$ \frac{dx_b}{d\theta} = \frac{a(m+1)}{\Delta\theta}\left(\frac{\theta-\theta_0}{\Delta\theta}\right)^{m}\exp\!\left[-a\left(\frac{\theta-\theta_0}{\Delta\theta}\right)^{m+1}\right] $$

> **Method:** direct evaluation; the rate is zero before `theta0` and decays to
> zero as the burn completes.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Solve a complete model

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// frees-language: 2
// Single-Zone Engine Cycle (Wiebe Heat Release)
{ Crank-angle single-zone first-law model of a spark-ignition engine over the
  compression-combustion-expansion strokes. Cylinder volume follows slider-crank
  kinematics; the burned fraction follows a Wiebe function; the DYNAMIC block
  integrates dp/dtheta over crank angle. "theta" runs 0..360 deg after BDC, so
  TDC is at 180. Plot p vs V (Plots window) for the indicator diagram. }
r_c       = 10             { compression ratio }
Vd        = 0.0005 [m^3]   { displacement volume (0.5 L) }
Vc        = Vd / (r_c - 1) { clearance volume }
lambda    = 0.25           { crank radius / connecting-rod length }
kk        = 1.35           { ratio of specific heats }
Q_tot     = 800 [J]        { total combustion heat release }
theta_soc = 165            { start of combustion, deg aBDC (15 deg BTDC) }
theta_dur = 50             { combustion duration, deg }
p_ivc     = 100000 [Pa]    { pressure at intake-valve close (BDC) }

DYNAMIC engine (method = ode45, t = 0 .. 360, points = 361, rtol = 1e-8)
  { the integration variable t is the crank angle in degrees after BDC }
  th       = (t - 180) * pi# / 180            { crank angle from TDC, radians }
  root     = sqrt(1 - lambda^2 * sin(th)^2)
  V        = Vc + (Vd/2) * ((1 - cos(th)) + (1/lambda) * (1 - root))
  dVdth    = (Vd/2) * (sin(th) + lambda * sin(th) * cos(th) / root)
  dVdtheta = dVdth * pi# / 180                { dV per crank degree }
  dQdtheta = Q_tot * wiebe_rate(t, theta_soc, theta_dur, 5, 2)
  der(p)   = (-kk * p * dVdtheta + (kk - 1) * dQdtheta) / V
  p(0)     = p_ivc
END

p_max = MaxValue('p')      { peak cylinder pressure }

{ CHECK kk 1.35 0.00000135 }
{ CHECK lambda 0.25 2.5e-7 }
{ CHECK p_ivc 100000 0.09999999999999999 }
```

Expected output (selected solution values; numerical rounding may vary):

```text
kk = 1.35
lambda = 0.25
p_ivc = 100000 [Pa]
```

<!-- verified-reference-example:end -->

### Example 1 — SI-engine heat release over crank angle

The single-zone cycle integrates `dQ/dθ = Q_tot · wiebe_rate(θ, θ_soc, θ_dur, 5, 2)`
to build the cylinder-pressure trace.

[Run: engine-cycle-wiebe]

**Expected:** a bell-shaped release peaking partway through the burn duration
(`a = 5`, `m = 2`), zero outside `[θ_soc, θ_soc + θ_dur]`.

## Input Arguments

| Argument | Type | Required | Description |
| --- | --- | --- | --- |
| `theta` | Number | Yes | Current crank angle [deg]. |
| `theta0` | Number | Yes | Start of combustion [deg]. |
| `dtheta` | Number | Yes | Burn duration [deg]. |
| `a` | Number | Yes | Efficiency parameter (≈ 5 for ~99% completion). |
| `m` | Number | Yes | Form factor (≈ 2 for SI engines). |

## Output Arguments

| Argument | Type | Description |
| --- | --- | --- |
| `rate` | Number | Burn rate dxb/dθ [1/deg]. |

## Common Errors

| Error | Cause | Fix |
| --- | --- | --- |
| (zero result) | `theta < theta0` | The rate is zero before combustion starts — expected. |
