---
name: SI Engine Cycle (Wiebe Heat Release)
category: Cookbook
guide: true
summary: Build a single-zone spark-ignition engine cycle and integrate its cylinder-pressure trace.
examples: [engine-cycle-wiebe]
tags: [cookbook, engine, wiebe, heat release, indicator diagram, powertrain, dynamic]
related: [wiebe_rate, AdiabaticFlameTemp]
---

# SI Engine Cycle (Wiebe Heat Release)

**Goal:** model a single-zone spark-ignition engine over the compression–combustion–
expansion strokes and integrate the **cylinder-pressure trace** for the indicator
(p–V) diagram.

## What you'll build

A crank-angle first-law model integrated by a `DYNAMIC` block:

- Cylinder volume from slider-crank kinematics (compression ratio, displacement).
- Burned-mass-fraction rate from a Wiebe function (`wiebe_rate`).
- `dp/dθ` from the first law, integrated over crank angle.

## Approach

The Wiebe burn rate spreads the total heat release `Q_tot` over the burn duration:

$$ \frac{dQ}{d\theta} = Q_{tot}\,\frac{dx_b}{d\theta},\qquad x_b = 1 - \exp\!\left[-a\left(\tfrac{\theta-\theta_0}{\Delta\theta}\right)^{m+1}\right] $$

The single-zone energy balance then gives `dp/dθ` as a function of the changing volume
and the instantaneous heat release; the `DYNAMIC` integrator marches it over the crank
angle. Plot `p` vs `V` for the indicator diagram.

## Worked example

[Run: engine-cycle-wiebe]

**What it tells you:** the cylinder-pressure history and the closed p–V loop whose
area is the indicated work. The burn looks bell-shaped (peaking partway through the
duration); advancing or retarding `θ_soc` shifts the peak pressure and the work.

## Examples

<!-- verified-reference-example:start -->

### Verified example — Engine Cycle (Wiebe Heat Release)

Paste this complete document into the editor and select **Solve**. The `CHECK` comments verify the selected results without changing the calculation.

```frees
// Single-Zone Engine Cycle (Wiebe Heat Release)
{ Crank-angle single-zone first-law model of a spark-ignition engine over the
  compression-combustion-expansion strokes. Cylinder volume follows slider-crank
  kinematics; the burned fraction follows a Wiebe function; the DYNAMIC block
  integrates dp/dtheta over crank angle. The integration variable t is the crank
  angle in degrees after BDC, so TDC is at 180. Plot p vs V (Plots window) for
  the indicator diagram. }
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
