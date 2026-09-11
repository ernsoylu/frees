# Worked engineering examples

Each example supplies a physical problem, complete inputs, execution instructions and expected results. These examples address the priority documentation gaps: pneumatic, hydraulic, mechanical and control components; signal processing; uncertainty; calibration; and sensitivity. They do not cover every undocumented symbol.

The component cases are simplified teaching models, and the measurement datasets are synthetic. Parameters introduced for an adaptation are stated explicitly. Use SI values unless the text says otherwise. Paste each `frees` block into a separate editor document and select **Solve**; dynamic blocks also produce time tables. The `CHECK` comments are ordinary comments to the solver and numerical assertions for the verification recipe at the end.

## 1. Spring-return pneumatic actuator

A regulated air supply moves a diaphragm against a return spring. Use an effective area of 0.001774 m², a spring stiffness of 1,330 N/m and a 20 kPa pressure rise above a 100 kPa atmosphere. This is a static adaptation: it neglects valve restriction, chamber filling, friction and spring preload. Run with **Solve**. It demonstrates `PneumaticSupply`, `PneumaticActuator`, `TransSpring` and `TransGround`.

```frees
PneumaticSupply supply(fluid$=Air, P=120000, T=293.15)
PneumaticActuator actuator(fluid$=Air, area=0.001774, Patm=100000)
TransSpring spring(k=1330, x0=0)
TransGround ground()
connect(supply.out, actuator.in)
connect(actuator.rod, spring.a)
connect(spring.b, ground.port)
stroke = spring.x
force = -actuator.rod.f
{ CHECK stroke 0.0266766917293233 1e-8 }
{ CHECK force 35.48 1e-6 }
```

**Expected:** Force = ΔP·A = **35.48 N**; stroke = force/k = **26.6767 mm**. Steady velocity and air mass flow are zero. Pressures supplied to property functions are absolute.

**Try:** Double the spring stiffness. The force remains 35.48 N and the stroke halves.

## 2. Hydraulic actuator holding a spring load

Replace the pressure-driven diaphragm with an oil cylinder. Use a 0.001 m² piston area, 1.1 MPa supply pressure and 0.1 MPa external pressure. This steady-state model demonstrates `HydraulicSupply` and `HydraulicCylinder`; the chamber compressibility parameters matter when dynamics are added.

```frees
HydraulicSupply supply(P=1100000)
HydraulicCylinder cylinder(rho=850, beta=1.5e9, V0=0.0001, area=0.001, Patm=100000, P0=1100000)
TransSpring spring(k=50000, x0=0.02)
TransGround ground()
connect(supply.out, cylinder.in)
connect(cylinder.rod, spring.a)
connect(spring.b, ground.port)
load = -cylinder.rod.f
stroke = spring.x
{ CHECK load 1000 1e-6 }
{ CHECK stroke 0.02 1e-8 }
```

**Expected:** Load = **1,000 N**, stroke = **0.020 m**, and steady oil flow = **0 kg/s**. An ideal pressure supply determines pressure directly; this is not a valve-controlled filling transient.

**Try:** Increase external pressure to 0.2 MPa. The load becomes 900 N and stroke 18 mm.

## 3. Oil flow through a metering restriction

Feed an oil restriction from a regulated supply and discharge to a tank. Choose density 850 kg/m³ and effective discharge area 10⁻⁵ m². The supply-to-tank pressure drop is 1 MPa. This adaptation demonstrates `HydraulicOrifice` and `HydraulicTank` in a closed network. Run with **Solve**.

```frees
HydraulicSupply supply(P=1100000)
HydraulicOrifice restriction(CdA=1e-5, rho=850)
HydraulicTank tank(P=100000)
connect(supply.out, restriction.in)
connect(restriction.out, tank.port)
mass_flow = restriction.in.mdot
volume_flow = mass_flow / 850
hydraulic_power = 1000000 * volume_flow
GUESS restriction.in.mdot = 0.4
{ CHECK mass_flow 0.412310562561766 1e-7 }
{ CHECK hydraulic_power 485.071250072666 1e-3 }
```

**Expected:** From ṁ = CdA·√(2ρΔP), mass flow = **0.412311 kg/s**, volume flow = **0.000485071 m³/s** and hydraulic power dissipated = **485.071 W**. The component passes its enthalpy marker through; this model does not calculate oil heating.

**Try:** Halve CdA. Flow and dissipated hydraulic power halve at the same pressure drop.

## 4. Air supply through a sonic restriction

An ideal pressure regulator supplies air at 700 kPa absolute and 293.15 K through a restriction to a 100 kPa atmosphere. Use sonic conductance C = 10⁻⁸ m³/(s·Pa) and critical pressure ratio b = 0.35. This is an adaptation of a regulator-and-orifice pneumatic circuit, demonstrating `PneumaticOrifice` and `PneumaticAtmosphere`.

```frees
PneumaticSupply supply(fluid$=Air, P=700000, T=293.15)
PneumaticOrifice restriction(fluid$=Air, C=1e-8, b=0.35)
PneumaticAtmosphere atmosphere(P=100000)
connect(supply.out, restriction.in)
connect(restriction.out, atmosphere.port)
pressure_ratio = restriction.out.P / restriction.in.P
mass_flow = restriction.in.mdot
{ CHECK pressure_ratio 0.142857142857143 1e-9 }
{ CHECK mass_flow 0.008295 1e-7 }
```

**Expected:** The downstream/upstream ratio is **0.142857**, below b, so the restriction is choked and mass flow is **0.008295 kg/s**. Lowering outlet pressure further should not increase flow at fixed supply state.

**Try:** Raise atmospheric-port pressure to 500 kPa to enter the subsonic branch, then compare mass flow.

## 5. Damped actuator motion

Approximate the diaphragm pressure force as an ideal 35.48 N step. Retain the 0.1 kg moving mass and 1,330 N/m spring; add a chosen damping coefficient of 23.065125 N·s/m, approximately critical damping. This isolates the mechanical response from gas filling. Run with **Solve** and inspect the dynamic table. It demonstrates `ForceSource`, `TransMass`, `TransDamper` and `TransSpring`.

```frees
ForceSource drive(F=35.48)
TransMass moving(m=0.1, v0=0)
TransSpring spring(k=1330, x0=0)
TransDamper damper(c=23.0651251893416)
TransGround ground()
connect(drive.a, moving.port, spring.a, damper.a)
connect(drive.b, spring.b, damper.b, ground.port)
DYNAMIC motion(method=ode45, time=0..0.2, points=101)
END
final_stroke = FinalValue('spring.x')
{ CHECK final_stroke 0.0266766917 1e-6 }
```

**Expected:** Natural angular frequency √(k/m) ≈ **115.326 rad/s**. The displacement approaches **26.6767 mm** without overshoot; at 0.2 s it is within 1 μm of equilibrium. The mechanical response is much faster than a filling-limited actuator can be.

**Try:** Halve damping and look for overshoot. Do not use this mechanical-only result as the complete pneumatic response.

## 6. Reduction gear driving a viscous load

Adapt the mechanical power balance to an ideal 3:1 reduction gear. Apply 12 N·m at the input and use an output damper of 0.6 N·m·s/rad. This demonstrates `TorqueSource`, `Gear`, `RotationalDamper` and `MechGround`. Run with **Solve**.

```frees
TorqueSource drive(T=12)
Gear gear(ratio=3)
RotationalDamper load(c=0.6)
MechGround ground()
connect(drive.a, gear.in)
connect(gear.out, load.a)
connect(drive.b, load.b, ground.port)
input_speed = gear.in.w
output_speed = gear.out.w
load_power = load.a.tau * load.a.w
{ CHECK input_speed 180 1e-6 }
{ CHECK output_speed 60 1e-6 }
{ CHECK load_power 2160 1e-4 }
```

**Expected:** Output torque magnitude = **36 N·m**, output speed = **60 rad/s**, input speed = **180 rad/s**, and transmitted power = **2,160 W**. Port torque signs follow power-flow conventions.

**Try:** Double the load damping. Both speeds halve while torque remains unchanged.

## 7. PI temperature regulation of a thermal mass

Extend a lumped heating model with ideal proportional-integral regulation. A body with heat capacity 5,000 J/K loses heat through a 20 W/K path to a 300 K environment. Set its target to 350 K. This demonstrates the previously uncovered `PIThermostat` component. The ideal controller has no heater saturation or anti-windup.

```frees
PIThermostat controller(Kp=100, Ki=0.5, Tref=350)
ThermalMass body(C=5000, T0=300)
Conduction wall(k=2, area=1, L=0.1)
ThermalSource ambient(T=300)
connect(controller.port, body.port, wall.a)
connect(wall.b, ambient.port)
DYNAMIC heating(method=ode45, time=0..2000, points=201)
END
final_temperature = FinalValue('body.port.t')
final_heat = -FinalValue('controller.port.qdot')
{ CHECK final_temperature 350 0.02 }
{ CHECK final_heat 1000 0.5 }
```

**Expected:** Temperature approaches **350 K**, with **1,000 W** supplied to offset the wall loss. The expected equilibrium follows 20·(350−300).

**Try:** Increase wall conductance. Temperature should still reach the setpoint, but required heater power rises.

## 8. Heat loss through a glazed opening

A 0.75 m × 1.2 m pane separates air at 293.15 K and 273.15 K. Use 3 mm glass thickness, conductivity 0.81 W/(m·K), and chosen film coefficients 8 and 25 W/(m²·K). Treat convection and conduction as series resistances; radiation and frame leakage are omitted. Run with **Solve**.

```frees
ThermalSource inside(T=293.15)
Convection inner_film(htc=8, area=0.9)
Conduction glass(k=0.81, area=0.9, L=0.003)
Convection outer_film(htc=25, area=0.9)
ThermalSource outside(T=273.15)
connect(inside.port, inner_film.a)
connect(inner_film.b, glass.a)
connect(glass.b, outer_film.a)
connect(outer_film.b, outside.port)
heat_loss = glass.Q
resistance = 1/(8*0.9) + 0.003/(0.81*0.9) + 1/(25*0.9)
expected_heat = 20/resistance
balance_error = heat_loss - expected_heat
{ CHECK balance_error 0 1e-7 }
```

**Expected:** Area is **0.9 m²**. Heat loss is approximately **106.70 W**, and `balance_error` is zero within 10⁻⁷ W. Omitting the air films would greatly overestimate heat loss.

**Try:** Double glass thickness, then halve the inner film coefficient. Compare which change affects heat loss more.

## 9. Remove drift and smooth a sampled sensor trace

Adapt a sampled thermal measurement into a short deterministic signal. The eight values are synthetic test data in kelvin above a reference temperature, sampled every second. This demonstrates `Detrend`, `Smooth` and `Window`. Run with **Solve**.

```frees
trace = [1, 3, 2, 6, 4, 9, 5, 12]
CALL Detrend(trace : detrended)
CALL Detrend(trace, 'constant' : centered)
CALL Smooth(trace, 3 : smoothed)
CALL Window(detrended[1:8], 'hann' : tapered)
centered_mean = sum(centered[1:8])/8
residual_mean = sum(detrended[1:8])/8
left_edge = smoothed[1]
{ CHECK centered_mean 0 1e-9 }
{ CHECK residual_mean 0 1e-9 }
{ CHECK left_edge 2 1e-9 }
{ CHECK tapered[1] 0 1e-9 }
{ CHECK tapered[8] 0 1e-9 }
```

**Expected:** Both detrended sequences have zero mean; linear detrending also removes the least-squares slope. The three-point smoother averages only available samples at the ends, so its first result is **2**. The symmetric Hann window closes both ends to zero.

**Try:** Add 100 to every sample. The detrended and centered signals should remain unchanged.

## 10. Recover a vibration tone and check spectral power

Use a synthetic 4 Hz vibration signal sampled at 32 Hz with RMS amplitude 1. The explicit 32-point sequence contains four periods. This frequency-response adaptation demonstrates `FFT`, `IFFT` and `Welch`; it creates every required input. Run with **Solve**. Plot frequency against PSD using the included plot.

```frees
signal = [0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1,0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1,0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1,0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1]
imaginary = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
CALL FFT(signal, imaginary : spectrum_real, spectrum_imag)
CALL IFFT(spectrum_real[1:32], spectrum_imag[1:32] : recovered, recovered_imag)
CALL Welch(signal, 32, 16 : frequency, psd)
power = sum(psd[1:9])*(frequency[2]-frequency[1])
reconstruction_error = recovered[3]-signal[3]
tone_peak = peakindex(1, 0, 0, psd[1:9])
PLOT 'Vibration power spectrum'
 kind = xy
 x = frequency
 y = psd
 xlabel = 'Frequency [Hz]'
 ylabel = 'Power density [amplitude squared per Hz]'
END
{ CHECK frequency[3] 4 1e-9 }
{ CHECK tone_peak 3 1e-9 }
{ CHECK power 1 0.01 }
{ CHECK reconstruction_error 0 1e-9 }
```

**Expected:** The PSD maximum is at **4 Hz**, integrated PSD is **1 ± 0.01**, and inverse transformation reconstructs the samples within numerical precision. The segment length gives 2 Hz frequency spacing. The power expectation applies to this zero-mean, bin-aligned test signal.

**Try:** Change the Welch segment length from 16 to 32. Frequency spacing becomes 1 Hz.

## 11. Causal filtering, zero-phase filtering and convolution

Interpret a two-tap average as a simple sensor filter. The data and coefficients are complete synthetic inputs. This demonstrates `Filter`, `FiltFilt` and `Convolve`. Run with **Solve**.

```frees
samples = [0, 0, 0, 1, 0, 0, 0]
b = [0.5, 0.5]
a = [1]
CALL Filter(b, a, samples : causal)
CALL FiltFilt(b, a, samples : zero_phase)
CALL Convolve(samples, b : full_response)
symmetry_error = zero_phase[3]-zero_phase[5]
{ CHECK causal[4] 0.5 1e-9 }
{ CHECK causal[5] 0.5 1e-9 }
{ CHECK full_response[8] 0 1e-9 }
{ CHECK symmetry_error 0 1e-9 }
```

**Expected:** The causal filter splits the impulse across samples 4 and 5. Full convolution has **8 samples**, including the final run-out sample. Forward-backward filtering is symmetric around the central impulse and squares the filter magnitude response; it is not a real-time causal operation.

**Try:** Replace the impulse with a constant signal and inspect boundary behavior separately from the interior.

## 12. Measure transport delay and detect peaks

Two sensors observe the same pulse one sample apart, with a 0.1 s sample interval. Here `late` is explicitly the delayed trace. This demonstrates `XCorr`, `peakcount` and `peakindex`. Run with **Solve**.

```frees
late = [0, 0, 1, 2, 1, 0, 0]
early = [0, 1, 2, 1, 0, 0, 0]
CALL XCorr(late, early : correlation)
peak_position = peakindex(1, 0, 0, correlation[1:13])
lag_samples = peak_position - 7
delay_seconds = 0.1*lag_samples
pulses = [0, 3, 0, 0, 5, 0, 0, 2, 0]
count = peakcount(0, 0, pulses)
{ CHECK lag_samples 1 1e-9 }
{ CHECK delay_seconds 0.1 1e-9 }
{ CHECK count 3 1e-9 }
```

**Expected:** The correlation peak is at element **8**, one element to the right of zero lag at element 7. With these argument definitions, `late` **lags** `early` by **0.1 s**. The separate pulse trace contains **3** strict local maxima.

**Try:** Swap the correlation arguments. The reported lag changes sign.

## 13. Correlated temperature measurements in heat-loss estimation

Extend the thermal-resistance calculation with measurement uncertainty. Two sensors share a positive calibration error, so their temperature difference is less uncertain than if the errors were independent. Treat conductance as exactly 10 W/K and use sensor standard deviations 0.2 K and 0.3 K, with correlation 0.5. Run with **Solve**.

```frees
inside_temp = 293.15
outside_temp = 273.15
heat_loss = 10*(inside_temp-outside_temp)
UncertaintyOf(inside_temp) = 0.2
UncertaintyOf(outside_temp) = 0.3
Correlation(inside_temp, outside_temp) = 0.5
heat_sigma = UncertaintyOf(heat_loss)
{ CHECK heat_loss 200 1e-8 }
{ CHECK heat_sigma 2.64575131106459 1e-7 }
```

**Expected:** Heat loss = **200 W**. Its standard uncertainty is 10√(0.2²+0.3²−2·0.5·0.2·0.3) = **2.64575 W**. The negative cross term comes from subtraction of the sensor readings.

**Try:** Set correlation to zero. Standard uncertainty rises to **3.60555 W**; at correlation 1 it falls to **1 W**.

## 14. Uniform dimensional tolerance and propagated spread

Treat diaphragm area as uniformly distributed over ±10% of its nominal value, with pressure rise fixed at 20 kPa. This is a deliberately broad synthetic tolerance for teaching, not a manufacturing specification. Run with **Solve** for first-order uncertainty; a Monte Carlo request follows in the analysis exercises.

```frees
area = 0.001774
force = 20000*area
DistributionOf(area) = Uniform(0.0015966, 0.0019514)
force_sigma = UncertaintyOf(force)
{ CHECK force 35.48 1e-8 }
{ CHECK force_sigma 2.048438755 1e-7 }
```

**Expected:** Mean/nominal force = **35.48 N**. The uniform force range is **31.932–39.028 N** and its standard deviation is range/√12 ≈ **2.04844 N**. The first-order result is exact because force is linear in area.

**Try:** Halve the area tolerance. The standard deviation halves, while nominal force is unchanged.

## 15. Tank inventory from uncertain measurements

Estimate gas inventory using a deliberately ideal-gas model with R = 208.1 J/(kg·K). Pressure is 934 kPa absolute, volume 0.010 m³ and temperature 295.45 K. Treat the supplied uncertainty magnitudes as independent one-standard-deviation values for this exercise. This demonstrates first-order uncertainty on a nonlinear engineering calculation. Run with **Solve**.

```frees
pressure = 934000
volume = 0.010
temperature = 295.45
mass = pressure*volume/(208.1*temperature)
UncertaintyOf(pressure) = 22000
UncertaintyOf(volume) = 0.0004
UncertaintyOf(temperature) = 1.2
mass_sigma = UncertaintyOf(mass)
{ CHECK mass 0.151911552344956 1e-9 }
{ CHECK mass_sigma 0.00707868056268796 1e-8 }
```

**Expected:** Mass ≈ **0.151912 kg**, standard uncertainty ≈ **0.007079 kg**. Volume uncertainty contributes the largest share. This result does not include real-gas model error.

**Try:** Add `Correlation(pressure, temperature) = 0.5`. Because mass increases with pressure but decreases with temperature, positive correlation reduces the propagated variance.

## Analysis exercises

The following `json` blocks are complete requests wrapped with an `operation` name and numerical `checks` for the verification recipe below. They are **not equation-editor input**. The recipe calls the compiled WASM functions directly. The standard browser Monte Carlo dialog accepts sample count and seed, but the current browser does not expose all sampling options, weighted calibration diagnostics or global sensitivity. No additional browser buttons are assumed here. Each sampling request also registers its uncertain inputs in `variableInfo`: the current analysis boundary requires this even when `DistributionOf` appears in the model. Bounds and standard deviations match the declared distributions.

## 16. Stratified Monte Carlo for actuator force

Continue the uniform-area tolerance model. Use 256 Latin-hypercube samples and seed 42. The force is monotonic in area, so its exact 5th, 50th and 95th percentiles are 32.2868 N, 35.48 N and 38.6732 N. Finite-sample quantiles are approximate.

```json
{
  "operation": "monte_carlo",
  "request": {
    "samples": 256,
    "seed": 42,
    "design": "lhs",
    "variableInfo": [
      {
        "name": "area",
        "guess": 0.001774,
        "lower": 0.0015966,
        "upper": 0.0019514,
        "uncertainty": 0.00010242193775423962
      }
    ]
  },
  "checks": [
    {
      "path": "failedSamples",
      "value": 0,
      "tolerance": 0
    },
    {
      "path": "requestedSamples",
      "value": 256,
      "tolerance": 0
    },
    {
      "path": "stats.0.mean",
      "value": 35.48,
      "tolerance": 0.02
    },
    {
      "path": "stats.0.sigma",
      "value": 2.048438754,
      "tolerance": 0.02
    },
    {
      "path": "stats.0.p5",
      "value": 32.2868,
      "tolerance": 0.04
    },
    {
      "path": "stats.0.p95",
      "value": 38.6732,
      "tolerance": 0.04
    }
  ],
  "text": "area = 0.001774\nforce = 20000*area\nDistributionOf(area) = Uniform(0.0015966, 0.0019514)\n"
}
```

**Expected:** No failed samples. Force mean is approximately **35.48 N**, standard deviation **2.04844 N**, and percentiles are close to the analytic values above. Stratified samples do not support an ordinary IID standard-error claim.

**Try:** Change the seed, then compare with `design: "random"` at the same sample count.

## 17. Weighted dynamic calibration of a cooling body

Adapt the lumped cooling equation dT/dt = −k(T−Tamb) into a parameter-estimation exercise. The synthetic dataset is generated with k = 0.05 s⁻¹, Tamb = 293.15 K and initial temperature 368.15 K. Start the fit from k = 0.2 s⁻¹. The assumed measurement standard deviations rise from 0.2 K to 0.8 K; residuals are divided by these values before minimization. The `sigma` entries are standard deviations, not inverse-variance weights.

```json
{
  "operation": "parameter_fit",
  "request": {
    "text": "k = 0.2\nambient = 293.15\nDYNAMIC cooling(method=ode45, time=0..60, points=61)\n der(Temp) = -k*(Temp-ambient)\n Temp(0) = 368.15\nEND\n",
    "parameters": [
      "k"
    ],
    "initial": [
      0.2
    ],
    "lower": [
      0.001
    ],
    "upper": [
      1.0
    ],
    "odeBlock": "cooling",
    "column": "temp",
    "measuredT": [
      0,
      5,
      10,
      15,
      20,
      25,
      30,
      35,
      40,
      45,
      50,
      55,
      60
    ],
    "measuredV": [
      368.15,
      351.56005873,
      338.639799478,
      328.577491456,
      320.740958088,
      314.637859765,
      309.884762011,
      306.183045759,
      303.300146243,
      301.054941842,
      299.306374897,
      297.944589591,
      296.884030128
    ],
    "sigma": [
      0.2,
      0.25,
      0.3,
      0.35,
      0.4,
      0.45,
      0.5,
      0.55,
      0.6,
      0.65,
      0.7,
      0.75,
      0.8
    ],
    "loss": "linear",
    "fScale": 1,
    "maxEvaluations": 200
  },
  "checks": [
    {
      "path": "fittedValues.0",
      "value": 0.05,
      "tolerance": 0.0001
    },
    {
      "path": "rmse",
      "value": 0,
      "tolerance": 0.01
    },
    {
      "path": "residualDof",
      "value": 12,
      "tolerance": 0
    },
    {
      "path": "rank",
      "value": 1,
      "tolerance": 0
    }
  ]
}
```

**Expected:** Fitted k = **0.05 ± 0.0001 s⁻¹**, time constant ≈ **20 s**, and RMSE below **0.01 K**. Residual degrees of freedom are 13−1 = **12**, and the single parameter should have full rank. Very small residuals are expected because the dataset is synthetic and noise-free; they are not evidence of real measurement precision.

**Try:** Increase the temperature at 30 s by 10 K, rerun with linear loss, then switch to `loss: "huber"`. Compare fitted k and residuals. Robust fitting downweights large standardized residuals; it does not correct a wrong physical model.

## 18. Global sensitivity of heat loss

Extend the window heat-loss model to uncertain independent indoor and outdoor temperatures. Use a chosen fixed conductance of 10 W/K, uniform indoor variation of ±1 K and outdoor variation of ±2 K. The model is linear and additive, giving an analytic check for the global variance decomposition. This is a variance-based adaptation, not a local normalized derivative calculation. Read the indices for `heat_deviation`, which subtracts the nominal 200 W: a constant offset does not change true sensitivity indices, and centering avoids unnecessary finite-sample error from a large output mean.

```json
{
  "operation": "sensitivity",
  "request": {
    "method": "sobol",
    "samples": 1024,
    "design": "sobol",
    "bootstrap": 64,
    "seed": 42,
    "variableInfo": [
      {
        "name": "inside_temp",
        "guess": 293.15,
        "lower": 292.15,
        "upper": 294.15,
        "uncertainty": 0.5773502691896258
      },
      {
        "name": "outside_temp",
        "guess": 273.15,
        "lower": 271.15,
        "upper": 275.15,
        "uncertainty": 1.1547005383792517
      }
    ]
  },
  "checks": [
    {
      "path": "outputs.0.indices.0.firstOrder",
      "value": 0.2,
      "tolerance": 0.03
    },
    {
      "path": "outputs.0.indices.0.total",
      "value": 0.2,
      "tolerance": 0.03
    },
    {
      "path": "outputs.0.indices.1.firstOrder",
      "value": 0.8,
      "tolerance": 0.03
    },
    {
      "path": "outputs.0.indices.1.total",
      "value": 0.8,
      "tolerance": 0.03
    }
  ],
  "text": "inside_temp = 293.15\noutside_temp = 273.15\nheat_loss = 10*(inside_temp-outside_temp)\nheat_deviation = heat_loss-200\nDistributionOf(inside_temp) = Uniform(292.15, 294.15)\nDistributionOf(outside_temp) = Uniform(271.15, 275.15)\n"
}
```

**Expected:** Indoor variance contribution = 100/3 W²; outdoor contribution = 400/3 W². First-order and total-order indices should each be approximately **0.20 indoors** and **0.80 outdoors**, with no interaction. Compare within **0.03**, allowing sampling error. Bootstrap uncertainty describes index-estimation variability, not uncertainty in the physical assumptions.

**Try:** Make both temperature ranges ±1 K. The two variance shares become 0.5. Add a nonzero input correlation only as an error-recovery exercise: the current independent-input sensitivity method should refuse it.

## 19. Screen the same inputs with elementary effects

Reuse the heat-loss model to compare the strength and nonlinearity of each input over its full range. This method perturbs coordinates scaled to [0,1], so its effects include the input range rather than reporting only ∂Q/∂T.

```json
{
  "operation": "sensitivity",
  "request": {
    "method": "morris",
    "trajectories": 20,
    "levels": 6,
    "seed": 42,
    "variableInfo": [
      {
        "name": "inside_temp",
        "guess": 293.15,
        "lower": 292.15,
        "upper": 294.15,
        "uncertainty": 0.5773502691896258
      },
      {
        "name": "outside_temp",
        "guess": 273.15,
        "lower": 271.15,
        "upper": 275.15,
        "uncertainty": 1.1547005383792517
      }
    ]
  },
  "checks": [
    {
      "path": "outputs.0.effects.0.mu",
      "value": 20,
      "tolerance": 1e-06
    },
    {
      "path": "outputs.0.effects.1.mu",
      "value": -40,
      "tolerance": 1e-06
    },
    {
      "path": "outputs.0.effects.0.sigma",
      "value": 0,
      "tolerance": 1e-06
    },
    {
      "path": "outputs.0.effects.1.sigma",
      "value": 0,
      "tolerance": 1e-06
    }
  ],
  "text": "inside_temp = 293.15\noutside_temp = 273.15\nheat_loss = 10*(inside_temp-outside_temp)\nheat_deviation = heat_loss-200\nDistributionOf(inside_temp) = Uniform(292.15, 294.15)\nDistributionOf(outside_temp) = Uniform(271.15, 275.15)\n"
}
```

**Expected:** Indoor mean elementary effect ≈ **+20 W**, outdoor ≈ **−40 W**; their absolute means are **20 W** and **40 W**. The elementary-effect standard deviations should be approximately zero because the model is linear and additive.

**Try:** Add a temperature-dependent conductance and observe whether nonzero elementary-effect spread reveals nonlinearity or interaction.

## Run every numerical check

From the repository root, run the following command. It needs the existing compiled module at `web/src/wasm/pkg/frees_bg.wasm` and its matching JavaScript wrapper. It executes the actual models and analysis requests above; it does not scrape expected outputs from a separate fixture. It stops on any solver error, incomplete analysis or failed numerical assertion. Validated on 11 September 2026: **19 examples and 55 numerical assertions passed** through the compiled module; all **15 equation models** also passed the native engine checks. This checks computation, not browser plot rendering.

```sh
node --input-type=module <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as engine from './web/src/wasm/pkg/frees.js';
engine.initSync({module: fs.readFileSync('web/src/wasm/pkg/frees_bg.wasm')});
const markdown = fs.readFileSync('reports/MISSING_EXAMPLES.md', 'utf8');
let examples = 0, assertions = 0;
function near(actual, expected, tolerance, label) {
  assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${label}: got ${actual}, expected ${expected} ± ${tolerance}`);
  assertions++;
}
for (const [, model] of markdown.matchAll(/```frees\n([\s\S]*?)\n```/g)) {
  const result = JSON.parse(engine.solve(model, '{}'));
  assert.equal(result.success, true, result.error ?? 'Solve failed');
  const values = Object.fromEntries(result.variables.map(v => [v.name.toLowerCase(), v.value]));
  for (const [, name, expected, tolerance] of model.matchAll(/\{ CHECK (\S+) (\S+) (\S+) \}/g)) {
    near(values[name.toLowerCase()], Number(expected), Number(tolerance), name);
  }
  examples++;
}
for (const [, block] of markdown.matchAll(/```json\n([\s\S]*?)\n```/g)) {
  const {operation, text, request, checks} = JSON.parse(block);
  assert(['monte_carlo', 'parameter_fit', 'sensitivity'].includes(operation));
  const payload = JSON.stringify(request);
  const result = JSON.parse(operation === 'parameter_fit'
    ? engine.parameter_fit(payload) : engine[operation](text, payload));
  assert(!result.error, result.error);
  assert(result.success !== false && result.truncated !== true, 'Incomplete analysis');
  assert(result.diagnostics?.complete !== false, 'Incomplete sensitivity design');
  assert(result.diagnostics?.designComplete !== false, 'Incomplete sampling design');
  if (operation === 'monte_carlo') assert.equal(result.stats[0].variable, 'force');
  if (operation === 'sensitivity') {
    assert.equal(result.outputs[0].variable, 'heat_deviation');
    const entries = result.outputs[0].indices ?? result.outputs[0].effects;
    assert.deepEqual(entries.map(x => x.source), ['inside_temp', 'outside_temp']);
  }
  for (const {path, value, tolerance} of checks) {
    const actual = path.split('.').reduce((object, key) => object?.[key], result);
    near(actual, value, tolerance, `${operation}.${path}`);
  }
  examples++;
}
console.log(`${examples} examples passed; ${assertions} numerical assertions passed.`);
JS
```
