// Curated, ready-to-solve example documents surfaced to new users (the File
// menu "Open Example", the command palette, and the empty Solution-panel
// shortcuts). Each `text` has been verified against the backend with zero unit
// warnings. Algebraic and ODE (Integral) examples solve directly with Solve
// (F2); the PARAMETRIC time-sweep examples are intentionally underspecified by
// the swept column and are run from the Tables tab via "Solve Table" — each
// example's own header comment says which.
import { EV_THERMAL_EXAMPLE_TEXT } from './defaultExample'

export interface Example {
  id: string
  title: string
  /** One-line summary shown under the title in the picker. */
  description: string
  /** Grouping label in the picker. */
  category: string
  /** The full editor document (markdown notes + equations). */
  text: string
  /** Featured examples are shown in the "Open an Example" picker; the rest live
   *  in Help → Engineering Examples Library to keep the picker focused. */
  featured?: boolean
}

export const EXAMPLES: Example[] = [
  {
    id: 'ideal-gas',
    title: 'Ideal Gas Law',
    description: 'Mass of air in a rigid tank — note the implicit equation.',
    category: 'Thermodynamics',
    featured: true,
    text: `// Ideal Gas Law
{ Mass of air in a rigid tank. Note the implicit equation:
  you do not have to write "m = ...". }
P = 500 [kPa]
Vol = 0.05 [m^3]
T = 25 [C]
R = 0.287 [kJ/kg-K]    { gas constant for air }
P * Vol = m * R * T    { ideal gas equation }

{ Convert(From, To) is the factor between two units of one dimension, so
  m_g is the number of grams, and it is labelled [g]. }
m_g = m * Convert(kg, g)

{ After Solve, open the REPL and ask for m_g: it answers 292.162 [g]. }

{ CHECK m 0.2921617103380253 3e-10 }
{ CHECK m_g 292.1617103380253 3e-7 }`,
  },
  {
    id: 'linear-regression-diagnostics',
    title: 'Linear regression with diagnostics',
    description: 'Slope, intercept, standard error and correlation of seven points.',
    category: 'Data & Analysis',
    featured: true,
    text: `{ Least-squares line through seven points, with the standard error of the
  estimate s_y/x = sqrt(S_r / (n - 2)) and the correlation coefficient.
  Data and published answers: Chapra & Canale, Numerical Methods for
  Engineers, Examples 17.1-17.2 (a1 = 0.8392857, a0 = 0.07142857,
  s_y/x = 0.7735, r = 0.932). The original problem's data was not kept. }
{ The same seven points as a table, for the Curve Fit dialog. After Check,
  open Tools > Curve Fit, choose 'Select from table' and regression_data,
  pick the Linear template (y = a * x + b) and press Fit: a and b come out
  as the a_1 and a_0 solved below. }
TABLE regression_data(x)
  1   0.5
  2   2.5
  3   2.0
  4   4.0
  5   3.5
  6   6.0
  7   5.5
END
y_table_4 = regression_data(4)     { the table is callable: y at x = 4 }
x = [1, 2, 3, 4, 5, 6, 7]
y = [0.5, 2.5, 2.0, 4.0, 3.5, 6.0, 5.5]
[a_1, a_0, r_sq] = linfit(x, y)
r = pearson([1, 2, 3, 4, 5, 6, 7], [0.5, 2.5, 2.0, 4.0, 3.5, 6.0, 5.5])
r_cc = corrcoef([1, 2, 3, 4, 5, 6, 7], [0.5, 2.5, 2.0, 4.0, 3.5, 6.0, 5.5])
n = 7
FOR i = 1 TO 7
  e2[i] = (y[i] - (a_0 + a_1 * x[i]))^2
END
S_r = sum(e2[1:7])
s_yx = sqrt(S_r / (n - 2))
{ CHECK a_1 0.839285714285714 1e-12 }
{ CHECK a_0 0.0714285714285714 1e-12 }
{ CHECK r_sq 0.868317610062893 1e-12 }
{ CHECK r 0.931835613218819 1e-12 }
{ CHECK S_r 2.99107142857143 1e-10 }
{ CHECK s_yx 0.773443136703847 1e-10 }
{ CHECK y_table_4 4 1e-12 }`,
  },
  {
    id: 'pump-valve-operating-point',
    title: 'Pump, pipe and throttling valve: the operating point',
    description: 'Solve, then open the Schematic and click P1 or V1: each card draws its curve and the point it runs at.',
    category: 'Fluids & Fluid Power',
    featured: true,
    text: `// frees-language: 2
{ A centrifugal pump lifts water from one open tank to another at the same
  level through 120 m of 80 mm steel pipe and a control valve. The pump runs
  where its head curve meets the system: the pipe's friction and the valve's
  drop, both growing with the flow. Closing the valve steepens the system
  curve and moves the point up the pump curve, to less flow at more head.

  The head curve is the manufacturer's table; the valve passes
  m_dot*|m_dot| = (u*Cv)^2*rho*dP at opening u.

  On the Schematic, click P1 for the pump curve with the operating point on
  it, or V1 for the valve's drop at the present opening. Pin u_v as a slider
  and move it: the valve's curve and both points follow.

  Source: Y. A. Cengel and J. M. Cimbala, Fluid Mechanics, 4th ed.,
  McGraw-Hill, 2018, Sec. 14-2 (matching a pump to a piping system). }

TABLE pump_head(Q [m^3/s]) [m]
  0       32
  0.005   31
  0.010   28
  0.015   23
  0.020   16
  0.025   7
END

rho = 998 [kg/m^3]
u_v = 0.6 [-] { valve opening }

PumpMap P1(a, b, rho=rho, map$=pump_head)
Duct    L1(b, c, rho=rho, mu=1.0e-3 [Pa-s], L=120 [m], D=0.08 [m], rough=4.5e-5 [m])
Valve   V1(c, d, Cv=0.0015 [m^2], rho=rho, u=u_v, model$=linear)
Sink    TANK(d) { the upper tank }

a.P = 101325 [Pa] { both tanks open to the atmosphere }
d.P = 101325 [Pa]
c.h = 100000 [J/kg] { water near 24 C; nothing here changes it }

Q_op = P1.q    { operating flow, m^3/s }
H_op = P1.head { operating head, m }
dP_valve = c.P - d.P

{ CHECK Q_op 0.0119058453909063 1e-9 }
{ CHECK H_op 26.0941546090937 1e-7 }
{ CHECK dP_valve 174648.958226199 1e-3 }`,
  },
  {
    id: 'rankine-cycle',
    title: 'Rankine Cycle',
    description: 'Ideal steam power cycle efficiency using real-water properties.',
    category: 'Thermodynamics',
    featured: true,
    text: `// Rankine Cycle (Steam)
{ Ideal steam Rankine cycle using real-water properties. }
P_boiler = 8000 [kPa]
P_cond = 10 [kPa]

{ States 1-4 are numbered so the T-s plot below finds P, T, h and s at each }
P1 = P_cond
P2 = P_boiler
P3 = P_boiler
P4 = P_cond

{ State 1: saturated liquid leaving the condenser }
h1 = Enthalpy(Water, P=P1, x=0)
v1 = Volume(Water, P=P1, x=0)

{ Pump (state 1 -> 2) }
w_pump = v1 * (P2 - P1)
h2 = h1 + w_pump

{ State 3: boiler exit (superheated) }
h3 = Enthalpy(Water, P=P3, T=480 [C])
s3 = Entropy(Water, P=P3, T=480 [C])

{ State 4: turbine exit (isentropic, s4 = s3) }
h4 = Enthalpy(Water, P=P4, s=s3)
x4 = Quality(Water, P=P4, h=h4)

{ Temperature and entropy at every state, for the T-s plot }
T1 = Temperature(Water, P=P1, h=h1)
s1 = Entropy(Water, P=P1, h=h1)
T2 = Temperature(Water, P=P2, h=h2)
s2 = Entropy(Water, P=P2, h=h2)
T3 = Temperature(Water, P=P3, h=h3)
T4 = Temperature(Water, P=P4, h=h4)
s4 = Entropy(Water, P=P4, h=h4)

{ Performance }
q_in = h3 - h2
w_turb = h3 - h4
eta_th = (w_turb - w_pump) / q_in

{ The cycle on a temperature-entropy diagram, in the Plots pane }
PLOT 'Rankine T-s'
  kind = property
  fluid = Water
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END

{ CHECK q_in 3149767.154885827 3.2e-3 }
{ CHECK w_turb 1240252.0387124298 1.3e-3 }
{ CHECK eta_th 0.39119716208990235 4e-10 }
{ CHECK h1 191805.94455888413 2e-1 }
{ CHECK h2 199878.01103599244 2e-1 }
{ CHECK h4 2109393.127209397 3 }
{ CHECK x4 0.8016492114992454 9e-7 }
{ CHECK T1 318.9563289237973 4e-4 }`,
  },
  {
   id: 'hydraulic-metering-restriction',
   "title": "Oil flow through a metering restriction",
    "description": "A 10 bar drop across a CdA = 1e-5 m² orifice passes 0.41 kg/s of oil, 485 W of hydraulic power.",
    "category": "Fluids & Fluid Power",
    "featured": true,
    "text": "HydraulicSupply supply(P=1100000 [Pa])\nHydraulicOrifice restriction(CdA=1e-5 [m^2], rho=850 [kg/m^3])\nHydraulicTank tank(P=100000 [Pa])\nconnect(supply.out, restriction.in)\nconnect(restriction.out, tank.port)\nmass_flow = restriction.in.mdot\nvolume_flow = mass_flow / 850 [kg/m^3]\nhydraulic_power = 1000000 [Pa] * volume_flow\nGUESS restriction.in.mdot = 0.4\n{ CHECK mass_flow 0.412310562561766 1e-7 }\n{ CHECK hydraulic_power 485.071250072666 1e-3 }"
  },
  {
    id: 'tank-draining',
    title: 'Tank Draining (ODE)',
    description: 'First-order ODE via Integral — Torricelli draining of a tank.',
    category: 'Fluids & Fluid Power',
    featured: true,
    text: `// Tank Draining (Torricelli) — first-order ODE
{ Water height h in a tank emptying through a small orifice obeys
  dh/dt = -(a/A)*sqrt(2*g*h).  Press Solve (F2).

  How the ODE is written: frees integrates an ODE only when the
  integrand references the integral's OWN result, and that result
  starts at 0. So we integrate the DROP from the initial level and
  rebuild h = h0 - drop. Integration limits must be constants
  (here 0 to 60 [s]; the unit makes tau, and so drop, come out right). }
g = 9.81 [m/s^2]
A_tank = 1.0 [m^2]        { tank cross-section }
a_orifice = 0.0015 [m^2]  { orifice area }
h0 = 2.0 [m]              { initial water height }

drop = Integral((a_orifice/A_tank)*sqrt(2*g*(h0 - drop)), tau, 0, 60 [s])
h = h0 - drop            { water height after 60 s }

{ CHECK h 1.4759539485188307 1e-10 }
{ CHECK drop 0.5240460514811693 1e-10 }`,
  },
  {
    id: 'sounding-rocket-trajectory',
    title: 'Sounding Rocket Trajectory (loss-accurate)',
    description: 'Coupled h/v/m ODE with drag, burnout and an apogee event; apogee read back via an accessor.',
    category: 'Aerospace & Compressible Flow',
    featured: true,
    text: `// Loss-Accurate Sounding-Rocket Trajectory (DYNAMIC)
{ The coupled multi-state system der(h)=v, der(v)=(F - D - m g)/m, der(m)=-mdot,
  with aerodynamic drag against an exponential atmosphere computed every step as
  an algebraic auxiliary, thrust gated off at burnout via If(), and an apogee
  EVENT (v = 0, falling) that stops the integration. The ODE Table (Tables
  window) plots altitude / velocity / mass vs time, or mass vs altitude.

  The apogee altitude is read back into the analytic solution with MaxValue('h').
  Change t_burn and re-solve to trade burn time for apogee — or, to SIZE the
  rocket, open Variable Settings, give t_burn a guess near 27 and bounds
  [5, 55], add the equation  MaxValue('h') = h_target  and let frees solve for
  the burn time that reaches 100 km. }

g0     = 9.81 [m/s^2]
m0     = 600 [kg]   { lift-off mass }
mdot   = 9 [kg/s]   { propellant mass flow during burn }
F0     = 28000 [N]  { motor thrust }
Cd     = 0.3        { drag coefficient }
A      = 0.03 [m^2] { reference area }
rho0   = 1.225 [kg/m^3] { sea-level air density }
Hscale = 8000 [m]   { atmospheric scale height }
t_burn = 27 [s]     { motor burn time }

DYNAMIC ascent (method = ode45, time = 0 .. 600, points = 500, rtol = 1e-7, atol = 1e-3)
  thrust = If(time, t_burn, F0, F0, 0)         { thrust on until burnout }
  mflow  = If(time, t_burn, mdot, mdot, 0)     { mass flow on until burnout }
  rho    = rho0 * exp(-h / Hscale)             { exponential atmosphere }
  drag   = 0.5 * rho * v * v * Cd * A          { aerodynamic drag }
  der(h) = v
  der(v) = (thrust - drag - m * g0) / m
  der(m) = -mflow
  h(0) = 0 [m]
  v(0) = 0 [m/s]
  m(0) = m0
  EVENT apogee: v = 0 | falling -> stop        { stop at the top of the arc }
END

{ Read the trajectory back into the analytic solution }
apogee = MaxValue('h') * 1 [m]     { peak altitude reached }
v_burnout = ODEValue('v', t_burn) * 1 [m/s]    { speed at burnout }
m_final   = FinalValue('m') * 1 [kg]          { burnout / coasting mass }

{ CHECK apogee 98571.74729819218 1e-4 }
{ CHECK v_burnout 1292.4475052767484 1.3e-6 }
{ CHECK m_final 357.00041513103366 3.6e-7 }`,
  },
  {
    id: 'projectile-trajectory',
    title: 'Projectile Trajectory (table)',
    description: 'Parametric time sweep — full flight path sampled over time.',
    category: 'Mechanics',
    featured: true,
    text: `// Projectile Trajectory (parametric time sweep)
{ The whole flight path, sampled in time. This uses a PARAMETRIC
  table: the base system is underspecified by one on purpose, t
  being the swept column the table fills in, so Solve opens the
  table and runs it (Solve Table in the Tables tab does the same).

  Variables listed in the header with no range (time, x, y, vx, vy,
  v) become solved OUTPUT columns. Afterward, chart y vs x (the arc)
  or y vs time in the Plots tab. }
g  = 9.81 [m/s^2]
v0 = 20 [m/s]
theta = 35 * pi# / 180

vx0 = v0 * cos(theta)
vy0 = v0 * sin(theta)

time = t * 1 [s]                 { give the swept index t units of seconds }
x  = vx0 * time                 { horizontal position }
y  = vy0 * time - 0.5*g*time^2  { vertical position }
vx = vx0                        { dx/dt }
vy = vy0 - g*time               { dy/dt }
v  = sqrt(vx^2 + vy^2)          { speed }

PARAMETRIC trajectory (t, time, x, y, vx, vy, v)
  t = 0:0.05:4
END

{ Graded on the table's last row, t = 4 s, below the launch height. }
{ CHECK x 65.5321635431193 1e-10 }
{ CHECK y -32.5938850919163 1e-10 }
{ CHECK v 32.2411542210169 1e-10 }`,
  },
  {
    id: 'step-impulse-response',
    title: 'Step & Impulse Response',
    description: 'Time-domain analysis of a second-order system: step response, impulse response, and forced response (lsim).',
    category: 'Control Systems',
    featured: true,
    text: `{ Step & Impulse Response Analysis }
{ Second-order system: G(s) = wn^2 / (s^2 + 2*zeta*wn*s + wn^2) }
{ Natural frequency and damping ratio }
wn = 2 [rad/s]
zeta = 0.3

{ Transfer function coefficients (descending powers of s) }
{ num(s) = wn^2,  den(s) = s^2 + 2*zeta*wn*s + wn^2 }
num = [wn^2]
den = [1, 2*zeta*wn, wn^2]

{ 1. Unit Step Response (uses default 10s time vector) }
[y_step, t] = step(num, den)

{ 2. Impulse Response (uses default 10s time vector) }
[y_imp] = impulse(num, den)

{ 3. Forced Response: ramp input u(t) = t }
u = t
[y_ramp] = lsim(num, den, u, t)

{ 4. Stability check: poles of the system }
[pr, pi] = pole(num, den)

PLOT 'Step Response'
  kind = xy
  x = t
  y = y_step
  xlabel = 'Time [s]'
  ylabel = 'Amplitude'
  title = 'Unit Step Response'
END

PLOT 'Impulse Response'
  kind = xy
  x = t
  y = y_imp
  xlabel = 'Time [s]'
  ylabel = 'Amplitude'
  title = 'Impulse Response'
END

PLOT 'Ramp Response (lsim)'
  kind = xy
  x = t
  y = y_ramp
  xlabel = 'Time [s]'
  ylabel = 'Amplitude'
  title = 'Ramp Response via lsim'
END

{ CHECK pr[1] -0.6 6e-10 }
{ CHECK y_step[50] 0.9974089580786609 1e-9 }
{ CHECK y_imp[50] 0.0011808598375713535 1.2e-12 }`,
  },
  {
    id: 'cruise-control',
    title: 'Cruise Control System Design',
    description: 'Models a 1000 kg car with drag, tunes a PI controller, and performs frequency & stability analysis.',
    category: 'Control Systems',
    featured: true,
    text: `// Car Dynamics & Cruise Control
{ This example models a 1000 kg car under viscous drag, converts the state-space model to a transfer function, designs a proportional-integral (PI) controller for a feedback loop, and performs frequency & stability analysis.

  Press Solve (F2). }

m = 1000 [kg]           { car mass }
c_drag = 50 [N-s/m]     { viscous drag coefficient (named c_drag, not c, since
                          names are case-insensitive and C is the output matrix) }

{ State Space Model: states are [position; velocity], input is traction force. }
A[1,1] = 0; A[1,2] = 1
A[2,1] = 0; A[2,2] = -c_drag/m
B[1] = 0
B[2] = 1/m
C[1] = 0; C[2] = 1      { output is velocity }
D = 0.0

{ 1. Convert State Space to Transfer Function }
[num_car, den_car] = ss2tf(A, B, C, D)

{ 2. Design PI Controller: C(s) = Kp + Ki/s = (Kp*s + Ki)/s }
Kp = 800 [N-s/m]
Ki = 40 [N/m]
num_pi = [Kp, Ki]
den_pi = [1.0, 0.0]

{ 3. Open-Loop System: L(s) = C(s) * G(s) }
[num_ol, den_ol] = series(num_pi, den_pi, num_car, den_car)

{ 4. Closed-Loop System: T(s) = L(s) / (1 + L(s)), unity feedback H(s) = 1 }
num_h = [1]
den_h = [1]
[num_cl, den_cl] = feedback(num_ol, den_ol, num_h, den_h)

{ 5. Stability & Frequency Margin Analysis }
[gm, pm, w_cg, w_cp] = margin(num_ol, den_ol)

{ 6. Closed-Loop Poles and Zeros (unity-feedback loop has one finite zero) }
[cl_pr, cl_pi] = pole(num_cl, den_cl)
[cl_zr, cl_zi] = zero(num_cl, den_cl)

{ 7. Frequency sweeps for Bode and Nyquist plots }
omega = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0]
[mag_ol, phase_ol] = bode(num_ol, den_ol, omega)
[real_ol, imag_ol] = nyquist(num_ol, den_ol, omega)

PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag_ol
  phase = phase_ol
END

PLOT 'Nyquist Diagram'
  kind = nyquist
  real = real_ol
  imag = imag_ol
END

PLOT 'Pole-Zero Map'
  kind = polezero
  pr = cl_pr
  pi = cl_pi
  zr = cl_zr
  zi = cl_zi
END

{ CHECK pm 90 9.1e-8 }
{ CHECK w_cg 0.8000059198449195 8.1e-10 }
{ CHECK cl_pr[1] -0.7999999999999994 8e-10 }`,
  },
  {
    id: 'ev-battery-cooling-pid',
    title: 'EV Battery Cooling with Closed-Loop EXV Control',
    description: 'Five domains in one transient solve: pack discharge (electrical) heats the cell thermal state, a coolant loop carries it to an R134a chiller, and a reverse-acting PID on a signal wire modulates the electronic expansion valve to hold the pack at 303 K.',
    category: 'Systems',
    featured: true,
    text: `// Five domains in one solve: electrical (pack discharge) -> heat (cell thermal
// state) -> liquid (coolant loop) -> twophase (R134a chiller) -> signal (PID).
// The PID modulates the electronic expansion valve to hold the pack at 303 K;
// with Ki > 0 the steady error vanishes.
TABLE ocv(soc) [V]
  0   3.0
  1   4.2
END
TABLE dudt(soc) [V/K]
  0   -5e-5
  1   -5e-5
END
BatteryPack   BP(Ns=96, Np=2, ocv$=ocv, dudt$=dudt, R0ref=0.002 [ohm], Tref=298.15 [K], Ea=0 [J/mol], Q0=60, C_th=50000 [J/K], SOC0=0.9, T0=306 [K])
CurrentSource LOAD(I=-60)
Ground        G()
connect(BP.p, LOAD.p)
connect(BP.n, LOAD.n, G.port)

LiquidSource CSRC(fluid$=Water, mdot=0.05, P=200000, T=305)
Chiller      CH(ref$=R134a, cool$=Water, U_tp=2000, U_sh=200, D=0.01, L=5, eps_zone=0.1, UA_cool=600)
LiquidWallHX PLATE(fluid$=Water, UA=500)
LiquidSink   CSNK()
connect(CSRC.out, CH.cool_in)
connect(CH.cool_out, PLATE.in)
connect(PLATE.out, CSNK.in)
connect(PLATE.wall, BP.heat, TB.port)

function [out] = PHSupply(P, h, domain$ = twophase)
  port(out)
  out.P = P
  out.h = h
end
hliq = Enthalpy(R134a, P=1200000, x=0)
PHSupply             RSRC(P=1200000, h=hliq)
EXVCmd               EXV(fluid$=R134a, CdA_max=2e-7 [m^2])
TwoPhasePressureSink RSNK(P=350000)
connect(RSRC.out, EXV.in)
connect(EXV.out, CH.ref_in)
connect(CH.ref_out, RSNK.in)

SigConstant     SP(k=303 [K])
SigThermalProbe TB()
SigPID          PID(model$=clamped, Kp=0.05 [1/K], Ki=0.005 [1/K-s], Kd=0 [s/K], tau=1 [s], i0=0.2 [K-s], d0=0 [K], umin=0.02, umax=1, Taw=2000 [s])
// Reverse-acting: opening the EXV COOLS, so the measurement drives sp and
// the setpoint drives pv (equivalent to negating the gains).
connect(TB.out, PID.sp)
connect(SP.out, PID.pv)
connect(PID.out, EXV.u)
DYNAMIC cool(method = ode23s, time = 0 .. 4000, points = 400)
END
t_bat      = FinalValue('bp.t') * 1 [K]
q_positive = 0.5 * (1 + tanh(FinalValue('ch.ev.q')))

{ CHECK t_bat 302.99984375521336 3.1e-7 }
{ CHECK hliq 265947.2005481485 2.7e-4 }`,
  },
  {
    id: 'ev-thermal-management',
    title: 'EV Thermal Management System',
    // NOTE (wasm port): this catalog entry keeps the real EV component model
    // (preserved in defaultExample.ts as EV_THERMAL_EXAMPLE_TEXT), NOT the
    // browser-native boot document that replaced it as DEFAULT_EXAMPLE_TEXT.
    // It solves in the browser: Phase 6 landed the component expander, and the
    // FRAUX1 auxiliary property grids (tools/aux-gen) closed the last four
    // property gaps it needed — INCOMP::MEG for the EG50 coolant, R1234yf for
    // the refrigerant, air transport for htc_extair, and saturation-line
    // transport for htc_evap / htc_cond / dp_2phase.
    description: 'Coupled refrigerant + coolant loops with wide branches and a discretized radiator; every HX UA and the evaporator dP are computed from correlations + geometry and injected. Reports the steady cycle performance — cooling duties, compressor power and COP.',
    category: 'Systems',
    featured: true,
    text: EV_THERMAL_EXAMPLE_TEXT,
  },
  {
    id: 'multi-objective-beam',
    title: 'Multi-Objective Beam Design (Pareto)',
    description: 'Trade off mass against deflection — run via Min/Max > Pareto.',
    category: 'Data & Analysis',
    featured: true,
    text: `// Multi-Objective Cantilever Beam
{ A steel cantilever with a tip load. Solve (F2) to evaluate one
  design, then open Tools > Min/Max, switch to 'Multi-objective
  (Pareto)', and MINIMIZE both 'mass' and 'delta' over the decisions
  b (0.01 .. 0.06) and h (0.02 .. 0.10) to trace the trade-off front.
  Material properties come from the built-in solid database. }
L = 1 [m]                { beam length }
F = 500 [N]              { tip load }
E = E_(Steel)            { Young's modulus }
rho = rho_(Steel)        { density }

b = 0.03 [m]             { cross-section width  (decision) }
h = 0.05 [m]             { cross-section height (decision) }

I = b * h^3 / 12         { second moment of area }
mass = rho * L * b * h               { objective 1: minimize }
delta = F * L^3 / (3 * E * I)        { objective 2: tip deflection, minimize }

{ CHECK mass 11.781 1.2e-8 }
{ CHECK delta 0.0026666666666666657 2.7e-12 }`,
  },
  {
   id: 'correlated-temperature-heat-loss',
   "title": "Correlated temperature measurements in heat-loss estimation",
    "description": "Heat loss from two temperature readings whose errors correlate at ρ = 0.5, which narrows the propagated spread.",
    "category": "Data & Analysis",
    "featured": true,
    "text": "{ Walk-through. Tools > Monte Carlo… samples the two readings from their\n  UncertaintyOf lines, correlated at 0.5, and re-solves each sample: with\n  1,000 samples (seed 42) heat_loss has sigma 2.56 W, against the\n  first-order 2.65 W. A sigma typed in Variable Information replaces a line's.\n  Tools > Global Sensitivity… (Sobol or Morris) assumes independent inputs,\n  so it refuses while the Correlation line is here. Delete that line and run\n  Sobol: the total indices are about 0.31 for inside_temp and 0.69 for\n  outside_temp, the 4/13 and 9/13 split of (10*0.2)^2 + (10*0.3)^2. }\ninside_temp = 293.15 [K]\noutside_temp = 273.15 [K]\nheat_loss = 10 [W/K]*(inside_temp-outside_temp)\nUncertaintyOf(inside_temp) = 0.2\nUncertaintyOf(outside_temp) = 0.3\nCorrelation(inside_temp, outside_temp) = 0.5\nheat_sigma = UncertaintyOf(heat_loss)\n{ CHECK heat_loss 200 1e-8 }\n{ CHECK heat_sigma 2.64575131106459 1e-7 }"
  },
  {
   id: 'vibration-tone-spectrum',
   "title": "Recover a vibration tone and check spectral power",
    "description": "The FFT of a sampled sine finds its frequency bin, checks Parseval's power and inverts back exactly.",
    "category": "Data & Analysis",
    "featured": true,
    "text": "signal = [0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1,0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1,0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1,0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1]\nimaginary = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]\n[spectrum_real, spectrum_imag] = FFT(signal, imaginary)\n[recovered, recovered_imag] = IFFT(spectrum_real[1:32], spectrum_imag[1:32])\n[frequency, psd] = Welch(signal, 32, 16)\npower = sum(psd[1:9])*(frequency[2]-frequency[1])\nreconstruction_error = recovered[3]-signal[3]\ntone_peak = peakindex(1, 0, 0, psd[1:9])\nPLOT 'Vibration power spectrum'\n kind = xy\n x = frequency\n y = psd\n xlabel = 'Frequency [Hz]'\n ylabel = 'Power density [amplitude squared per Hz]'\nEND\n{ CHECK frequency[3] 4 1e-9 }\n{ CHECK tone_peak 3 1e-9 }\n{ CHECK power 1 0.01 }\n{ CHECK reconstruction_error 0 1e-9 }"
  },
  {
    id: 'lab-air-mixing',
    title: 'Lab — outdoor-air mixing on the psychrometric chart',
    description: 'A graded live lab: a ventilated room and its mixed supply trace paths on the psychrometric chart; raise the outdoor-air fraction live and watch the room cool and dry. Run it live from the lesson panel.',
    category: 'Lessons & Labs',
    featured: true,
    text: `// frees-language: 2
{ Lab — outdoor-air mixing on the psychrometric chart.

  A ventilated room holds m_room of dry air. A fan supplies m_dot of dry
  air, mixed from outdoor air (fraction f_oa) and air returned from the
  room. Mixing is adiabatic, so humidity ratio and enthalpy per kg of dry
  air mix in proportion to the flows:
    w_mix = f_oa*w_out + (1 - f_oa)*w_room,  h_mix likewise.
  The people and lights in the room add Q_int of heat and m_w of
  moisture, which leaves as vapour at h_w.

  In the steady state the outdoor part of the supply carries the gains
  away:
    w_ss = w_out + m_w/(f_oa*m_dot),
    h_ss = h_out + (Q_int + m_w*h_w)/(f_oa*m_dot),
  so more outdoor air brings the room closer to the outdoor state. The
  chart traces the room and the mixed air as they move.

  Source: ASHRAE Handbook, Fundamentals, ch. 1 (psychrometrics: adiabatic
  mixing of two streams). }

P      = 101325 [Pa]
T_out  = 288.15 [K]        { outdoor dry bulb }
RH_out = 0.8               { outdoor relative humidity }
f_oa   = 0.2               { outdoor-air fraction: the lab's slider }
m_dot  = 0.5 [kg/s]        { supply, dry air }
m_room = 60 [kg]           { dry air in the room }
Q_int  = 800 [W]           { sensible gains }
m_w    = 0.0002 [kg/s]     { moisture gains }
h_w    = 2.5e6 [J/kg]      { enthalpy of the added vapour }
w_out  = HumRat(AirH2O, T=T_out, P=P, R=RH_out)
h_out  = Enthalpy(AirH2O, T=T_out, P=P, W=w_out)
w_0    = HumRat(AirH2O, T=297.15 [K], P=P, R=0.5)     { the room at the start }
h_0    = Enthalpy(AirH2O, T=297.15 [K], P=P, W=w_0)

DYNAMIC room (method = ida, time = 0 .. 8000, points = 801)
  w_mix  = f_oa*w_out + (1 - f_oa)*w_room
  h_mix  = f_oa*h_out + (1 - f_oa)*h_room
  T_mix  = Temperature(AirH2O, H=h_mix, P=P, W=w_mix)
  T_room = Temperature(AirH2O, H=h_room, P=P, W=w_room)
  m_room*der(w_room) = m_dot*(w_mix - w_room) + m_w
  m_room*der(h_room) = m_dot*(h_mix - h_room) + Q_int + m_w*h_w
  w_room(0) = w_0
  h_room(0) = h_0
END

w_ss = w_out + m_w/(f_oa*m_dot)
h_ss = h_out + (Q_int + m_w*h_w)/(f_oa*m_dot)
T_ss = Temperature(AirH2O, H=h_ss, P=P, W=w_ss)

{ CHECK w_ss 0.0105256953110218 1e-12 }
{ CHECK T_ss 295.89533483557 1e-6 }
PLOT 'Room and mixed air'
  kind = psychro
  overlaystates = false
  tmin = 10
  tmax = 30
  ymax = 0.02
  x = T_room, T_mix     { paired in order with y: the room and the mixed air }
  y = w_room, w_mix
END`,
  },
  {
    id: 'lesson-rc-charging',
    title: 'Lesson — RC charging',
    description: 'Predict, change one input, observe: doubling R doubles τ = RC and slows the charge. Pairs with the thermal-mass lesson.',
    category: 'Lessons & Labs',
    featured: true,
    text: `// frees-language: 2
{ Lesson — RC charging. Pairs with the thermal-mass lesson.

  A 10 V step charges a capacitor C through a resistor R. The capacitor
  voltage rises as v(t) = E·(1 − exp(−t/τ)) with τ = R·C: after one time
  constant it has covered 63.2 % of the step, whatever R and C are.

  Source: J. W. Nilsson and S. A. Riedel, Electric Circuits, 11th ed.,
  Pearson, 2019, §7.4 (the step response of RC circuits). }

R_s = 1000 [ohm]       { series resistance: the lesson's slider }
C_s = 1e-6 [farad]     { capacitance }
E_s = 10 [V]           { step voltage }

VoltageSource VS(E=E_s)
Resistor      R(R=R_s)
Capacitor     CAP(C=C_s, V0=0 [V])
Ground        G()
connect(VS.p, R.a)
connect(R.b, CAP.p)
connect(CAP.n, VS.n, G.port)

DYNAMIC charge (method = ode45, time = 0 .. 0.01, points = 201)
END

tau   = R_s * C_s                                { time constant }
v_1ms = ODEValue('cap.vc', 0.001) * 1 [V]        { capacitor voltage at 1 ms }
share = v_1ms / E_s                              { fraction of the step covered }

{ CHECK tau 0.001 1e-12 }
{ CHECK v_1ms 6.32120558828558 1e-6 }
{ CHECK share 0.632120558828558 1e-7 }
PLOT 'Capacitor voltage'
  kind = xy
  x = time
  y = 'cap.vc'
END`,
  },
  {
    id: 'pressure-cooker',
    title: 'Pressure Cooker (transient)',
    description: 'Multi-domain boil-off: an electric element heats a steel body and the water; a lifting relief valve holds the cooker at its ~2 atm setpoint. Solve, then open the Plots tab.',
    category: 'Systems',
    text: `// Pressure Cooker (transient boil-off)
{ A 5 L rigid stainless cooker holds 3 L of tap water at 20 C, lid sealed,
  heated by a 220 V resistive element (32.27 ohm -> 1.5 kW). A spring relief
  valve vents steam to the atmosphere to hold the cooker near its 2 atm
  setpoint, where water boils at about 121 C. The run lasts 20 minutes.

  A full multi-domain transient, every block from the component library:
    - an ELECTRICAL heater (source + resistor + ground) whose ohmic heat
      I^2*R crosses into a thermal STEEL body, which heats the water through a
      conductive link;
    - a rigid two-phase WATER vessel whose pressure, temperature and vapour
      fraction come from a density / internal-energy flash of its conserved
      mass and energy (the BoilingVessel state vars are mass and internal
      energy, integrated in time);
    - a PROPORTIONAL relief valve that lifts with overpressure to regulate the
      cooker to its setpoint (a fixed orifice would instead over-pressurise).

  Press Solve, then open the Plots tab to chart, over time:
    (1) water temperature (cook.t_cv)  - climbs to ~121 C and holds,
    (2) heater current    (I_heater)   - constant ~6.8 A,
    (3) water mass        (cook.mass)  - flat until boiling, then falls as
        steam vents,
    (4) vapour fraction   (cook.x_cv)  - the cooker stays almost all liquid. }

{ ---- Electrical heater: 220 V across a 32.27 ohm element = 1.5 kW ---- }
VoltageSource   SUP(E=220 [V])
HeatingResistor HTR(R=32.2667 [ohm])
Ground          GND()
I_heater = 220 [V] / 32.2667 [ohm]                 { heater current by Ohm's law, A }

{ ---- Steel body heated by the element, passing heat to the water ---- }
ThermalMass STEEL(C=750 [J/K], T0=293.15 [K])      { 750 J/K steel thermal mass }
Convection  S2W(htc=333.33 [W/m^2-K], area=1 [m^2])      { steel -> water link, 333 W/K }

{ ---- Rigid 5 L two-phase water vessel + lifting relief valve to air ---- }
BoilingVessel   COOK(fluid$=Water, V=0.005 [m^3], m0=2.994 [kg], T0=293.15 [K])
ProportionalReliefValve PRV(fluid$=Water, Pcrack=202600 [Pa], grad=6e-7 [kg/s-Pa], eps=2000 [Pa])
TwoPhasePressureSink ATM(P=101300 [Pa])

connect(SUP.p, HTR.p)
connect(SUP.n, HTR.n, GND.port)          { circuit return tied to ground }
connect(HTR.heat, STEEL.port, S2W.a)     { element dissipates into the steel }
connect(S2W.b, COOK.wall)                { steel heats the water }
connect(COOK.vent, PRV.in)
connect(PRV.out, ATM.in)

DYNAMIC cooker (method = ida, time = 0 .. 1200, points = 241, rtol = 1e-5, atol = 1e-4)
END

{ CHECK I_heater 6.818174774612836 7.5e-6 }`,
  },
  {
    id: 'pump-sizing',
    title: 'Pump Sizing',
    description: 'Hydraulic and shaft power from flow rate, head, and efficiency.',
    category: 'Mechanics',
    text: `// Pump Sizing
{ A worked example — edit any value and press Solve (F2).
  Equations may be written in any order; frees figures out
  the calculation order for you. }

rho = 1000 [kg/m^3]      { water density }
g = 9.81 [m/s^2]
Q_flow = 0.02 [m^3/s]    { volumetric flow rate }
H = 25 [m]               { pump head }
eta = 0.7                { pump efficiency }

P_hydraulic = rho * g * Q_flow * H   { hydraulic power, in watts }
P_shaft = P_hydraulic / eta          { required shaft power }

{ CHECK P_hydraulic 4905 5e-6 }
{ CHECK P_shaft 7007.142857142858 7.1e-6 }`,
  },
  {
    id: 'projectile-motion',
    title: 'Projectile Motion',
    description: 'Range, flight time, and peak height of a launched projectile.',
    category: 'Mechanics',
    text: `// Projectile Motion
{ A ball launched from the ground at an angle.
  Edit v0 or theta_deg and press Solve (F2). }
g = 9.81 [m/s^2]
v0 = 20 [m/s]            { launch speed }
theta_deg = 35          { launch angle in degrees }
theta = theta_deg * pi# / 180

vx = v0 * cos(theta)
vy = v0 * sin(theta)
t_flight = 2 * vy / g    { time of flight }
x_range = vx * t_flight  { horizontal range }
h_max = vy^2 / (2 * g)   { peak height }

{ CHECK t_flight 2.3387418403712377 2.4e-9 }
{ CHECK x_range 38.31570319208596 3.9e-8 }
{ CHECK h_max 6.707236051726107 6.8e-9 }`,
  },
  {
    id: 'heat-conduction',
    title: 'Heat Conduction',
    description: "Steady 1-D conduction through a wall (Fourier's law).",
    category: 'Heat Transfer',
    text: `// Heat Conduction Through a Wall
{ Steady 1-D conduction (Fourier's law). }
k = 0.8 [W/m-K]        { thermal conductivity }
A = 12 [m^2]           { wall area }
L = 0.25 [m]           { wall thickness }
T_in = 21 [C]
T_out = -5 [C]
Q = k * A * (T_in - T_out) / L   { heat loss rate, watts }

{ CHECK Q 998.4000000000001 1e-6 }`,
  },
  {
    id: 'dc-circuit',
    title: 'DC Circuit',
    description: 'Current and power dissipation from Ohm’s law.',
    category: 'Electrical & Powertrain',
    text: `// DC Circuit — Power Dissipation
V = 12 [V]
R = 220 [ohm]
I = V / R       { current }
P = V * I       { power dissipated }

{ CHECK I 0.05454545454545454 5.5e-11 }
{ CHECK P 0.6545454545454545 6.6e-10 }`,
  },
  {
    id: 'thermo-compliance',
    title: 'Real-Fluid Thermodynamics Compliance',
    description: ' Nelson-Obert compressibility and diffuser stagnation properties from a standard thermodynamics textbook.',
    category: 'Thermodynamics',
    text: `// Real-Fluid Thermodynamics Compliance
{ Verification problems from a standard thermodynamics textbook.
  This example demonstrates the compressibility factor (Z) of real fluids
  and stagnation properties for compressible flow. }

{ --- Part 1: Nelson-Obert Compressibility (Example 3-12 / 3-13) --- }
{ Determine the compressibility factor Z and specific volume v of R-134a
  at T = 50 C and P = 1 MPa. Compare to ideal gas. }
T_r134a = 50 [C]
P_r134a = 1 [MPa]

Z_real = CompressibilityFactor(R134a, T=T_r134a, P=P_r134a)
v_real = Volume(R134a, T=T_r134a, P=P_r134a)

{ We can also check critical properties of R134a: }
T_crit_r134a = T_crit(R134a)
P_crit_r134a = P_crit(R134a)

{ --- Part 2: Diffuser Stagnation Properties (Example 17-1) --- }
{ Air enters a diffuser at static temperature T = 300 K, static pressure
  P = 100 kPa with a velocity V = 200 m/s. k = 1.4, cp = 1005 J/kg-K. }
T_air = 300 [K]
P_air = 100 [kPa]
V_air = 200 [m/s]
cp_air = 1005 [J/kg-K]
k_air = 1.4

T0_air = StagnationTemp(T_air, V_air, cp_air)
P0_air = StagnationPres(P_air, T_air, T0_air, k_air)

{ CHECK T_crit_r134a 374.2119665849513 3.8e-7 }
{ CHECK P_crit_r134a 4059276.3737910665 4.1e-3 }
{ CHECK T0_air 319.9004975124378 3.2e-7 }
{ CHECK P0_air 125206.77019884119 1.3e-4 }`,
  },
  {
    id: 'state-tables-multifluid',
    title: 'Multi-Fluid State Tables',
    description: 'Two fluid circuits grouped with explicit, fluid-aware STATE TABLE blocks.',
    category: 'Thermodynamics',
    text: `// Multi-Fluid State Tables
{ Two circuits in one model: a steam loop and an R134a loop. Each
  STATE TABLE groups its own state points and declares its FLUID, so
  the Fluid States window shows one fluid-aware table per circuit and
  property look-ups never mix fluids — a Water state 1 and an R134a
  state 1 stay separate. Press Solve (F2), then click
  "Fill Missing Values" in the Fluid States window to complete each
  state (s, v, x, ...) from the real-fluid backend using the right fluid. }

{ --- Water loop --- }
Pw_1 = 10 [kPa]
Tw_1 = 45 [C]
hw_1 = Enthalpy(Water, P=Pw_1, T=Tw_1)

Pw_2 = 8000 [kPa]
Tw_2 = 480 [C]
hw_2 = Enthalpy(Water, P=Pw_2, T=Tw_2)

{ --- R134a loop --- }
Pref_1 = 200 [kPa]
xref_1 = 1
href_1 = Enthalpy(R134a, P=Pref_1, x=xref_1)

Pref_2 = 1200 [kPa]
Tref_2 = 60 [C]
href_2 = Enthalpy(R134a, P=Pref_2, T=Tref_2)

STATE TABLE WaterLoop(Pw_1, Tw_1, hw_1, Pw_2, Tw_2, hw_2)
  FLUID = Water
END

STATE TABLE RefrigerantLoop(Pref_1, xref_1, href_1, Pref_2, Tref_2, href_2)
  FLUID = R134a
END

{ CHECK hw_1 188435.13550803528 1.9e-4 }
{ CHECK hw_2 3349645.1659218343 3.4e-3 }
{ CHECK href_1 392618.89553575753 4e-4 }
{ CHECK href_2 437787.9473383412 4.4e-4 }`,
  },
  {
    id: 'newton-cooling',
    title: "Newton's Cooling (ODE)",
    description: 'First-order ODE via Integral — a hot body cooling to ambient.',
    category: 'Heat Transfer',
    text: `// Newton's Law of Cooling — first-order ODE
{ A hot object relaxing toward ambient obeys
  dT/dt = -k*(T - T_inf).  Press Solve (F2).

  The Integral ODE feedback only works when the integrand
  references its own result (which starts at 0), so we integrate
  the temperature DROP and rebuild T = T0 - drop. Limits must be
  constants (0 to 30 [s]; the unit makes tau, and so drop, come out right). }
k = 0.05 [1/s]           { cooling constant }
T_inf = 20 [C]           { ambient temperature }
T0 = 90 [C]              { initial temperature }

drop = Integral(k*(T0 - drop - T_inf), tau, 0, 30 [s])
T = T0 - drop            { temperature after 30 s }

{ CHECK T 308.76911121039007 1e-8 }
{ CHECK drop 54.38088878960991 1e-8 }`,
  },
  {
    id: 'damped-oscillator',
    title: 'Damped Oscillator (table)',
    description: 'Parametric time sweep — free vibration of a mass-spring-damper.',
    category: 'Mechanics',
    text: `// Damped Harmonic Oscillator (parametric time sweep)
{ Free vibration of a mass-spring-damper, released from x0 at rest,
  sampled in time. PARAMETRIC table: Solve opens the table and runs
  it, as Solve Table does. Then chart x vs time, adding
  env and -env to see the decay envelope. }
m = 2 [kg]               { mass }
k = 50 [N/m]             { stiffness }
c = 4 [N-s/m]            { damping }
x0 = 0.1 [m]             { initial displacement }

wn = sqrt(k/m)                   { natural frequency }
zeta = c / (2*sqrt(k*m))        { damping ratio (underdamped < 1) }
wd = wn*sqrt(1 - zeta^2)        { damped frequency }

time = t * 1 [s]
env = x0*exp(-zeta*wn*time)     { decay envelope }
x = env * (cos(wd*time) + (zeta*wn/wd)*sin(wd*time))

PARAMETRIC vibration (t, time, x, env)
  t = 0:0.05:6
END

{ Graded on the table's last row, t = 6 s: x0 e^(-zeta wn t) (cos wd t + (zeta wn / wd) sin wd t). }
{ CHECK env 0.000247875217666636 1e-15 }
{ CHECK x -0.000153629414442251 1e-15 }`,
  },
  {
    id: 'karman-rocket',
    title: 'Sounding Rocket to the Kármán Line',
    description: 'Sizes a CH4/LOX rocket to loft a 10 kg payload to 100 km — combustion, Isp, and an implicit mass/Δv solve.',
    category: 'Aerospace & Compressible Flow',
    text: `// Sounding Rocket to the Kármán Line
{ A single-stage methane / liquid-oxygen rocket sized to carry a 10 kg
  payload to the Karman line (100 km), then release it at apogee.

  This shows off frees end to end: built-in constants (g#, R#), the
  chemistry functions (MolarMass, HeatingValue), units throughout, and an
  *implicit* solve — the propellant mass is whatever makes the apogee come
  out to 100 km, and Newton's method finds it. Edit any input and Solve (F2). }

{ Mission }
g0 = g#                  { standard gravity }
h_target = 100 [km]      { Karman line — the closing condition below }
m_payload = 10 [kg]      { released at apogee }

{ Propellant: methane (CH4) + liquid oxygen (O2) }
MM_fuel = MolarMass(CH4)            { kg/mol }
MM_ox = MolarMass(O2)
OF_stoich = 2 * MM_ox / MM_fuel     { CH4 + 2 O2 -> CO2 + 2 H2O, so O/F = 4.0 }
OF = 3.4                            { run slightly fuel-rich, as real engines do }
f_fuel = 1 / (1 + OF)               { fuel fraction of the propellant mass }

{ Combustion -> chamber temperature }
LHV = HeatingValue(CH4, 'LHV')      { lower heating value of the fuel [J/kg] }
eta_comb = 0.90                     { combustion efficiency (dissociation, losses) }
cp_gas = 3000 [J/kg-K]              { mean specific heat of the hot products }
T_ref = 298 [K]
T_c = T_ref + eta_comb * LHV * f_fuel / cp_gas    { adiabatic-ish chamber temp }

{ Exhaust and specific impulse (ideal nozzle) }
MM_exhaust = (MolarMass(CO2) + 2 * MolarMass('H2O')) / 3   { mean product molar mass }
R_gas = R# / MM_exhaust             { specific gas constant of the exhaust }
gamma = 1.20
P_c = 70 [bar]                      { chamber pressure }
P_e = 0.5 [bar]                     { nozzle exit pressure }
v_e = sqrt( 2*gamma/(gamma - 1) * R_gas * T_c * (1 - (P_e/P_c)^((gamma - 1)/gamma)) )
Isp = v_e / g0                      { specific impulse [s] }

{ Vehicle mass (m_prop is solved from the apogee condition) }
f_struct = 0.12                     { tank + structure, as a fraction of propellant }
m_struct = f_struct * m_prop
m0 = m_payload + m_struct + m_prop  { lift-off mass }
m_burnout = m_payload + m_struct    { mass at burnout (payload still aboard) }
MR = m0 / m_burnout                 { mass ratio }

{ Thrust and lift-off }
TWR = 2.0                           { thrust-to-weight at lift-off (> 1 to fly) }
F_thrust = TWR * m0 * g0
mdot = F_thrust / v_e               { propellant mass flow }
t_burn = m_prop / mdot

{ Powered ascent (gravity + drag losses, decreasing mass) }
{ Integrating v(t) = v_e ln(m0/m(t)) - g0 t over the burn gives, in closed form: }
dv_losses = 500 [m/s]               { lumped aerodynamic drag + steering losses }
v_burnout = v_e * ln(MR) - g0 * t_burn - dv_losses
h_powered = v_e * t_burn - (v_e * m_burnout / mdot) * ln(MR) - 0.5 * g0 * t_burn^2

{ Coast to apogee and close the loop }
h_coast = v_burnout^2 / (2 * g0)    { ballistic coast after burnout }
h_apogee = h_powered + h_coast
h_apogee = h_target                 { <-- the equation that sizes the rocket }

{ Propellant split (load this much into the tanks) }
m_fuel = f_fuel * m_prop
m_oxidizer = OF * m_fuel

{ CHECK h_coast 52147.964767274476 5.3e-5 }
{ CHECK m_fuel 3.4216330731586844 3.5e-9 }
{ CHECK m_oxidizer 11.633552448739527 1.2e-8 }`,
  },
  {
    id: 'newton-cooling-transient',
    title: 'Newton Cooling (Transient)',
    description: 'A DYNAMIC ODE block integrates a cooling curve and reports peak/final temperature.',
    category: 'Heat Transfer',
    text: `// Newton Cooling — Transient (DYNAMIC)
{ A first-order ODE solved over time. The DYNAMIC ... END block is a parallel
  path to the analytic solver: a variable is a STATE when a der(X) appears, with
  one der(X) = ... and one initial condition X(0) = ...  The block produces an
  ODE Table (see the Tables window) you can plot (Plots window: x = time, y = T).

  Note: temperature is named T, which is case-insensitively the same as a time
  variable t — so this block names time "time" in the header. }

k     = 0.012 [1/s] { cooling rate constant [1/s] }
T_inf = 22 [C]    { ambient temperature }

DYNAMIC cooling (method = ode45, time = 0 .. 300, points = 200, rtol = 1e-8)
  der(T) = -k * (T - T_inf)      { Newton's law of cooling }
  T(0)   = 90 [C]                { initial temperature }
  rate   = -der(T)               { algebraic auxiliary -> an output column }
END

{ Read transient results back into the analytic solution }
T_final = FinalValue('T') * 1 [K]        { temperature at the end of the run }
T_peak  = MaxValue('T') * 1 [K]          { hottest point (here, the start) }
t_half  = TimeAt('T', 56 [C]) * 1 [s]        { time to reach 56 degrees }

{ CHECK T_peak 363.15 1e-8 }
{ CHECK T_final 297.00801312641585 0.00005 }
{ CHECK t_half 57.76226504666211 0.005 }`,
  },
  {
    id: 'transient-heat-rod',
    title: 'Transient Heat Rod (method of lines)',
    description: 'A 1-D heat-conduction PDE discretized into N nodes, integrated as a stiff ODE system.',
    category: 'Heat Transfer',
    text: `// Transient 1-D Heat Conduction (method of lines)
{ The heat equation dT/dt = alpha d2T/dx2 is discretized into N nodes; the FOR
  loop generates one der(T[i]) per interior node and the array / FOR machinery
  expands it into a coupled stiff ODE system. Use the stiff solver ode23s. The
  ODE Table holds every node vs time — plot t[2], t[3], … against time to watch
  the rod heat up toward the linear steady profile. }

N = 6
L = 1 [m]
dx = L / (N - 1)
alpha = 0.05 [m^2/s] { thermal diffusivity }
T_left  = 100 [C]  { boundary node 1 }
T_right = 0 [C]    { boundary node N }
T_init  = 0 [C]    { interior starts cold }

DYNAMIC rod (method = ode23s, t = 0 .. 300, points = 150, rtol = 1e-6)
  FOR i = 2 TO N-1
    der(T[i]) = alpha / dx^2 * (T[i-1] - 2*T[i] + T[i+1])
  END
  T[1] = T_left            { Dirichlet boundary (auxiliary, held constant) }
  T[6] = T_right
  T[2](0) = T_init         { vector initial condition — nodes 2..5 start cold }
  T[3](0) = T_init
  T[4](0) = T_init
  T[5](0) = T_init
END

{ Steady-state check: T[i] = 273.15 + 100 (N-i)/(N-1), in kelvin }
T_mid_final = FinalValue('t[4]') * 1 [K]

{ CHECK T_mid_final 313.15 0.0001 }`,
  },
  {
    id: 'damped-oscillator-ode',
    title: 'Damped Oscillator (2-state)',
    description: 'A true two-state ODE (position + velocity) sharing one step cursor.',
    category: 'Mechanics',
    text: `// Damped Harmonic Oscillator (DYNAMIC)
{ A mass-spring-damper as a coupled two-state ODE:
    x' = v ,  v' = -(c/m) v - (k/m) x
  Both states advance on one shared step cursor — the multi-state capability the
  single-state Integral() lacks. Plot x vs time, or v vs x (phase portrait),
  from the ODE Table in the Plots window. }

m = 1.0 [kg]  { mass }
k = 20.0 [N/m] { spring constant }
c = 0.5 [N-s/m] { damping coefficient }

DYNAMIC oscillator (method = ode45, t = 0 .. 20, points = 400, rtol = 1e-9)
  der(x) = v
  der(v) = -(c/m) * v - (k/m) * x
  energy = 0.5 * m * v*v + 0.5 * k * x*x   { total mechanical energy (decays) }
  x(0) = 1.0 [m]
  v(0) = 0.0 [m/s]
END

{ Transient read-backs }
x_settled = FinalValue('x') * 1 [m]        { residual displacement at t = 20 }
E0        = ODEValue('energy', 0) * 1 [J]  { initial energy }

{ CHECK x_settled 0.001919825875960991 2e-12 }
{ CHECK E0 10 1e-8 }`,
  },
  {
    id: 'partial-fractions',
    title: 'Partial Fractions (Laplace)',
    description: 'Decompose a transfer function and read the residues A, B as solved variables.',
    category: 'Control Systems',
    text: `// Partial Fractions (Laplace)
{ Decompose the transfer function G(s) = (s + 3) / (s^2 + 3s + 2)
  into A/(s+1) + B/(s+2) and read off the residues.

  Declaring s as SYMBOLIC turns the next line into an identity that
  must hold for all s: frees matches coefficients and solves for A and B,
  which then appear in the Solution window like any other variable.
  Press Solve (F2). }

SYMBOLIC s

{ tf(num, den) builds num(s)/den(s) from coefficient arrays in
  descending powers: [1, 3] = s + 3 and [1, 3, 2] = s^2 + 3s + 2. }
tf([1, 3], [1, 3, 2]) = A/(s+1) + B/(s+2)

{ A and B are ordinary variables now — use them downstream. With the
  inverse Laplace transform y(t) = A*e^(-t) + B*e^(-2t): }
y_initial = A + B        { y(0) }

{ CHECK A 2 2e-9 }
{ CHECK B -1 1e-9 }
{ CHECK y_initial 1 1e-9 }`,
  },
  {
    id: 'multi-output-destructuring',
    title: 'Multi-Output Functions (array-language-style)',
    description: 'Bracket destructuring of functions: [A,B,C,D] = tf2ss(...), discarding outputs with ~, and omitting trailing outputs.',
    category: 'Control Systems',
    text: `// Multi-Output Functions
{ Every multi-output function can be used with array-language-style
  bracket destructuring:  [outs] = name(ins).
  Use ~ to discard an output, or omit trailing outputs you don't
  need. Press Solve (F2). }

num = [1]            { G(s) = 1 / (s^2 + 3s + 2) }
den = [1, 3, 2]

{ 1. Full destructuring }
[A, B, C, D] = tf2ss(num, den)

{ 2. Round-trip back to a transfer function (recovers num, den) }
[num2, den2] = ss2tf(A, B, C, D)

{ 3. Discard an output with ~ : keep only the Bode magnitude }
omega = [0.1, 1, 10]
[mag, ~] = bode(num, den, omega)

{ 4. Omit trailing outputs : state & input matrices only (C, D dropped) }
[Ar, Br] = tf2ss(num, den)

{ CHECK num2[3] 1 1e-9 }
{ CHECK den2[3] 2 2e-9 }
{ CHECK mag[1] -6.074657464028251 6.1e-9 }
{ CHECK mag[3] -40.21354713081423 4.1e-8 }`,
  },
  {
    id: 'controller-design-lqr-pid',
    title: 'Controller Design (LQR & PID)',
    description: 'LQR optimal state-feedback for a double integrator (with closed-loop pole check) and loop-shaping PID auto-tuning of a SISO plant.',
    category: 'Control Systems',
    text: `// Controller Design: LQR + PID

{ ---- LQR state feedback for a double integrator (unit mass) ---- }
{ x1' = x2 , x2' = u  ->  A = [0 1; 0 0],  B = [0; 1] }
A[1,1] = 0; A[1,2] = 1
A[2,1] = 0; A[2,2] = 0
B[1] = 0; B[2] = 1

{ State weight Q and input weight R }
Q[1,1] = 1; Q[1,2] = 0
Q[2,1] = 0; Q[2,2] = 1
R = 1

{ Optimal gain K minimizing the quadratic cost }
[K] = lqr(A, B, Q, R)

{ Closed-loop matrix Acl = A - B K, then verify the poles are stable }
Acl[1,1] = A[1,1] - B[1]*K[1]
Acl[1,2] = A[1,2] - B[1]*K[2]
Acl[2,1] = A[2,1] - B[2]*K[1]
Acl[2,2] = A[2,2] - B[2]*K[2]
[pcl_r, pcl_i] = pole(Acl)

{ ---- PID auto-tuning for plant G(s) = 1 / (s^2 + s) ---- }
{ Target gain crossover at wc with a 60 deg phase margin }
num = [1]
den = [1, 1, 0]
wc = 1 [rad/s]
[Kp, Ki, Kd] = pidtune(num, den, 'PID', wc)

{ CHECK K[1] 1.0000000000000004 1.1e-9 }
{ CHECK K[2] 1.732050807568877 1.8e-9 }
{ CHECK kp 1.3660254037844386 1.4e-9 }
{ CHECK ki 0.5240940792943284 5.3e-10 }
{ CHECK kd 0.8901194830787665 9e-10 }`,
  },
  {
    id: 'estimator-gramian-balreal',
    title: 'Estimator, Gramians & Balanced Realization',
    description: 'Kalman estimator (LQE) gain, controllability/observability gramians, and an internally-balanced realization for a stable state-space plant.',
    category: 'Control Systems',
    text: `// State Estimator, Gramians & Balanced Realization

{ ---- Plant: x' = A x + B u + G w ,  y = C x + v  (stable, observable) ---- }
A[1,1] = 0; A[1,2] = 1
A[2,1] = -2; A[2,2] = -3
B[1,1] = 0; B[2,1] = 1
C[1,1] = 1; C[1,2] = 0

{ Process-noise input matrix G and noise covariances Qn (process), Rn (measurement) }
G[1,1] = 1; G[1,2] = 0
G[2,1] = 0; G[2,2] = 1
Qn[1,1] = 1; Qn[1,2] = 0
Qn[2,1] = 0; Qn[2,2] = 1
Rn = 0.1 [V^2]

{ ---- Continuous Kalman estimator gain L (solves the filter Riccati equation) ---- }
[L] = lqe(A, G, C, Qn, Rn)

{ ---- Controllability and observability gramians (Lyapunov; A must be stable) ---- }
[Wc] = gram(A, B, 'c')
[Wo] = gram(A, C, 'o')

{ ---- Internally-balanced realization: Wc = Wo = diag(Hankel singular values) ---- }
[Ab, Bb, Cb] = balreal(A, B, C)

{ CHECK l[1,1] 2.949460316227945 3e-9 }
{ CHECK l[2,1] -0.6503419214982696 6.6e-10 }
{ CHECK ab[1,1] -0.40858968733650153 4.1e-10 }
{ CHECK ab[2,2] -2.5914103126634984 2.6e-9 }`,
  },
  {
    id: 'control-analysis-report',
    title: 'Control Analysis Report',
    description: 'End-to-end report: poles/zeros, stability margins, Bode, Nyquist, and step response ',
    category: 'Control Systems',
    text: `// Control System Analysis Report

{ This analyzes a second-order plant G(s) end to end: poles and zeros,
  gain and phase margins, frequency response (Bode and Nyquist), and the unit
  step response. Press Solve (F2). }

{ 1. Plant model }

{ The numerator and denominator coefficients below (descending powers of s) define
  G(s) = (s + 2) / (s^2 + 4s + 25) — an underdamped system with a natural
  frequency of 5 rad/s, a damping ratio near 0.4, and a single real zero. }
num = [1, 2]
den = [1, 4, 25]

{ 2. Poles, zeros and stability margins }

[pr, pi] = pole(num, den)
[zr, zi] = zero(num, den)
[gm, pm, w_cg, w_cp] = margin(num, den)

{ Both poles sit in the left half-plane, so the system is stable. The s-plane map
  below shows the conjugate pole pair and the single real zero. }


{ 3. Frequency response }

{ Sweep 50 logarithmically spaced frequencies, then evaluate the Bode and Nyquist
  responses. }
Nw = 50
omega = 0.1:50:100 | Log
[mag, phase] = bode(num, den, omega)
[re, im] = nyquist(num, den, omega)



{ 4. Time-domain step response }

{ Integrate the unit step response over 4 seconds; the underdamped poles produce
  the expected overshoot before settling. }
Nt = 81
t = 0:0.05:4
[y] = step(num, den, t)


PLOT 'Pole-Zero Map'
  kind = polezero
  pr = pr
  pi = pi
  zr = zr
  zi = zi
END

PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END

PLOT 'Nyquist Diagram'
  kind = nyquist
  real = re
  imag = im
END

PLOT 'Step Response'
  kind = xy
  x = t
  y = y
  xlabel = 'Time [s]'
  ylabel = 'Amplitude'
END

{ CHECK pr[1] -2 2e-9 }
{ CHECK pi[2] 4.58257569495584 4.6e-9 }
{ CHECK y[81] 0.07994618546824751 8e-11 }`,
  },
  {
    id: 'root-locus-analysis',
    title: 'Root Locus Analysis',
    description: 'Calculate and plot root locus trajectories for a closed-loop system, finding crossover points matching standard control-systems textbook examples.',
    category: 'Control Systems',
    text: `{ Root Locus Analysis }
{ Open-loop plant G(s) = K*(s + 3) / (s*(s + 1)*(s + 2)*(s + 4)) }
{ Expanded open-loop denominator coefficients: }
{ s*(s + 1)*(s + 2)*(s + 4) = s^4 + 7*s^3 + 14*s^2 + 8*s }
num_ol = [1, 3]
den_ol = [1, 7, 14, 8, 0]

{ Calculate closed-loop root locus trajectories }
[K, cpr, cpi] = rlocus(num_ol, den_ol)

{ Extract open-loop poles and zeros for plotting }
[pr, pi] = pole(num_ol, den_ol)
[zr, zi] = zero(num_ol, den_ol)

PLOT 'Root Locus'
  kind = rootlocus
  pr = cpr
  pi = cpi
  zr = zr
  zi = zi
END

{ CHECK pr[1] -3.999999999999993 4e-9 }
{ CHECK zr[1] -3 3e-9 }`,
  },
  {
    id: 'heisler-transient',
    title: 'Transient Conduction (Heisler)',
    description: 'Centre/surface temperature of a thick plate cooling by convection.',
    category: 'Heat Transfer',
    text: `// Transient Conduction (Heisler)
{ A thick plate, initially at Ti, is suddenly exposed to convection.
  When the Biot number is large, internal gradients matter and lumped
  capacitance fails — frees gives the one-term (Heisler) solution.
  Geometry is set once as a string variable: 'wall', 'cylinder' or
  'sphere'. theta* = (T - Tinf)/(Ti - Tinf). }
geom$ = 'wall'

h = 100 [W/m^2-K]        { convection coefficient }
k = 0.6 [W/m-K]          { plate conductivity }
alpha = 0.15e-6 [m^2/s]  { thermal diffusivity }
L = 0.02 [m]             { half-thickness }
t = 600 [s]              { elapsed time }
Ti = 200 [C]             { initial temperature }
Tinf = 25 [C]            { fluid temperature }

Bi = h * L / k
Fo = alpha * t / L^2

theta_c = heisler_temp(geom$, Bi, Fo, 0)   { centre, x* = 0 }
theta_s = heisler_temp(geom$, Bi, Fo, 1)   { surface, x* = 1 }
T_centre = Tinf + theta_c * (Ti - Tinf)
T_surface = Tinf + theta_s * (Ti - Tinf)
Q_ratio = heisler_q(geom$, Bi, Fo)         { fraction of heat removed }

{ CHECK T_centre 450.576089441665 4.6e-7 }
{ CHECK T_surface 350.53744609871654 3.6e-7 }
{ CHECK Q_ratio 0.32952524994160104 3.3e-10 }`,
  },
  {
    id: 'nichols-chart',
    title: 'Nichols Chart Presentation (Slide)',
    description: 'Open-loop frequency response on the Nichols grid, formatted as a slide presentation.',
    category: 'Control Systems',
    text: `// Nichols Chart Presentation

{ Open-loop magnitude vs phase for G(s) = 1 / ((s+1)(s+2)(s+3)).
  Solve (F2) to view the plots. }

{ System Definition }

{ We define the numerator and denominator for the open-loop plant: }
num = [1]
den = [1, 6, 11, 6]      { (s+1)(s+2)(s+3) }
omega = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20]

[mag, phase] = nichols(num, den, omega)

{ Nichols Chart }

{ The locus is drawn on the standard Nichols grid with the -1 critical point marked. }


PLOT 'Nichols'
  kind = nichols
  mag = mag
  phase = phase
END

{ CHECK mag[1] -15.5777885192688 1.6e-8 }
{ CHECK phase[9] -252.89623602644045 2.6e-7 }`,
  },
  {
    id: 'routh-stability',
    title: 'Routh-Hurwitz Stability',
    description: 'Count right-half-plane poles of a characteristic polynomial.',
    category: 'Control Systems',
    text: `// Routh-Hurwitz Stability
{ How many closed-loop poles sit in the right half-plane?
  nRHP = 0 means the system is stable. For s^3 + s^2 + 2s + 8
  the answer is 2 (unstable). }
den = [1, 1, 2, 8]       { s^3 + s^2 + 2s + 8 }

[nRHP, stable] = routh(den)

{ CHECK nrhp 2 2e-9 }`,
  },
  {
    id: 'inverse-laplace-residue',
    title: 'Inverse Laplace (Residues)',
    description: 'Partial-fraction residues and poles of a transfer function.',
    category: 'Control Systems',
    text: `// Inverse Laplace via Residues
{ Partial-fraction expansion of Y(s) = (s + 3)/(s^2 + 3s + 2).
  residue() returns the residues r and matching poles p, so the
  time response is y(t) = r_r[1] exp(p_r[1] t) + r_r[2] exp(p_r[2] t).
  Here that is 2 exp(-t) - exp(-2 t). }
num = [1, 3]             { s + 3 }
den = [1, 3, 2]          { s^2 + 3s + 2 = (s+1)(s+2) }

[r_r, r_i, p_r, p_i, k] = residue(num, den)

{ CHECK r_r[1] -1 1e-9 }
{ CHECK r_r[2] 2 2e-9 }
{ CHECK p_r[1] -2 2e-9 }
{ CHECK p_r[2] -1 1e-9 }`,
  },
  {
    id: 'digital-control-c2d',
    title: 'Digital Control: Discretization',
    description: 'Convert a continuous plant to discrete time (Tustin and ZOH).',
    category: 'Control Systems',
    text: `// Digital Control: Discretization
{ Sample a continuous plant G(s) = 2/(s+2) at Ts = 0.1 s using the
  bilinear (Tustin) and zero-order-hold (ZOH) methods. The outputs
  numz/denz are the discrete transfer function in powers of z. }
num = [2]
den = [1, 2]             { 2 / (s + 2) }
Ts = 0.1 [s]

[numz_t, denz_t] = c2d(num, den, Ts, 'tustin')
[numz_z, denz_z] = c2d(num, den, Ts, 'zoh')

{ CHECK numz_z[2] 0.18126924692201812 1.9e-10 }
{ CHECK denz_z[2] -0.8187307530779818 8.2e-10 }
{ CHECK numz_t[1] 0.09090909090909091 9.1e-11 }`,
  },
  {
    id: 'pid-pole-placement',
    title: 'PID Design by Pole Placement',
    description: 'A PID controller is designed for a DC-motor plant K/(s(τs+1)) so that the closed-loop characteristic polynomial matches a target — a dominant second-order pair (ζ, ωₙ) plus a fast real pole. Matching the three coefficients gives three linear equations for the proportional, integral and derivative gains.',
    category: 'Control Systems',
    text: `{ PID Design by Pole Placement }
{ For ζ = 0.7, ωₙ = 10 rad/s and a pole at −50, the gains are Kc = 200, Ki =
  1250, Kd = 15.5; the dominant pair gives 4.6% overshoot and a 0.57 s
  settling time. Each matched coefficient checks out exactly. }
{ Controls: PID design by pole placement for plant G(s)=K/(s(tau s+1)) }
Kp_plant = 2.0      { plant DC gain }
tau = 0.5 [s]
{ Desired poles: a complex pair (zeta, wn) + a fast real pole at -p }
zeta = 0.7
wn = 10 [rad/s]
p = 50 [rad/s]
{ Closed-loop char. poly  s^3 + ((1+Kp_plant*Kd)/tau) s^2
     + (Kp_plant*Kc/tau) s + Kp_plant*Ki/tau
   matched to (s+p)(s^2 + 2 zeta wn s + wn^2) }
(1 + Kp_plant*Kd)/tau = p + 2*zeta*wn
Kp_plant*Kc/tau       = wn^2 + 2*zeta*wn*p
Kp_plant*Ki/tau       = p*wn^2
ts = 4/(zeta*wn)                              { settling time }
Mp = exp(-pi#*zeta/sqrt(1-zeta^2))*100         { percent overshoot }
{ CHECK Kc 200 2e-4 }
{ CHECK Ki 1250 2e-3 }
{ CHECK Kd 15.5 2e-5 }
{ CHECK Mp 4.598791026026775 5e-6 }
{ CHECK ts 0.5714285714285714 6e-7 }`,
  },
  {
    id: 'partial-fraction-real',
    title: 'Partial-Fraction Expansion (Real Poles)',
    description: 'Inverse Laplace transform by partial fractions. Declaring s as SYMBOLIC turns the next equation into an identity that must hold for all s; frees matches coefficients and solves for the residues, which appear in the Solution window like any other variable. tf(num, den) builds the rational function from descending-power coefficient arrays.',
    category: 'Control Systems',
    text: `{ Partial-Fraction Expansion (Real Poles) }
{ 32/[s(s+4)(s+8)] expands to K1/s + K2/(s+4) + K3/(s+8) with K1 = 1, K2 =
  −2, K3 = 1 — i.e. the time response y(t) = 1 − 2e^(−4t) + e^(−8t). }
{ Partial-fraction expansion of Y(s) = 32 / [s(s+4)(s+8)] }
{ den = s(s+4)(s+8) = s^3 + 12 s^2 + 32 s  ->  [1, 12, 32, 0] }
SYMBOLIC s
tf([32], [1, 12, 32, 0]) = K1/s + K2/(s+4) + K3/(s+8)
{ CHECK K1 1 1e-6 }
{ CHECK K2 -2 2e-6 }
{ CHECK K3 1 1e-6 }`,
  },
  {
    id: 'partial-fraction-complex',
    title: 'Partial Fractions with a Complex Pole Pair',
    description: 'When the denominator has a complex (oscillatory) root pair, the corresponding partial-fraction term keeps a first-order numerator (K2·s + K3) over the quadratic factor. The SYMBOLIC identity solves for all three residues at once.',
    category: 'Control Systems',
    text: `{ Partial Fractions with a Complex Pole Pair }
{ 3/[s(s²+2s+5)] = K1/s + (K2·s + K3)/(s²+2s+5) gives K1 = 0.6, K2 = −0.6,
  K3 = −1.2. }
{ Partial fractions with a complex pole pair }
{ den = s(s^2 + 2s + 5) = s^3 + 2 s^2 + 5 s  ->  [1, 2, 5, 0] }
SYMBOLIC s
tf([3], [1, 2, 5, 0]) = K1/s + (K2*s + K3)/(s^2 + 2*s + 5)
{ CHECK K1 0.6 6e-7 }
{ CHECK K2 -0.6 6e-7 }
{ CHECK K3 -1.2 2e-6 }`,
  },
  {
    id: 'tf-to-ss',
    title: 'Transfer Function to State Space',
    description: 'ss/tf models are plain array and matrix variables — a transfer function is its num/den coefficient arrays (descending powers). tf2ss returns a controllable-canonical realization (A, B, C, D); any phase-variable form is a similarity transform of it.',
    category: 'Control Systems',
    text: `{ Transfer Function to State Space }
{ (s²+7s+2)/(s³+9s²+26s+24) realizes as A = [[−9,−26,−24],[1,0,0],[0,1,0]],
  B = [1,0,0], C = [1,7,2], D = 0. Converting it straight back with ss2tf
  recovers the original coefficients exactly. }
{ Transfer function -> state space (controllable canonical form) }
num = [0, 1, 7, 2]
den = [1, 9, 26, 24]
[A, B, C, D] = tf2ss(num[1:4], den[1:4])
{ CHECK A[1,1] -9 9e-6 }
{ CHECK A[1,2] -26 3e-5 }
{ CHECK A[1,3] -24 3e-5 }
{ CHECK C[2] 7 7e-6 }
{ CHECK C[3] 2 2e-6 }`,
  },
  {
    id: 'ss-to-tf',
    title: 'State Space to Transfer Function',
    description: 'The inverse conversion: build the A, B, C, D matrices entry by entry, then call ss2tf for the equivalent transfer-function coefficient arrays. The solver registers the output array shapes so num and den are usable downstream as bare names.',
    category: 'Control Systems',
    text: `{ State Space to Transfer Function }
{ The phase-variable system below converts to T(s) =
  10(s²+3s+2)/(s³+3s²+2s+1), i.e. num = [0, 10, 30, 20] and den = [1, 3, 2,
  1]. }
{ State space -> transfer function }
A[1,1]=0; A[1,2]=1; A[1,3]=0
A[2,1]=0; A[2,2]=0; A[2,3]=1
A[3,1]=-1; A[3,2]=-2; A[3,3]=-3
B[1]=10; B[2]=0; B[3]=0
C[1]=1; C[2]=0; C[3]=0
D=0
[num, den] = ss2tf(A[1:3,1:3], B[1:3], C[1:3], D)
{ CHECK num[2] 10 1e-5 }
{ CHECK num[3] 30 3e-5 }
{ CHECK num[4] 20 2e-5 }
{ CHECK den[4] 1 1e-6 }`,
  },
  {
    id: 'first-order-poles-zeros',
    title: 'Poles & Zeros of a First-Order System',
    description: 'pole and zero return the real/imaginary parts of a system\'s poles and zeros; tf2zp additionally factors the system into zero–pole–gain form. Poles in the left half-plane mean a stable system.',
    category: 'Control Systems',
    text: `{ Poles & Zeros of a First-Order System }
{ G(s) = (s+2)/(s+5) has a single zero at s = −2 and a single pole at s =
  −5; tf2zp returns the same factors with gain k = 1. }
{ Poles, zeros and zero-pole-gain factoring of G(s) = (s+2)/(s+5) }
num = [1, 2]
den = [1, 5]
[pr, pi] = pole(num[1:2], den[1:2])
[zr, zi] = zero(num[1:2], den[1:2])
[zzr, zzi, ppr, ppi, k] = tf2zp(num[1:2], den[1:2])
{ CHECK pr[1] -5 5e-6 }
{ CHECK zr[1] -2 2e-6 }
{ CHECK k 1 1e-6 }`,
  },
  {
    id: 'underdamped-poles',
    title: 'Complex Poles of an Underdamped System',
    description: 'A second-order system with a complex-conjugate pole pair. The real part sets the decay rate and the imaginary part the damped oscillation frequency.',
    category: 'Control Systems',
    text: `{ Complex Poles of an Underdamped System }
{ G(s) = 200/(s²+10s+200) has poles at s = −5 ± j13.23 (natural frequency ≈
  14.1 rad/s, damping ratio ≈ 0.354). }
{ Complex poles of an underdamped second-order system }
num = [0, 0, 200]
den = [1, 10, 200]
[pr, pi] = pole(num[1:3], den[1:3])
{ CHECK pr[1] -5 5e-6 }
{ CHECK pi[2] 13.228756555322953 2e-5 }`,
  },
  {
    id: 'thirdorder-poles-zeros',
    title: 'Poles & Zeros of a Third-Order System',
    description: 'pole and zero handle mixed real-and-complex root sets. Here a real pole, a complex pole pair, and a single finite zero are all extracted from one transfer function.',
    category: 'Control Systems',
    text: `{ Poles & Zeros of a Third-Order System }
{ G(s) = (s+2)/[(s+3)(s²+2s+2)] returns poles at s = −3 and s = −1 ± j1,
  with a zero at s = −2. }
{ Poles and zeros of a third-order system with a complex pole pair }
{ den = (s+3)(s^2+2s+2) = s^3 + 5 s^2 + 8 s + 6 }
num = [0, 0, 1, 2]
den = [1, 5, 8, 6]
[pr, pi] = pole(num[1:4], den[1:4])
[zr, zi] = zero(num[1:4], den[1:4])
{ CHECK pr[1] -3.000000000000001 3e-6 }
{ CHECK pr[2] -1.0000000000000004 1e-6 }
{ CHECK pi[3] 0.9999999999999994 1e-6 }
{ CHECK zr[1] -2 2e-6 }`,
  },
  {
    id: 'zpk-feedback',
    title: 'Zero-Pole-Gain to TF and Unity Feedback',
    description: 'Build a forward-path transfer function from its zeros, poles and gain with zp2tf, then close the loop with unity feedback. feedback forms T(s) = G/(1 + G·H); the result\'s array length is L1 + L2 − 1.',
    category: 'Control Systems',
    text: `{ Zero-Pole-Gain to TF and Unity Feedback }
{ Forward loop G(s) = (s+3)(s+4)/[(s+1)(s+2)] with unity feedback gives T(s)
  = (s²+7s+12)/(2s²+10s+14), whose closed-loop poles are s = −2.5 ± j0.866. }
{ Zero-pole-gain -> transfer function, then close with unity feedback }
zr = [-3, -4]
zi = [0, 0]
pr = [-1, -2]
pi = [0, 0]
k = 1
[numG, denG] = zp2tf(zr[1:2], zi[1:2], pr[1:2], pi[1:2], k)
numH = [1]
denH = [1]
[numT, denT] = feedback(numG[1:3], denG[1:3], numH[1:1], denH[1:1])
[tpr, tpi] = pole(numT[1:3], denT[1:3])
{ CHECK denT[1] 2 2e-6 }
{ CHECK denT[2] 10 1e-5 }
{ CHECK denT[3] 14 2e-5 }
{ CHECK tpr[1] -2.5 3e-6 }
{ CHECK tpi[2] 0.8660254037844386 9e-7 }`,
  },
  {
    id: 'parallel-interconnect',
    title: 'Parallel Interconnection of Blocks',
    description: 'parallel adds two transfer functions, G(s) = G1(s) + G2(s) (series multiplies them, feedback closes a loop). Here the three first-order terms of a partial-fraction expansion are recombined to reconstruct the original system.',
    category: 'Control Systems',
    text: `{ Parallel Interconnection of Blocks }
{ Adding 1/s, −2/(s+4) and 1/(s+8) reproduces 32/[s³+12s²+32s] — exactly the
  transfer function whose partial fractions were 1, −2, 1, closing the loop
  on the first example. }
{ Parallel sum of partial-fraction terms reconstructs the original G(s) }
n1 = [0, 1]
d1 = [1, 0]
n2 = [0, -2]
d2 = [1, 4]
[n12, d12] = parallel(n1[1:2], d1[1:2], n2[1:2], d2[1:2])
n3 = [0, 1]
d3 = [1, 8]
[nsum, dsum] = parallel(n12[1:3], d12[1:3], n3[1:2], d3[1:2])
{ CHECK nsum[4] 32 4e-5 }
{ CHECK dsum[2] 12 2e-5 }
{ CHECK dsum[3] 32 4e-5 }`,
  },
  {
    id: 'second-order-step',
    title: 'Second-Order Step Response & Metrics',
    description: 'step integrates the unit step response on a supplied time vector (it routes through the same ODE engine as DYNAMIC blocks, so y plots directly with the xy plot kind). Alongside it the closed-form second-order metrics — natural frequency, damping ratio, peak time, percent overshoot and settling time — are computed from the coefficients.',
    category: 'Control Systems',
    text: `{ Second-Order Step Response & Metrics }
{ G(s) = 100/(s²+15s+100): ωn = 10 rad/s, ζ = 0.75, peak time Tp = 0.475 s,
  percent overshoot %OS = 2.84%, settling time Ts = 0.533 s. }
{ Second-order step response and the standard performance metrics }
num = [0, 0, 100]
den = [1, 15, 100]
wn = sqrt(100)
zeta = 15 / (2*wn)
Tp = pi# / (wn*sqrt(1 - zeta^2))
OS = 100 * exp(-zeta*pi#/sqrt(1 - zeta^2))
Ts = 4 / (zeta*wn)
t = 0:0.02:1
N = 51
[y] = step(num[1:3], den[1:3], t[1:N])

PLOT 'Step Response'
  kind = xy
  x = t
  y = y
  xlabel = Time [s]
  ylabel = Amplitude
END
{ CHECK Tp 0.4749641646894904 5e-7 }
{ CHECK OS 2.837544174570507 3e-6 }
{ CHECK Ts 0.5333333333333333 6e-7 }
{ CHECK y[25] 1.0283404699952876 2e-6 }`,
  },
  {
    id: 'impulse-response',
    title: 'Impulse & Step Response',
    description: 'impulse returns the impulse response y(t) = C·e^(At)·B on the supplied time grid; here it is plotted next to the step response of the same plant for comparison.',
    category: 'Control Systems',
    text: `{ Impulse & Step Response }
{ 450/[(s+5)(s+20)] = 450/(s²+25s+100) is overdamped — both responses settle
  smoothly with no overshoot. The step response saturates at the DC gain
  G(0) = 450/100 = 4.5, not 1. }
{ Impulse and step response of an overdamped second-order system }
num = [0, 0, 450]
den = [1, 25, 100]
t = 0:0.02:1
N = 51
[y_imp] = impulse(num[1:3], den[1:3], t[1:N])
[y_step] = step(num[1:3], den[1:3], t[1:N])

PLOT 'Impulse vs Step'
  kind = xy
  x = t
  y = y_imp
  xlabel = Time [s]
  ylabel = Amplitude
END
{ CHECK y_step[51] 4.459572290446109 5e-6 }
{ CHECK y_imp[4] 13.188722315983663 2e-5 }`,
  },
  {
    id: 'forced-response-lsim',
    title: 'Forced Response to an Arbitrary Input (lsim)',
    description: 'lsim simulates the response to any input signal u(t), linearly interpolated between samples (u and t must be the same length). Here the underdamped second-order system is driven by a unit ramp.',
    category: 'Control Systems',
    text: `{ Forced Response to an Arbitrary Input (lsim) }
{ Driving 100/(s²+15s+100) (ωn = 10, ζ = 0.75) with a unit ramp u(t) = t;
  the output tracks the ramp with the expected lag. A unit ramp into a
  type-0 system with unit DC gain lags by 2ζ/ωn = 0.15 s at steady state, so
  y(1) ≈ 1 − 0.15 = 0.85. }
{ Forced (lsim) response to a unit-ramp input }
num = [0, 0, 100]
den = [1, 15, 100]
t = 0:0.02:1
N = 51
u = 0:0.02:1
[y] = lsim(num[1:3], den[1:3], u[1:N], t[1:N])

PLOT 'Ramp Response'
  kind = xy
  x = t
  y = y
  xlabel = 'Time [s]'
  ylabel = 'Output'
END
{ CHECK y[51] 0.8500818526757855 9e-7 }`,
  },
  {
    id: 'bode-response',
    title: 'Bode Frequency Response',
    description: 'bode evaluates magnitude (dB) and unwrapped phase (degrees) at a vector of frequencies; the bode plot kind draws the stacked magnitude/phase diagram. Build a logarithmic frequency sweep with the start:count:end | Log range form.',
    category: 'Control Systems',
    text: `{ Bode Frequency Response }
{ G(s) = (s+3)/[(s+2)(s²+2s+25)] has DC gain 3/50, so the low-frequency
  magnitude sits at 20·log10(0.06) = −24.44 dB, with break frequencies near
  2, 3 and 5 rad/s. }
{ Bode response of a first-over-second-order system }
num = [0, 0, 1, 3]
den = [1, 4, 29, 50]
G0 = 3/50
dB0 = 20*log10(G0)        { low-frequency magnitude, dB }
Nw = 50
omega = 0.1:50:100 | Log
[mag, phase] = bode(num[1:4], den[1:4], omega[1:Nw])

PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END
{ CHECK dB0 -24.436974992327126 3e-5 }
{ CHECK mag[1] -24.43979910099266 3e-5 }`,
  },
  {
    id: 'gain-phase-margin',
    title: 'Gain & Phase Margins',
    description: 'margin returns the gain margin (dB), phase margin (degrees) and the two crossover frequencies for an open-loop transfer function. The loop here is an antenna-azimuth position servo built up with series from a power amplifier and a motor/load block, scaled by a preamplifier gain.',
    category: 'Control Systems',
    text: `{ Gain & Phase Margins }
{ With preamplifier gain 20 the open loop has a 32.4 dB gain margin and a
  43.9° phase margin (gain crossover 1.72 rad/s, phase crossover 13.1 rad/s)
  — a comfortably stable design. }
{ Gain and phase margins of an antenna-azimuth position servo }
Kpre = 20
num_pa = [0, 100*Kpre*0.2083]   { preamp * power amp * motor gain }
den_pa = [1, 100]
num_mo = [0, 0, 1]
den_mo = [1, 1.71, 0]
[num_ol, den_ol] = series(num_pa[1:2], den_pa[1:2], num_mo[1:3], den_mo[1:3])
[gm, pm, w_cg, w_cp] = margin(num_ol[1:4], den_ol[1:4])
Nw = 50
omega = 0.01:50:100 | Log
[mag, phase] = bode(num_ol[1:4], den_ol[1:4], omega[1:Nw])

PLOT 'Open-Loop Bode'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END
{ CHECK gm 32.41232232919962 4e-5 }
{ CHECK pm 43.87668562421513 5e-5 }
{ CHECK w_cg 1.7183098366852971 2e-6 }
{ CHECK w_cp 13.076697063872832 2e-5 }`,
  },
  {
    id: 'nyquist-stability',
    title: 'Nyquist Diagram & Stability',
    description: 'nyquist evaluates the real and imaginary parts of the open-loop frequency response; the nyquist plot kind draws the polar plot with the −1 + j0 critical point marked. margin quantifies how far the locus stays from that point.',
    category: 'Control Systems',
    text: `{ Nyquist Diagram & Stability }
{ G(s) = 50/[s(s+3)(s+6)] has a 10.2 dB gain margin and a 35.0° phase margin
  — a stable but moderately damped loop. }
{ Nyquist diagram and stability margins of a type-1 loop }
num = [0, 0, 0, 50]
den = [1, 9, 18, 0]
Nw = 50
omega = 0.1:50:100 | Log
[re, im] = nyquist(num[1:4], den[1:4], omega[1:Nw])
[gm, pm, w_cg, w_cp] = margin(num[1:4], den[1:4])

PLOT 'Nyquist Diagram'
  kind = nyquist
  real = re
  imag = im
END
{ CHECK gm 10.21083850339182 2e-5 }
{ CHECK pm 35.014496947549844 4e-5 }`,
  },
  {
    id: 'closed-loop-position-servo',
    title: 'Closed-Loop Position Servo (series + feedback)',
    description: 'A complete block-diagram reduction: cascade a power amplifier and a motor/load block with series, then close the loop with unity feedback. pole confirms the closed-loop stability and step shows the transient.',
    category: 'Control Systems',
    text: `{ Closed-Loop Position Servo (series + feedback) }
{ Antenna-azimuth plant (preamp 50 · 100/(s+100) · 0.2083/[s(s+1.71)]) under
  unity feedback has stable closed-loop poles at −100.1 and −0.80 ± j3.12,
  giving a lightly damped step response. }
{ Closed-loop position servo: cascade then feed back }
Kpre = 50
num_pa = [0, 100*Kpre]
den_pa = [1, 100]
num_mo = [0, 0, 0.2083]
den_mo = [1, 1.71, 0]
[num_g, den_g] = series(num_pa[1:2], den_pa[1:2], num_mo[1:3], den_mo[1:3])
num_h = [1]
den_h = [1]
[num_cl, den_cl] = feedback(num_g[1:4], den_g[1:4], num_h[1:1], den_h[1:1])
[cpr, cpi] = pole(num_cl[1:4], den_cl[1:4])
t = 0:0.05:3
N = 61
[y] = step(num_cl[1:4], den_cl[1:4], t[1:N])

PLOT 'Closed-Loop Step'
  kind = xy
  x = t
  y = y
  xlabel = Time [s]
  ylabel = Position
END
{ CHECK cpr[1] -100.10573628077249 2e-4 }
{ CHECK cpr[2] -0.8021318596137694 9e-7 }
{ CHECK cpi[3] 3.1241932843517843 4e-6 }
{ CHECK y[61] 1.0885569185278223 2e-6 }`,
  },
  {
    id: 'pid-auto-tune',
    title: 'PID Auto-Tuning by Loop Shaping',
    description: 'pidtune sizes a P, PI or PID controller (quoted type) so the open loop crosses over at the target frequency wc with a 60° phase-margin objective. The tuned controller is then assembled as (Kd·s² + Kp·s + Ki)/s, cascaded with the plant via series, and verified with margin.',
    category: 'Control Systems',
    text: `{ PID Auto-Tuning by Loop Shaping }
{ For plant (s+8)/[(s+3)(s+6)(s+10)] at wc = 5 rad/s the gains are Kp ≈
  48.3, Ki ≈ 195.3, Kd ≈ 2.98; the closed verification confirms a 60.0°
  phase margin at exactly 5 rad/s. }
{ PID auto-tuning for plant G(s) = (s+8) / [(s+3)(s+6)(s+10)] }
num = [0, 0, 1, 8]
den = [1, 19, 108, 180]
wc = 5 [rad/s]
[Kp, Ki, Kd] = pidtune(num[1:4], den[1:4], 'PID', wc)
{ Assemble C(s) = Kp + Ki/s + Kd s = (Kd s^2 + Kp s + Ki)/s and check the loop }
num_c = [Kd, Kp, Ki]
den_c = [0, 1, 0]
[num_ol, den_ol] = series(num_c[1:3], den_c[1:3], num[1:4], den[1:4])
[gm, pm, w_cg, w_cp] = margin(num_ol[1:6], den_ol[1:6])
{ CHECK Kp 48.25945855220656 5e-5 }
{ CHECK Ki 195.3411531711528 2e-4 }
{ CHECK Kd 2.9806511607305244 3e-6 }
{ CHECK pm 60.000326960680795 7e-5 }
{ CHECK w_cg 5.000087816619355 6e-6 }`,
  },
  {
    id: 'pole-placement',
    title: 'Pole Placement by State Feedback',
    description: 'place computes the state-feedback gain K (Ackermann\'s formula) that relocates the eigenvalues of A − B·K to the requested locations, supplied as real/imaginary arrays (complex poles in conjugate pairs). The closed-loop matrix is rebuilt and pole confirms the placement.',
    category: 'Control Systems',
    text: `{ Pole Placement by State Feedback }
{ Relocating the phase-variable plant (den s³+9s²+26s+24) to poles −10 and
  −2 ± j2 gives K = [56, 22, 5]; the closed-loop A − B·K poles land exactly
  on the targets. }
{ State-feedback pole placement via Ackermann's formula }
A[1,1]=0; A[1,2]=1; A[1,3]=0
A[2,1]=0; A[2,2]=0; A[2,3]=1
A[3,1]=-24; A[3,2]=-26; A[3,3]=-9
B[1]=0; B[2]=0; B[3]=1
{ Desired closed-loop poles: -10 and -2 +/- j2 }
des_pr = [-2, -2, -10]
des_pi = [2, -2, 0]
[K] = place(A[1:3,1:3], B[1:3], des_pr[1:3], des_pi[1:3])
{ Verify: rebuild Acl = A - B K and read its poles }
Acl[1,1]=A[1,1]-B[1]*K[1]; Acl[1,2]=A[1,2]-B[1]*K[2]; Acl[1,3]=A[1,3]-B[1]*K[3]
Acl[2,1]=A[2,1]-B[2]*K[1]; Acl[2,2]=A[2,2]-B[2]*K[2]; Acl[2,3]=A[2,3]-B[2]*K[3]
Acl[3,1]=A[3,1]-B[3]*K[1]; Acl[3,2]=A[3,2]-B[3]*K[2]; Acl[3,3]=A[3,3]-B[3]*K[3]
[ppr, ppi] = pole(Acl[1:3,1:3])
{ CHECK K[1] 56 6e-5 }
{ CHECK K[2] 22 3e-5 }
{ CHECK K[3] 5 5e-6 }
{ CHECK ppr[1] -9.999999999999986 1e-5 }`,
  },
  {
    id: 'lqr-regulator',
    title: 'LQR Optimal State-Feedback Regulator',
    description: 'lqr returns the state-feedback gain K that minimizes ∫(x\'Qx + u\'Ru) dt, solving the algebraic Riccati equation via the matrix sign function of the Hamiltonian. The closed-loop A − B·K is guaranteed stable.',
    category: 'Control Systems',
    text: `{ LQR Optimal State-Feedback Regulator }
{ With Q = I and R = 1 on a third-order plant the optimal gain is K ≈
  [1.019, −0.101, −0.191]; the closed-loop poles −9.95, −2.23 and −1.01 are
  all in the left half-plane. }
{ LQR optimal regulator: minimize the quadratic cost integral }
A[1,1]=0; A[1,2]=1; A[1,3]=0
A[2,1]=0; A[2,2]=0; A[2,3]=1
A[3,1]=-1; A[3,2]=-2; A[3,3]=-3
B[1]=10; B[2]=0; B[3]=0
Q[1,1]=1; Q[1,2]=0; Q[1,3]=0
Q[2,1]=0; Q[2,2]=1; Q[2,3]=0
Q[3,1]=0; Q[3,2]=0; Q[3,3]=1
R = 1
[K] = lqr(A[1:3,1:3], B[1:3], Q[1:3,1:3], R)
{ Verify the closed-loop poles are stable }
Acl[1,1]=A[1,1]-B[1]*K[1]; Acl[1,2]=A[1,2]-B[1]*K[2]; Acl[1,3]=A[1,3]-B[1]*K[3]
Acl[2,1]=A[2,1]-B[2]*K[1]; Acl[2,2]=A[2,2]-B[2]*K[2]; Acl[2,3]=A[2,3]-B[2]*K[3]
Acl[3,1]=A[3,1]-B[3]*K[1]; Acl[3,2]=A[3,2]-B[3]*K[2]; Acl[3,3]=A[3,3]-B[3]*K[3]
[ppr, ppi] = pole(Acl[1:3,1:3])
{ CHECK K[1] 1.018888843248274 2e-6 }
{ CHECK K[2] -0.10052524206339133 2e-7 }
{ CHECK K[3] -0.19067237447902688 2e-7 }
{ CHECK ppr[1] -9.950447060618899 1e-5 }`,
  },
  {
    id: 'control-analysis-report-third-order',
    title: 'End-to-End Analysis Report',
    description: 'A single document that walks through a complete plant analysis — poles/zeros, stability margins, Bode, Nyquist and step response — with the narrative in comments and each figure declared by a named PLOT block. Solve, then open the Plots window.',
    category: 'Control Systems',
    text: `{ End-to-End Analysis Report }
{ Analyzes G(s) = (s+3)/[(s+2)(s²+2s+25)]: all poles are left-half-plane
  (stable), and the lightly damped pole pair produces a pronounced, slowly
  decaying step response. The poles are s = −2 and s = −1 ± j√24 = −1 ±
  j4.90, and the zero is s = −3. This copy analyses a third-order plant; the
  gallery's control-analysis-report analyses (s+2)/(s²+4s+25). }
{ Control System Analysis Report

  This document analyzes the plant G(s) end to end: poles and zeros, gain and
  phase margins, frequency response (Bode and Nyquist), and the unit step
  response. Press Solve (F2), then open the Plots window — each PLOT block
  below declares a named figure. }

{ 1. Plant model — the numerator and denominator coefficients (descending
  powers of s) define a third-order plant with one real zero, one real pole,
  and a lightly damped second-order pole pair. }
num = [0, 0, 1, 3]
den = [1, 4, 29, 50]

{ 2. Poles, zeros and stability margins — all three poles lie in the left
  half-plane, so the open-loop plant is stable. }
[pr, pi] = pole(num[1:4], den[1:4])
[zr, zi] = zero(num[1:4], den[1:4])
[gm, pm, w_cg, w_cp] = margin(num[1:4], den[1:4])

{ 3. Frequency response — sweep 50 logarithmically spaced frequencies, then
  evaluate the Bode and Nyquist responses. }
Nw = 50
omega = 0.1:50:100 | Log
[mag, phase] = bode(num[1:4], den[1:4], omega[1:Nw])
[re, im] = nyquist(num[1:4], den[1:4], omega[1:Nw])

{ 4. Time-domain step response — the lightly damped pole pair produces a
  pronounced, slowly decaying oscillation over 6 seconds. }
Nt = 121
t = 0:0.05:6
[y] = step(num[1:4], den[1:4], t[1:Nt])

PLOT 'Pole-Zero Map'
  kind = polezero
  pr = pr
  pi = pi
  zr = zr
  zi = zi
END

PLOT 'Bode Diagram'
  kind = bode
  omega = omega
  mag = mag
  phase = phase
END

PLOT 'Nyquist Diagram'
  kind = nyquist
  real = re
  imag = im
END

PLOT 'Step Response'
  kind = xy
  x = t
  y = y
  xlabel = Time [s]
  ylabel = Amplitude
END
{ CHECK pr[1] -2 2e-6 }
{ CHECK pi[2] -4.89897948556636 5e-6 }
{ CHECK zr[1] -3 3e-6 }
{ CHECK y[121] 0.06007954183190265 7e-8 }`,
  },
  {
    id: 'ode-decay',
    title: 'Radioactive Decay — ode1 (Euler)',
    description: 'First-order decay dc/dt = -k·c. Verify: c(20) = 100·e^(-0.175·20) ≈ 3.02.',
    category: 'Dynamics & ODEs',
    text: `{ Radioactive Decay — ode1 (Euler) }
{ Fixed-step Euler (ode1) — lowest order; many points keep it accurate.
  Euler with h = 0.025 s gives c(20) = 100(1 − kh)^800 = 2.997 exactly,
  against the exact 100·e^(−3.5) = 3.020; the 0.8 % gap is ode1's truncation
  error. }
{ Radioactive decay — verify c(20) = 100 e^(-0.175*20) = 3.02 }
k = 0.175
DYNAMIC decay (method = ode1, t = 0 .. 20, points = 800)
  der(c) = -k * c
  c(0) = 100
END
{ Read-backs }
c_end = FinalValue('c')            { c(20) }
{ CHECK c_end 2.996610729654572 3e-6 }`,
  },
  {
    id: 'ode-rc',
    title: 'RC Circuit Charging — ode2 (Heun)',
    description: 'Capacitor charging de/dt = (es-e)/(RC). Verify: e(0.006) = 10(1-e^(-6)) ≈ 9.975 V.',
    category: 'Dynamics & ODEs',
    text: `{ RC Circuit Charging — ode2 (Heun) }
{ RC charging — verify e -> es = 10 V; e(0.006) = 9.975 V }
R = 1000
C = 1e-6
es = 10
DYNAMIC rc (method = ode2, t = 0 .. 0.006, points = 400)
  der(e) = (es - e) / (R * C)
  e(0) = 0
END
{ Read-backs }
e_end = FinalValue('e')            { e(0.006) }
{ CHECK e_end 9.97520680880523 1e-5 }`,
  },
  {
    id: 'ode-reaction',
    title: 'First-Order Reaction A→B — ode3',
    description: 'cA = e^(-k·t), cB = 1 - e^(-k·t). Verify: cA(5) ≈ 0.030, cB(5) ≈ 0.970.',
    category: 'Dynamics & ODEs',
    text: `{ First-Order Reaction A→B — ode3 }
{ Irreversible reaction A -> B; cA + cB is conserved = 1 }
k = 0.7
DYNAMIC reaction (method = ode3, t = 0 .. 5, points = 300)
  der(cA) = -k * cA
  der(cB) =  k * cA
  cA(0) = 1
  cB(0) = 0
END
{ Read-backs }
cA_end = FinalValue('cA')          { cA(5) }
cB_end = FinalValue('cB')          { cB(5) }
{ CHECK cA_end 0.030197376292403516 4e-8 }
{ CHECK cB_end 0.969802623707596 1e-6 }`,
  },
  {
    id: 'ode-rl',
    title: 'RL Circuit Decay — ode4 (RK4)',
    description: 'L·di/dt + R·i = 0 → i = 0.5·e^(-1.5·t). Verify: i(2) = 0.5·e^(-3) ≈ 0.0249 A.',
    category: 'Dynamics & ODEs',
    text: `{ RL Circuit Decay — ode4 (RK4) }
{ Classic fourth-order Runge–Kutta. }
{ RL natural response — verify i(2) = 0.5 e^(-3) = 0.0249 A }
L = 1
R = 1.5
DYNAMIC rl (method = ode4, t = 0 .. 2, points = 200)
  der(i) = -(R / L) * i
  i(0) = 0.5
END
{ Read-backs }
i_end = FinalValue('i')            { i(2) }
{ CHECK i_end 0.024893534216482525 3e-8 }`,
  },
  {
    id: 'ode-cooling',
    title: 'Newton Cooling — ode5',
    description: 'T = Ta + (T0-Ta)·e^(-k·t). Verify: T(30) = 20 + 70·e^(-3) ≈ 23.48 °C.',
    category: 'Dynamics & ODEs',
    text: `{ Newton Cooling — ode5 }
{ Time is named 'time' because a state T collides with a time variable t. }
{ Newton cooling — verify T(30) = 20 + 70 e^(-3) = 23.48 }
k = 0.1
Ta = 20
DYNAMIC cooling (method = ode5, time = 0 .. 30, points = 200)
  der(T) = -k * (T - Ta)
  T(0) = 90
END
{ Read-backs }
T_end = FinalValue('T')            { T(30) }
{ CHECK T_end 23.48509478575282 3e-5 }`,
  },
  {
    id: 'ode-parachutist',
    title: 'Falling Parachutist (linear drag) — ode45',
    description: 'dv/dt = g - (c/m)·v. Verify: terminal v = g·m/c = 53.44 m/s.',
    category: 'Dynamics & ODEs',
    text: `{ Falling Parachutist (linear drag) — ode45 }
{ Adaptive Dormand–Prince 5(4) — the default method. At t = 30 s, v =
  (g·m/c)(1 − e^(−c·t/m)) = 53.23 m/s. }
{ Falling parachutist — verify terminal velocity g*m/c = 53.44 m/s }
g = 9.81
m = 68.1
c = 12.5
DYNAMIC fall (method = ode45, t = 0 .. 30, points = 600, rtol = 1e-8)
  der(v) = g - (c / m) * v
  v(0) = 0
END
{ Read-backs }
v_end = FinalValue('v')            { v(30) }
{ CHECK v_end 53.227901516828524 6e-5 }`,
  },
  {
    id: 'ode-tank',
    title: 'Draining Tank (Torricelli) — ode23',
    description: 'dy/dt = -k·√y → y = (√3 - 0.03·t)². Verify: y(20) = (√3-0.6)² ≈ 1.281 m.',
    category: 'Dynamics & ODEs',
    text: `{ Draining Tank (Torricelli) — ode23 }
{ Adaptive Bogacki–Shampine 3(2). }
{ Torricelli draining — verify y(20) = (sqrt(3) - 0.6)^2 = 1.281 m }
k = 0.06
DYNAMIC tank (method = ode23, t = 0 .. 20, points = 200, rtol = 1e-8)
  der(y) = -k * sqrt(y)
  y(0) = 3
END
{ Read-backs }
y_end = FinalValue('y')            { y(20) }
{ CHECK y_end 1.2815390252541548 2e-6 }`,
  },
  {
    id: 'ode-logistic',
    title: 'Logistic Population Growth — ode45',
    description: 'dp/dt = r(1-p/K)p → p = K/(1+3.6967·e^(-r·t)). Verify: p(100) ≈ 9414 million.',
    category: 'Dynamics & ODEs',
    text: `{ Logistic Population Growth — ode45 }
{ Logistic growth — verify p(100) = 12000/(1 + 3.6967 e^(-2.6)) = 9414 }
r = 0.026
K = 12000
DYNAMIC logistic (method = ode45, t = 0 .. 100, points = 200, rtol = 1e-9)
  der(p) = r * (1 - p / K) * p
  p(0) = 2555
END
{ Read-backs }
p_end = FinalValue('p')            { p(100) }
{ CHECK p_end 9414.97580117947 1e-2 }`,
  },
  {
    id: 'ode-quadratic-drag',
    title: 'Terminal Velocity (quadratic drag) — ode45',
    description: 'dv/dt = g - (c/m)·v² → v = v_t·tanh(t·√(gc/m)), v_t = √(g·m/c) ≈ 52.41 m/s.',
    category: 'Dynamics & ODEs',
    text: `{ Terminal Velocity (quadratic drag) — ode45 }
{ At t = 20 s, v = 52.41·tanh(20·√(g·c/m)) = 52.35 m/s. }
{ Quadratic drag — verify terminal velocity sqrt(g*m/c) = 52.41 m/s }
g = 9.81
m = 70
c = 0.25
DYNAMIC fall2 (method = ode45, t = 0 .. 20, points = 300, rtol = 1e-9)
  der(v) = g - (c / m) * v * v
  v(0) = 0
END
{ Read-backs }
v_end = FinalValue('v')            { v(20) }
{ CHECK v_end 52.35123054492861 6e-5 }`,
  },
  {
    id: 'ode-msd',
    title: 'Mass-Spring-Damper (underdamped) — ode45',
    description: 'm·x\'\' + c·x\' + k·x = 0 (two states). Verify: x(5) ≈ 0.066 m (decaying sinusoid).',
    category: 'Dynamics & ODEs',
    text: `{ Mass-Spring-Damper (underdamped) — ode45 }
{ A true two-state ODE; plot x vs time, or v vs x (phase portrait). }
{ Underdamped vibration — m=20, c=5, k=20. Verify x(5) = 0.066 m }
m = 20
c = 5
k = 20
DYNAMIC vib (method = ode45, t = 0 .. 15, points = 600, rtol = 1e-9)
  der(x) = v
  der(v) = -(c/m) * v - (k/m) * x
  x(0) = 1
  v(0) = 0
END
{ Read-backs }
x_5 = ODEValue('x', 5)             { x(5) }
{ CHECK x_5 0.06621259237649049 7e-8 }`,
  },
  {
    id: 'ode-shm',
    title: 'Undamped Oscillator (energy check) — ode4',
    description: 'x\'\' + ω²x = 0 → x = cos(ωt). Verify: x(2π) = 1 and energy E = 2 is conserved.',
    category: 'Dynamics & ODEs',
    text: `{ Undamped Oscillator (energy check) — ode4 }
{ Energy E = ½v² + ½ω²x² is an algebraic auxiliary column you can plot. }
{ Simple harmonic motion — verify x(2pi)=1 and E stays 2 }
w = 2
DYNAMIC shm (method = ode4, t = 0 .. 6.283185307, points = 400)
  der(x) = v
  der(v) = -w*w * x
  E = 0.5 * v*v + 0.5 * w*w * x*x
  x(0) = 1
  v(0) = 0
END
{ Read-backs }
x_end = FinalValue('x')            { x(2 pi) }
E_end = FinalValue('E')            { energy at 2 pi }
{ CHECK x_end 0.9999999972961708 1e-6 }
{ CHECK E_end 1.9999999891847047 2e-6 }`,
  },
  {
    id: 'ode-pendulum',
    title: 'Simple Pendulum (small angle) — ode5',
    description: 'θ\'\' + (g/l)θ = 0 → θ = (π/4)cos(√(g/l)·t). Verify: θ(1) ≈ -0.506 rad.',
    category: 'Dynamics & ODEs',
    text: `{ Simple Pendulum (small angle) — ode5 }
{ θ(1) = (π/4)·cos(√(g/l)) = −0.5059 rad. }
{ Small-angle pendulum — g=32.2 ft/s^2, l=2 ft. Verify theta(1) = -0.506 rad }
g = 32.2
l = 2
DYNAMIC pend (method = ode5, t = 0 .. 3, points = 600)
  der(theta) = omega
  der(omega) = -(g/l) * theta
  theta(0) = pi# / 4
  omega(0) = 0
END
{ Read-backs }
theta_1 = ODEValue('theta', 1)     { theta(1) }
{ CHECK theta_1 -0.5058896310934342 6e-7 }`,
  },
  {
    id: 'ode-rlc',
    title: 'Series RLC Circuit (underdamped) — ode23',
    description: 'L·q\'\' + R·q\' + q/C = 0. Verify: q(0.05) ≈ 0.153 C (decaying oscillation).',
    category: 'Dynamics & ODEs',
    text: `{ Series RLC Circuit (underdamped) — ode23 }
{ Capacitance is named Cap because C is conventionally a constant elsewhere. }
{ Series RLC — L=5, R=280, C=1e-4. Verify q(0.05) = 0.153 C }
L = 5
R = 280
Cap = 1e-4
DYNAMIC rlc (method = ode23, t = 0 .. 0.2, points = 400, rtol = 1e-9)
  der(q) = i
  der(i) = -(R/L) * i - (1/(L*Cap)) * q
  q(0) = 1
  i(0) = 0
END
{ Read-backs }
q_005 = ODEValue('q', 0.05)        { q(0.05) }
{ CHECK q_005 0.1526785683271647 2e-7 }`,
  },
  {
    id: 'ode-lotka',
    title: 'Lotka–Volterra Predator–Prey — ode45',
    description: 'Coupled nonlinear system; the invariant V = d·x - c·ln x + b·y - a·ln y stays constant.',
    category: 'Dynamics & ODEs',
    text: `{ Lotka–Volterra Predator–Prey — ode45 }
{ No closed-form time solution — verified via the conserved invariant V (an
  aux column). The CHECKs grade V at t = 30 against its value at t = 0. }
{ Predator-prey — V = d*x - c*ln(x) + b*y - a*ln(y) is conserved.
  Plot y vs x for the closed phase-plane orbit. }
a = 1.2
b = 0.6
cc = 0.8
d = 0.3
DYNAMIC lv (method = ode45, t = 0 .. 30, points = 600, rtol = 1e-9)
  der(x) = a*x - b*x*y
  der(y) = -cc*y + d*x*y
  V = d*x - cc*ln(x) + b*y - a*ln(y)
  x(0) = 2
  y(0) = 1
END
{ Read-backs }
V_0 = ODEValue('V', 0)             { invariant at t = 0 }
V_end = FinalValue('V')            { invariant at t = 30 }
{ CHECK V_0 0.6454822555520437 7e-7 }
{ CHECK V_end 0.6454822555520437 7e-7 }`,
  },
  {
    id: 'ode-tanks',
    title: 'Coupled Mixing Tanks — ode23',
    description: 'Two tanks exchanging fluid. Verify: both approach the mean (5), total stays 10.',
    category: 'Dynamics & ODEs',
    text: `{ Coupled Mixing Tanks — ode23 }
{ Coupled mixing — verify c1,c2 -> 5 and total = c1+c2 stays 10 }
kk = 0.5
DYNAMIC tanks (method = ode23, t = 0 .. 20, points = 200, rtol = 1e-8)
  der(c1) = kk * (c2 - c1)
  der(c2) = kk * (c1 - c2)
  total = c1 + c2
  c1(0) = 10
  c2(0) = 0
END
{ Read-backs }
c1_end = FinalValue('c1')          { c1(20) }
total_end = FinalValue('total')    { c1 + c2 at t = 20 }
{ CHECK c1_end 5.000000010262159 6e-6 }
{ CHECK total_end 10.000000000000012 1e-5 }`,
  },
  {
    id: 'ode-orbit',
    title: 'Two-Body Circular Orbit — ode45',
    description: 'Four-state gravitational orbit (r=1, μ=1, v=1). Verify: returns to (1,0) at t=2π.',
    category: 'Dynamics & ODEs',
    text: `{ Two-Body Circular Orbit — ode45 }
{ Plot y vs x for the circular trajectory; r is an aux column that stays 1. }
{ Circular orbit — verify x(2pi)=1, y(2pi)=0, radius r stays 1 }
mu = 1
DYNAMIC orbit (method = ode45, t = 0 .. 6.283185307, points = 400, rtol = 1e-10)
  r = sqrt(x*x + y*y)
  der(x) = vx
  der(y) = vy
  der(vx) = -mu * x / r^3
  der(vy) = -mu * y / r^3
  x(0) = 1
  y(0) = 0
  vx(0) = 0
  vy(0) = 1
END
{ Read-backs }
x_end = FinalValue('x')            { x(2 pi) }
r_end = FinalValue('r')            { radius at 2 pi }
{ CHECK x_end 1.0000000030301097 2e-6 }
{ CHECK r_end 1.0000000030301097 2e-6 }`,
  },
  {
    id: 'ode-stiff-linear',
    title: 'Classic Stiff Linear ODE — ode15s',
    description: 'y\' = -1000y + 3000 - 2000·e^(-t) → y = 3 - 0.998·e^(-1000t) - 2.002·e^(-t). Verify: y(0.4) ≈ 1.658.',
    category: 'Dynamics & ODEs',
    text: `{ Classic Stiff Linear ODE — ode15s }
{ Stiff: explicit methods need tiny steps; ode15s (implicit BDF) handles it
  easily. }
{ Stiff linear ODE — verify y(0.4) = 3 - 2.002 e^(-0.4) = 1.658 }
DYNAMIC stiff (method = ode15s, t = 0 .. 0.4, points = 200, rtol = 1e-7)
  der(y) = -1000*y + 3000 - 2000*exp(-t)
  y(0) = 0
END
{ Read-backs }
y_end = FinalValue('y')            { y(0.4) }
{ CHECK y_end 1.6580178836156905 2e-6 }`,
  },
  {
    id: 'ode-vanderpol',
    title: 'Van der Pol Oscillator (stiff) — ode23s',
    description: 'μ = 1000 relaxation oscillator. Verify: the slow manifold keeps y1 bounded (≈ 2).',
    category: 'Dynamics & ODEs',
    text: `{ Van der Pol Oscillator (stiff) — ode23s }
{ Very stiff — needs the implicit Rosenbrock solver ode23s (or ode15s). }
{ Van der Pol, mu = 1000 — extremely stiff. Verify |y1| stays near 2 }
mu = 1000
DYNAMIC vdp (method = ode23s, t = 0 .. 1, points = 100, rtol = 1e-4, atol = 1e-7)
  der(y1) = y2
  der(y2) = mu * (1 - y1*y1) * y2 - y1
  y1(0) = 2
  y2(0) = 0
END
{ Read-backs }
y1_end = FinalValue('y1')          { y1(1) }
{ CHECK y1_end 1.99933337050631 2e-6 }`,
  },
  {
    id: 'ode-robertson',
    title: 'Robertson Chemical Kinetics (stiff) — ode23s',
    description: 'Three-species stiff kinetics with rates 0.04 / 1e4 / 3e7. Verify: c1+c2+c3 = 1 (mass conserved).',
    category: 'Dynamics & ODEs',
    text: `{ Robertson Chemical Kinetics (stiff) — ode23s }
{ A standard stiff benchmark; the fast transient dies quickly. }
{ Robertson kinetics — verify total concentration c1+c2+c3 stays 1 }
DYNAMIC rob (method = ode23s, t = 0 .. 40, points = 100, rtol = 1e-6, atol = 1e-10)
  der(c1) = -0.04*c1 + 1e4*c2*c3
  der(c2) = 0.04*c1 - 1e4*c2*c3 - 3e7*c2*c2
  der(c3) = 3e7*c2*c2
  c1(0) = 1
  c2(0) = 0
  c3(0) = 0
END
{ Read-backs }
c1_end = FinalValue('c1')          { c1(40) }
total_end = FinalValue('c1') + FinalValue('c2') + FinalValue('c3')   { mass at t = 40 }
{ CHECK c1_end 0.7158271282510661 8e-7 }
{ CHECK total_end 0.9999999999999998 1e-6 }`,
  },
  {
    id: 'ode-chain',
    title: 'Stiff Reaction Chain A→B→C — ode15s',
    description: 'Disparate rates (k1=1000 fast, k2=1 slow). Verify: A is consumed and a+b+c = 1.',
    category: 'Dynamics & ODEs',
    text: `{ Stiff Reaction Chain A→B→C — ode15s }
{ C(5) = 1 − (k1·e^(−k2·t) − k2·e^(−k1·t))/(k1 − k2) = 0.99326. }
{ Stiff chain A->B->C — verify A -> 0 fast and total mass stays 1 }
k1 = 1000
k2 = 1
DYNAMIC chain (method = ode15s, t = 0 .. 5, points = 150, rtol = 1e-7)
  der(a) = -k1 * a
  der(b) =  k1 * a - k2 * b
  der(cc) = k2 * b
  a(0) = 1
  b(0) = 0
  cc(0) = 0
END
{ Read-backs }
cc_end = FinalValue('cc')          { C formed by t = 5 }
total_end = FinalValue('a') + FinalValue('b') + FinalValue('cc')   { mass at t = 5 }
{ CHECK cc_end 0.9932553045825778 1e-6 }
{ CHECK total_end 1.0000000000000049 1e-6 }`,
  },
  {
    id: 'ev-longitudinal',
    title: 'EV Longitudinal Road-Load, Power & Range',
    description: 'The longitudinal road-load model for an electric car: tractive force as the sum of rolling resistance, aerodynamic drag and road grade, then wheel power, battery power through the drivetrain efficiency, the energy consumed per metre, and the range from a usable pack. Change the grade angle alpha to see hill-climb demand. (Grounded in the Electric Vehicle Design text in the linked notebook.)',
    category: 'Electrical & Powertrain',
    text: `{ EV Longitudinal Road-Load, Power & Range }
{ Flat 120 km/h cruise: tractive force ≈ 617 N, battery power ≈ 24 kW,
  consumption ≈ 721 J/m (≈ 200 Wh/km), and ≈ 2.995e5 m ≈ 300 km of range
  from a 60 kWh pack. Set alpha = 5 [deg] and the climb term M·g·sin(alpha)
  dominates. }
{ EV longitudinal road-load: force, power, consumption and range }
{ F_trac = rolling + grade + aero; P_batt = P_wheel / drivetrain efficiency. }
M = 1500 [kg]          { vehicle mass }
g = 9.81 [m/s^2]
Crr = 0.012            { rolling-resistance coefficient }
rho = 1.2 [kg/m^3]     { air density }
Cd = 0.30              { drag coefficient }
A_f = 2.2 [m^2]        { frontal area }
alpha = 0 [deg]        { road grade angle (0 = flat) }
V = 120 [km/h]         { cruise speed (auto-converts to m/s) }
eta_t = 0.90           { transmission efficiency }
eta_m = 0.95           { motor + inverter efficiency }
E_pack = 60 [kWh]      { usable battery energy }

F_roll  = M*g*Crr*cos(alpha)
F_grade = M*g*sin(alpha)
F_aero  = 0.5*rho*Cd*A_f*V^2
F_trac  = F_roll + F_grade + F_aero
P_wheel = F_trac*V
P_batt  = P_wheel/(eta_t*eta_m)
cons    = P_batt/V          { energy per distance [J/m]; divide by 3.6 for Wh/km }
Range   = E_pack/cons       { [m]; /1000 for km }
{ CHECK F_trac 616.5800000000002 7e-4 }
{ CHECK P_batt 24038.20662768032 3e-2 }
{ CHECK cons 721.1461988304095 8e-4 }
{ CHECK Range 299523.1762301728 3e-1 }`,
  },
  {
    id: 'ev-lateral',
    title: 'Lateral Bicycle Model & Understeer Gradient',
    description: 'The steady-state single-track (bicycle) model: axle loads from the CG position, the understeer gradient from front/rear cornering stiffness, the front steer angle to hold a curve (Ackermann plus the dynamic term), and the characteristic speed of the understeering vehicle. Kus > 0 confirms a stable, understeering layout.',
    category: 'Electrical & Powertrain',
    text: `{ Lateral Bicycle Model & Understeer Gradient }
{ With the front-biased CG and equal axle stiffness, Kus ≈ 0.037
  (understeer). At R = 100 m and 25 m/s the required steer is δ ≈ 3.0°, and
  the characteristic speed (steer = twice Ackermann, peak yaw gain) is ≈
  27.6 m/s ≈ 99 km/h. }
{ Steady-state lateral (bicycle) model: understeer gradient and steer angle }
m = 1730 [kg]
g = 9.81 [m/s^2]
a = 1.189 [m]          { CG to front axle }
b = 1.696 [m]          { CG to rear axle }
Cf = 80000 [N/rad]     { front axle cornering stiffness }
Cr = 80000 [N/rad]     { rear axle cornering stiffness }
R = 100 [m]            { turn radius }
V = 25 [m/s]           { cornering speed }

L = a + b                       { wheelbase }
W_f = m*g*b/L                   { static front axle load }
W_r = m*g*a/L                   { static rear axle load }
Kus = W_f/Cf - W_r/Cr           { understeer gradient (>0 understeer) }
a_y = V^2/(g*R)                 { lateral acceleration [g] }
delta = L/R + Kus*a_y           { front steer angle [rad] }
delta_deg = delta*Convert('rad','deg')
u_char = sqrt(g*L/Kus)          { characteristic speed [m/s] }
{ CHECK Kus 0.0372809753032929 4e-8 }
{ CHECK delta_deg 3.0138666111556214 4e-6 }
{ CHECK u_char 27.552675651992605 3e-5 }`,
  },
  {
    id: 'ev-sizing',
    title: 'Motor & Battery Sizing (acceleration, gradeability, range)',
    description: 'Sizes the traction motor and battery from performance targets. The motor must satisfy the harder of two demands — mean power to reach 100 km/h in the acceleration time, and steady power to hold a 6° grade at 60 km/h — taken with max(). The battery is sized from the cruise road-load and a target range. (Methodology from the Electric Vehicle Design text in the linked notebook.)',
    category: 'Electrical & Powertrain',
    text: `{ Motor & Battery Sizing (acceleration, gradeability, range) }
{ Acceleration (≈93 kW) dominates gradeability (≈37 kW), so size the motor
  at ≈93 kW. A 400 km range at 110 km/h needs E_need ≈ 2.5e8 J ≈ 69 kWh of
  usable energy. }
{ EV motor + battery sizing from acceleration, gradeability and range }
M = 1600 [kg]
g = 9.81 [m/s^2]
Crr = 0.012
rho = 1.2 [kg/m^3]
Cd = 0.28
A_f = 2.3 [m^2]
eta = 0.88             { combined drivetrain efficiency }

{ 1) Acceleration: mean power to reach V_f in t_acc (energy method) }
V_f = 100 [km/h]
t_acc = 7 [s]
delta = 1.05           { rotational-inertia mass factor }
E_kin = 0.5*M*delta*V_f^2
P_acc = E_kin/t_acc

{ 2) Gradeability: hold a grade at steady speed }
theta = 6 [deg]
V_grade = 60 [km/h]
F_grade = M*g*(Crr*cos(theta)+sin(theta)) + 0.5*rho*Cd*A_f*V_grade^2
P_grade = F_grade*V_grade/eta

{ Motor must cover the harder requirement }
P_motor = max(P_acc, P_grade)

{ 3) Battery sizing from cruise road-load and target range }
V_cr = 110 [km/h]
F_cr = M*g*Crr + 0.5*rho*Cd*A_f*V_cr^2
cons = F_cr/eta            { [J/m] }
Range_target = 400 [km]
E_need = cons*Range_target { usable energy [J]; /3.6e6 for kWh }
{ CHECK P_acc 92592.5925925926 1e-1 }
{ CHECK P_grade 36654.02047005355 4e-2 }
{ CHECK P_motor 92592.5925925926 1e-1 }
{ CHECK E_need 249596026.93602696 3e2 }`,
  },
  {
    id: 'ev-battery-pack',
    title: 'Battery Pack Design & Cell Selection (Batemo database)',
    description: 'Designs a pack from a target voltage, energy and peak power, then checks a real cell against the load. The cell is the Molicel INR21700-P42A taken from the Batemo Cell Explorer database in the linked notebook. Series count sets voltage, parallel count sets energy; the per-cell peak current must stay under the cell\'s rating. Battery quantities use conventional units (V, Ah, A, Wh, kWh) rather than SI, so they are kept unitless here.',
    category: 'Electrical & Powertrain',
    text: `{ Battery Pack Design & Cell Selection (Batemo database) }
{ 112S × 42P ≈ 4700 cells gives ~400 V, ~175 Ah and ~70 kWh. A 150 kW peak
  draws 375 A from the pack (2.1C) = 9 A per cell — well under the P42A's 45
  A continuous limit (36 A headroom). Round Ns/Np up to whole cells in
  practice. The solver keeps the unrounded counts, Ns = 111.1 and Np = 41.67
  (4630 cells), so the pack energy is exactly 70 kWh and each cell carries
  exactly 9 A. }
{ Battery pack design + cell selection (engineering units, see comments) }
{ Cell: Molicel INR21700-P42A from the Batemo Cell Explorer database. }
V_pack = 400           { target nominal pack voltage [V] }
E_target = 70          { required usable energy [kWh] }
P_peak = 150           { peak power demand [kW] }

V_cell = 3.6           { cell nominal voltage [V] }
Q_cell = 4.2           { cell capacity [Ah] }
I_cell_max = 45        { cell max continuous discharge [A] }
E_cell = V_cell*Q_cell { cell energy [Wh] }

Ns = V_pack/V_cell             { cells in series (round up) }
Np = E_target*1000/(Ns*E_cell) { parallel strings (kWh -> Wh) }
N_cells = Ns*Np
E_pack = N_cells*E_cell/1000   { pack energy [kWh] }
Q_pack = Np*Q_cell             { pack capacity [Ah] }
I_peak = P_peak*1000/V_pack    { peak pack current [A] }
I_cell = I_peak/Np             { current per cell [A] }
C_rate = I_peak/Q_pack         { pack C-rate [1/h] }
margin = I_cell_max - I_cell   { per-cell headroom [A], must be > 0 }
{ CHECK Ns 111.11111111111111 2e-4 }
{ CHECK Np 41.666666666666664 5e-5 }
{ CHECK I_cell 9 9e-6 }
{ CHECK C_rate 2.142857142857143 3e-6 }
{ CHECK margin 36 4e-5 }`,
  },
  {
    id: 'ev-regen',
    title: 'Regenerative Braking Energy Recovery',
    description: 'How much kinetic energy a regenerative brake can return. The motor-as-generator recovers a fraction (regen efficiency) of the vehicle\'s ½·m·V² when slowing from a speed, with the rotational-inertia mass factor included. Shows the energy per stop, how many stops fill 1 kWh, and the total recovered over a stop-and-go trip.',
    category: 'Electrical & Powertrain',
    text: `{ Regenerative Braking Energy Recovery }
{ From 50 km/h a 1600 kg car holds ≈ 162 kJ of kinetic energy; at 65% regen
  ≈ 105 kJ (0.029 kWh) returns per stop, so ≈ 34 such stops bank 1 kWh, and
  a 20-stop city run recovers ≈ 2.1 MJ (≈ 0.58 kWh). (Source caveat: the
  books note real-world regen return is drive-cycle dependent, often 10–30%
  of pack energy in stop-and-go.) }
{ Regenerative braking: kinetic energy recovered per stop and per trip }
M = 1600 [kg]
V = 50 [km/h]          { speed before braking }
eta_regen = 0.65       { fraction of kinetic energy returned to the battery }
delta = 1.05           { rotational-inertia mass factor }

E_kin = 0.5*M*delta*V^2        { kinetic energy [J] }
E_regen = eta_regen*E_kin      { recovered per stop [J]; /3.6e6 for kWh }

E_oneKWh = 1 [kWh]
stops_per_kWh = E_oneKWh/E_regen   { stops to bank 1 kWh }

N_stops = 20                   { stops on a city run }
E_recovered = E_regen*N_stops  { total recovered [J] }
{ CHECK E_kin 162037.03703703705 2e-1 }
{ CHECK E_regen 105324.07407407409 2e-1 }
{ CHECK stops_per_kWh 34.18021978021977 4e-5 }
{ CHECK E_recovered 2106481.481481482 3e0 }`,
  },
  {
    id: 'ev-drive-cycle',
    title: 'Combined Drive-Cycle Consumption & Range',
    description: 'A two-phase (city + highway) drive-cycle estimate. The flat road-load consumption is computed at each phase speed, the city phase gets a regenerative-braking credit, and the phases are blended by distance fraction into a combined consumption and the resulting range from a usable pack.',
    category: 'Electrical & Powertrain',
    text: `{ Combined Drive-Cycle Consumption & Range }
{ 55% city / 45% highway: city ≈ 183 J/m (after a 25% regen credit), highway
  ≈ 596 J/m, blended ≈ 369 J/m (≈ 102 Wh/km), giving ≈ 5.86e5 m ≈ 586 km
  from a 60 kWh pack. }
{ Combined city/highway drive-cycle consumption and range }
M = 1550 [kg]
g = 9.81 [m/s^2]
Crr = 0.011
rho = 1.2 [kg/m^3]
Cd = 0.29
A_f = 2.2 [m^2]
eta = 0.88
E_pack = 60 [kWh]
regen_credit = 0.25        { city energy returned by regen }

V_city = 40 [km/h]
V_hwy = 110 [km/h]
frac_city = 0.55
frac_hwy = 0.45

F_city = M*g*Crr + 0.5*rho*Cd*A_f*V_city^2
F_hwy  = M*g*Crr + 0.5*rho*Cd*A_f*V_hwy^2
cons_city = F_city/eta*(1 - regen_credit)   { [J/m] }
cons_hwy  = F_hwy/eta
cons_avg  = frac_city*cons_city + frac_hwy*cons_hwy
Range     = E_pack/cons_avg                 { [m]; /1000 for km }
{ CHECK cons_city 182.82934027777776 2e-4 }
{ CHECK cons_hwy 596.2030092592593 6e-4 }
{ CHECK cons_avg 368.84749131944443 4e-4 }
{ CHECK Range 585607.8869543695 6e-1 }`,
  },
  {
    id: 'fcev-sizing',
    title: 'Hydrogen Fuel-Cell Vehicle (FCEV) Sizing & Range',
    description: 'Sizes a hydrogen fuel-cell vehicle from its 700-bar tank. Usable electrical energy is the stored hydrogen mass times its lower heating value times the net fuel-cell system efficiency; range follows from the cruise road-load, and the continuous stack power must cover that load. Hydrogen consumption per 100 km falls out for comparison with real cars. (Grounded in the hydrogen-vehicle books in the linked notebook; Toyota Mirai II ≈ 5.6 kg tank.)',
    category: 'Electrical & Powertrain',
    text: `{ Hydrogen Fuel-Cell Vehicle (FCEV) Sizing & Range }
{ 5.6 kg H2 at 45% net FC efficiency ≈ 3.02e8 J usable → ≈ 5.15e5 m ≈ 515
  km. Continuous stack power at 100 km/h ≈ 16.3 kW; hydrogen consumption
  cons_H2 ≈ 1.09e-5 kg/m ≈ 1.09 kg/100 km — right in the 1.0–1.16 kg/100 km
  band for passenger FCEVs. }
{ Hydrogen fuel-cell vehicle: usable energy, range and consumption }
m_H2 = 5.6 [kg]        { usable hydrogen (700 bar tank, Mirai-II class) }
LHV = 120 [MJ/kg]      { hydrogen lower heating value }
eta_fc = 0.45          { net fuel-cell system efficiency }
E_usable = m_H2*LHV*eta_fc      { electrical energy to the drivetrain [J] }

M = 1800 [kg]
g = 9.81 [m/s^2]
Crr = 0.011
rho = 1.2 [kg/m^3]
Cd = 0.29
A_f = 2.4 [m^2]
eta_dt = 0.88
V = 100 [km/h]

F_cr = M*g*Crr + 0.5*rho*Cd*A_f*V^2
cons = F_cr/eta_dt              { road-load energy per distance [J/m] }
Range = E_usable/cons           { [m]; /1000 for km }
P_fc = cons*V                   { continuous stack power at cruise [W] }
cons_H2 = m_H2/Range            { hydrogen use [kg/m]; *1e5 for kg/100 km }
{ CHECK E_usable 302400000 4e2 }
{ CHECK Range 515261.3667998955 6e-1 }
{ CHECK P_fc 16302.40600448934 2e-2 }
{ CHECK cons_H2 0.000010868270669659559 2e-11 }`,
  },
  {
    id: 'ev-fast-charge',
    title: 'DC Fast Charging Time, C-rate & Grid Energy',
    description: 'DC fast-charge sizing over the usual 10→80% SOC window. From the charge current it finds the constant-current charge time, the charge C-rate, the DC power, the energy added, and the grid energy once the charger\'s efficiency is included. Battery quantities use conventional units (V, Ah, A, kWh) and are kept unitless. (Grounded in the EV fast-charging book in the linked notebook.)',
    category: 'Electrical & Powertrain',
    text: `{ DC Fast Charging Time, C-rate & Grid Energy }
{ 175 Ah / 400 V pack, 10→80% at 350 A: ≈ 21 min on the CC phase, 2.0C, 140
  kW DC, 49 kWh added, ≈ 52.7 kWh drawn from the grid at 93% charger
  efficiency. Real charges add a tapering CV phase past ~80%. }
{ EV DC fast charge: time, C-rate, power and grid energy (engineering units) }
V_pack = 400           { nominal pack voltage [V] }
Q_pack = 175           { pack capacity [Ah] }
E_pack = 70            { pack energy [kWh] }
SOC_start = 10         { start state of charge [%] }
SOC_end = 80           { end state of charge [%] }
I_charge = 350         { DC charge current [A] }
eta_charger = 0.93     { charger (grid->DC) efficiency }

dSOC = (SOC_end - SOC_start)/100
Ah_added = dSOC*Q_pack             { charge delivered [Ah] }
t_charge_h = Ah_added/I_charge     { CC-phase time [h] }
t_charge_min = t_charge_h*60
C_rate = I_charge/Q_pack           { charge C-rate [1/h] }
P_charge = V_pack*I_charge/1000    { DC charge power [kW] }
E_added = dSOC*E_pack              { energy added to pack [kWh] }
E_grid = E_added/eta_charger       { energy drawn from grid [kWh] }
{ CHECK t_charge_min 21 3e-5 }
{ CHECK C_rate 2 2e-6 }
{ CHECK P_charge 140 2e-4 }
{ CHECK E_grid 52.68817204301075 6e-5 }`,
  },
  {
    id: 'hev-power-split',
    title: 'Parallel Hybrid (HEV) Power Split',
    description: 'A parallel-hybrid power split at a peak demand point. The total wheel power for hard acceleration on the move is computed from the road load plus the inertial term; the engine is sized to cover about half of the peak, and the electric motor supplies the balance, drawing current from the battery. (Power-split relation and sizing rule from the hybrid-vehicle material in the linked notebook.)',
    category: 'Electrical & Powertrain',
    text: `{ Parallel Hybrid (HEV) Power Split }
{ At 120 km/h with 1.5 m/s² acceleration the wheels need ≈ 126 kW; sizing
  the engine at 50% leaves ≈ 63 kW for the motor, which pulls ≈ 228 A from a
  300 V battery at 92% motor efficiency. }
{ Parallel HEV power split: P_load = P_engine + P_motor }
M = 1700 [kg]
g = 9.81 [m/s^2]
Crr = 0.011
rho = 1.2 [kg/m^3]
Cd = 0.30
A_f = 2.3 [m^2]
eta_dt = 0.88
V_peak = 120 [km/h]    { speed at the peak-power point }
a_peak = 1.5 [m/s^2]   { simultaneous acceleration }
delta = 1.05

F_peak = M*g*Crr + 0.5*rho*Cd*A_f*V_peak^2 + M*delta*a_peak
P_load = F_peak*V_peak/eta_dt      { total wheel power demand }
P_engine = 0.5*P_load              { ICE sized for ~half of peak }
P_motor = P_load - P_engine        { motor supplies the rest }

V_batt = 300 [V]
eta_m = 0.92
I_batt = P_motor/(V_batt*eta_m)    { battery current for the motor [A] }
{ CHECK P_load 125793.44696969699 2e-1 }
{ CHECK P_motor 62896.723484848495 7e-2 }
{ CHECK I_batt 227.88667929292933 3e-4 }`,
  },
  {
    id: 'cell-to-pack-density',
    title: 'Cell-to-Pack Mass & Gravimetric Energy Density',
    description: 'Scales single-cell mass and energy up to a full pack, then compares cell- and pack-level specific energy. The pack mass adds structure, busbars, cooling and the BMS via a cell-mass fraction (cell-to-pack mass efficiency), which dilutes the gravimetric energy density from cell to pack level.',
    category: 'Electrical & Powertrain',
    text: `{ Cell-to-Pack Mass & Gravimetric Energy Density }
{ 4700 × 21700 cells (70 g, 15.1 Wh each): cell-level ≈ 7.77e5 J/kg ≈ 216
  Wh/kg, but at a 0.70 cell-mass fraction the 470 kg pack delivers ≈ 5.44e5
  J/kg ≈ 151 Wh/kg (divide J/kg by 3600 for Wh/kg). }
{ Cell-to-pack mass and gravimetric energy density }
N_cells = 4700
m_cell = 0.070 [kg]        { 21700 cell mass (~70 g) }
E_cell = 54.4 [kJ]         { cell energy (~15.1 Wh) }
pack_mass_factor = 0.70    { cell mass / pack mass (cell-to-pack efficiency) }

m_cells = N_cells*m_cell
m_pack = m_cells/pack_mass_factor      { pack mass incl. structure/cooling/BMS }
E_pack = N_cells*E_cell
e_cell_grav = E_cell/m_cell            { cell specific energy [J/kg]; /3600 = Wh/kg }
e_pack_grav = E_pack/m_pack            { pack specific energy [J/kg]; /3600 = Wh/kg }
{ CHECK e_cell_grav 777142.857142857 8e-1 }
{ CHECK m_pack 470.0000000000001 5e-4 }
{ CHECK e_pack_grav 543999.9999999999 6e-1 }`,
  },
  {
    id: 'ammonia-refrigeration',
    title: 'Ammonia Refrigeration Cycle COP',
    description: 'An ammonia (R-717) chiller with a flooded evaporator operates between suction pressure 38.5 psia (with 20°F superheat) and discharge pressure 229 psia. The COP is computed from states\' enthalpies.',
    category: 'HVAC & Refrigeration',
    text: `{ Ammonia Refrigeration Cycle COP }
{ Results: COP = 3.9, cooling load = 10,250 Btu/min, compressor power =
  2,594 Btu/min. frees solves in SI: the cooling load is 180.2 kW and the
  compressor power 45.65 kW, so COP = 3.948. }
{ Problem 1: Ammonia Refrigeration Cycle COP }
P_suction = 38.5 [psia]
superheat = 20 [R]       { a 20 °F superheat (a temperature difference) }
P_discharge = 229 [psia]
m_dot = 22 [lb/min]

h1 = 627.0 [Btu/lbm]      { Enthalpy entering compressor }
h2 = 745.0 [Btu/lbm]      { Enthalpy leaving compressor }
h3 = 161.1 [Btu/lbm]      { Saturated liquid leaving condenser }

COP = (h1 - h3) / (h2 - h1)
Q_dot_cool = m_dot * (h1 - h3)
W_dot_comp = m_dot * (h2 - h1)
{ CHECK COP 3.9483050847457624 4e-6 }
{ CHECK Q_dot_cool 180235.1913030746 2e-1 }
{ CHECK W_dot_comp 45648.749890025334 5e-2 }`,
  },
  {
    id: 'face-bypass-control',
    title: 'Face and Bypass Control Load',
    description: 'Face and bypass control maintains room air at 80°F db/50% rh. A mixed stream of outdoor air and return air is cooled by a chilled-water coil. The total refrigeration load is determined from psychrometric property functions.',
    category: 'HVAC & Refrigeration',
    text: `{ Face and Bypass Control Load }
{ Results: total load = 67.7 tons of refrigeration (the chart solution reads
  67.9). The coil enthalpy drop is 9.0 Btu/lb; absolute enthalpies are on
  CoolProp's datum, which differs from the psychrometric chart by a constant
  that cancels in the difference. }
{ Problem 2: Face and Bypass Control Load }
V_dot_supply = 20000 [ft^3/min]
V_dot_oa = 5000 [ft^3/min]
T_room = 80 [F]
rh_room = 0.50
T_oa_db = 90 [F]
T_oa_wb = 74 [F]
T_coil_out_db = 58 [F]
T_coil_out_wb = 56 [F]
P_atm = 14.696 [psia]

v_supply = 13.25 [ft^3/lb] { Specific volume of supply air }
m_dot_supply = V_dot_supply / v_supply

f_oa = V_dot_oa / V_dot_supply
f_return = 1 - f_oa

h_room = Enthalpy(AirH2O, T=T_room, R=rh_room, P=P_atm)
h_oa = Enthalpy(AirH2O, T=T_oa_db, B=T_oa_wb, P=P_atm)
h_mix = f_oa * h_oa + f_return * h_room
h_supply = Enthalpy(AirH2O, T=T_coil_out_db, B=T_coil_out_wb, P=P_atm)

Q_dot_coil = m_dot_supply * (h_mix - h_supply)
Q_dot_coil_tons = Q_dot_coil / (12000 [Btu/hr])   { 1 ton of refrigeration = 12,000 Btu/hr }
{ CHECK Q_dot_coil_tons 67.72964989743328 7e-5 }
{ CHECK Q_dot_coil 238195.21173396852 3e-1 }`,
  },
  {
    id: 'solar-heat-gain',
    title: 'Solar Heat Gain Through Windows',
    description: 'Calculates total heat gain through windows on North, East, and West faces of a building using U-value, Cooling Load Temperature Differences (CLTD), and Solar Heat Gain Factors (SHGF).',
    category: 'HVAC & Refrigeration',
    text: `{ Solar Heat Gain Through Windows }
{ Results: total heat gain = 21,720 Btu/hr. frees solves in SI: Q_total =
  6365.5 W. }
{ Problem 4: Solar Heat Gain Through Windows }
U_value = 1.1 [Btu/hr-ft^2-F]
T_in = 75 [F]
T_out = 95 [F]
A_window = 40 [ft^2]

SHGF_North = 47 [Btu/hr-ft^2]
SHGF_East = 215 [Btu/hr-ft^2]
SHGF_West = 215 [Btu/hr-ft^2]

Q_North = A_window * SHGF_North + U_value * A_window * (T_out - T_in)
Q_East = A_window * SHGF_East + U_value * A_window * (T_out - T_in)
Q_West = A_window * SHGF_West + U_value * A_window * (T_out - T_in)

Q_total = Q_North + Q_East + Q_West
{ CHECK Q_total 6365.503644140664 7e-3 }
{ CHECK Q_East 2778.3137452326655 3e-3 }`,
  },
  {
    id: 'enthalpy-wheel',
    title: 'Enthalpy Wheel Heat Recovery',
    description: 'Finds the dry-bulb temperature of tempered air leaving an 80% effective sensible/latent heat recovery enthalpy wheel.',
    category: 'HVAC & Refrigeration',
    text: `{ Enthalpy Wheel Heat Recovery }
{ Results: leaving dry-bulb temperature = 79°F. }
{ Problem 5: Enthalpy Wheel Heat Recovery }
V_dot_oa = 1500 [ft^3/min]
T_oa_db = 95 [F]
T_oa_wb = 78 [F]
T_room_db = 75 [F]
rh_room = 0.50
effectiveness = 0.80

T_tempered_db = T_oa_db - (T_oa_db - T_room_db) * effectiveness
T_tempered_db_F = T_tempered_db / (1 [R]) - 459.67   { the same temperature in °F }
{ CHECK T_tempered_db_F 78.99999999999994 8e-5 }`,
  },
  {
    id: 'run-around-cycle',
    title: 'Run-Around Water Cycle Balance',
    description: 'Determines leaving air temperature from a cooling coil coupled to a run-around loop water cycle under steady-state energy balance.',
    category: 'HVAC & Refrigeration',
    text: `{ Run-Around Water Cycle Balance }
{ Results: heat transfer rate = 75,000 Btu/hr, air temp difference = 13.6°F,
  leaving air temperature = 61.4°F (or 52°F depending on heating balancing). }
{ Problem 6: Run-Around Water Cycle }
V_dot_water = 15 [gal/min]
delta_T_water = 10 [R]           { a 10 °F temperature difference }
T_air_in = 75 [F]
V_dot_air = 5000 [ft^3/min]

{ The rules of thumb with their units: 500 = 8.33 lbm/gal x 60 min/hr x 1 Btu/lbm-°F,
  1.1 = 0.0764 lbm/ft^3 x 60 min/hr x 0.24 Btu/lbm-°F }
rho_w = 8.3333 [lbm/gal]
cp_w = 1 [Btu/lbm-R]
rho_a = 0.0764 [lbm/ft^3]
cp_a = 0.24 [Btu/lbm-R]

{ Heat transfer rate }
Q = rho_w * V_dot_water * cp_w * delta_T_water
Q = rho_a * V_dot_air * cp_a * delta_T_air
T_air_out = T_air_in - delta_T_air

Q_Btuh = Q / (1 [Btu/hr])                      { 75,000 Btu/hr }
delta_T_air_F = delta_T_air / (1 [R])          { °F of air temperature drop }
T_air_out_F = T_air_out / (1 [R]) - 459.67
{ CHECK Q_Btuh 74999.69999999998 8e-2 }
{ CHECK delta_T_air_F 13.634325916230365 2e-5 }
{ CHECK T_air_out_F 61.36567408376965 7e-5 }`,
  },
  {
    id: 'latent-heat-freezing',
    title: 'Specific Heat of Freezing',
    description: 'Calculates the cooling required to cool 10,000 lbs of frozen chicken from its freezing point (27°F) to storage temperature (-10°F).',
    category: 'HVAC & Refrigeration',
    text: `{ Specific Heat of Freezing }
{ Results: cooling required = 136,900 Btu. frees solves in SI: Q_required =
  1.444e8 J. }
{ Problem 7: Specific & Latent Heat of Freezing }
mass = 10000 [lb]
T_freeze = 27 [F]
T_storage = -10 [F]
Cp_below = 0.37 [Btu/lb-F]

Q_required = mass * Cp_below * (T_freeze - T_storage)
{ CHECK Q_required 144437146.2236779 2e2 }`,
  },
  {
    id: 'psychrometric-balancing',
    title: 'Psychrometric Room Balancing',
    description: 'Calculates entering and leaving air conditions for a cooling coil serving a space with both sensible and latent heat gains under outdoor ventilation requirements.',
    category: 'HVAC & Refrigeration',
    text: `{ Psychrometric Room Balancing }
{ Results: Mixed Air Temp = 80.7°F db / 66.2°F wb, Leaving Air Temp = 55.0°F
  db / 50.9°F wb. }
{ Problem 3: Psychrometric Room Balancing }
Q_sensible = 90000 [Btu/hr]
Q_latent = 40000 [Btu/hr]
V_dot_supply = 3600 [ft^3/min]
T_supply_db = 55 [F]
T_room_db = 78 [F]
rh_room = 0.45
T_oa_db = 92 [F]
T_oa_wb = 76 [F]
V_dot_oa = 700 [ft^3/min]
P_atm = 14.696 [psia]
rho_std = 0.075 [lbm/ft^3]   { standard air: the 4.5 in Q = 4.5 x cfm x dh is 60 min/hr x 0.075 lbm/ft^3 }

V_dot_return = V_dot_supply - V_dot_oa
f_oa = V_dot_oa / V_dot_supply
f_return = V_dot_return / V_dot_supply

{ Mixed air condition (MAT) }
T_entering_db = f_oa * T_oa_db + f_return * T_room_db
h_room = Enthalpy(AirH2O, T=T_room_db, R=rh_room, P=P_atm)
h_oa   = Enthalpy(AirH2O, T=T_oa_db, B=T_oa_wb, P=P_atm)
h_mix  = f_oa * h_oa + f_return * h_room
T_entering_wb = WetBulb(AirH2O, T=T_entering_db, H=h_mix, P=P_atm)

{ Coil load: room sensible + latent + ventilation load }
Q_total = Q_sensible + Q_latent + rho_std * V_dot_oa * (h_oa - h_room)
h_leaving = h_mix - Q_total / (rho_std * V_dot_supply)
T_leaving_wb = WetBulb(AirH2O, T=T_supply_db, H=h_leaving, P=P_atm)

{ The same temperatures in °F }
T_entering_db_F = T_entering_db / (1 [R]) - 459.67
T_entering_wb_F = T_entering_wb / (1 [R]) - 459.67
T_leaving_wb_F  = T_leaving_wb / (1 [R]) - 459.67
{ CHECK T_entering_db_F 80.72222222222211 9e-5 }
{ CHECK T_entering_wb_F 66.22062610453503 7e-5 }
{ CHECK T_supply_db 285.92777777777775 3e-4 }
{ CHECK T_leaving_wb_F 50.938045226737245 6e-5 }`,
  },
  {
    id: 'pumping-friction-head',
    title: 'Pumping and Friction Head',
    description: 'Computes the operating head of a water pump overcoming static elevation and pipe friction (Darcy-Weisbach friction equation) under pressurized inlet conditions.',
    category: 'HVAC & Refrigeration',
    text: `{ Pumping and Friction Head }
{ Results: velocity = 8.54 ft/s, friction head = 9.37 ft, total head
  required = 169.4 ft, inlet head = 46.2 ft, pump head = 123.2 ft. }
{ Problem 8: Pumping and Friction Head }
{ All quantities are in English units (ft, gpm, fps) but kept unitless
  to avoid placing unit annotations on computed expressions. }
T_water = 90
gpm = 26000
f_factor = 0.01
L_eq = 2425
z_elev = 160
P_inlet = 20
OD = 36
t_wall = 0.375

ID = (OD - 2 * t_wall) / 12
V = (gpm * 0.1337 / 60) / (pi# / 4 * ID^2)
h_friction = f_factor * (L_eq / ID) * (V^2 / 64.4)
h_total = z_elev + h_friction

h_inlet = P_inlet * 2.31
h_pump = h_total - h_inlet
{ CHECK V 8.548853464497839 9e-6 }
{ CHECK h_friction 9.368363775701464 1e-5 }
{ CHECK h_total 169.36836377570145 2e-4 }
{ CHECK h_pump 123.16836377570145 2e-4 }`,
  },
  {
    id: 'air-supply-wetbulb',
    title: 'Air Supply Wet-Bulb Determination',
    description: 'Finds the wet-bulb temperature of the supply air to maintain a room at 75°F db/63°F wb under sensible load and Sensible Heat Factor.',
    category: 'HVAC & Refrigeration',
    text: `{ Air Supply Wet-Bulb Determination }
{ Results: total heat load = 250,000 Btu/hr, supply wet-bulb temperature =
  55.1°F — enthalpies are on CoolProp's datum, which differs from the
  standard psychrometric chart by a constant that cancels in the load
  equation's difference. }
{ Problem 9: Air Supply Wet-Bulb Determination }
T_room_db = 75 [F]
T_room_wb = 63 [F]
T_supply_db = 58 [F]
Q_sensible = 200000 [Btu/hr]
SHF = 0.80
V_dot_supply = 10700 [ft^3/min]
P_atm = 14.696 [psia]
rho_std = 0.075 [lbm/ft^3]   { standard air: the 4.5 in Q = 4.5 x cfm x dh is 60 min/hr x 0.075 lbm/ft^3 }

h_room = Enthalpy(AirH2O, T=T_room_db, B=T_room_wb, P=P_atm)
Q_total = Q_sensible / SHF

{ Total heat equation — h_supply solved implicitly }
Q_total = rho_std * V_dot_supply * (h_room - h_supply)
T_supply_wb = WetBulb(AirH2O, T=T_supply_db, H=h_supply, P=P_atm)

Q_total_Btuh = Q_total / (1 [Btu/hr])
T_supply_wb_F = T_supply_wb / (1 [R]) - 459.67
{ CHECK Q_total_Btuh 250000 3e-1 }
{ CHECK T_supply_wb_F 55.14502124499228 6e-5 }`,
  },
  {
    id: 'multistage-food-freezing',
    title: 'Multi-Stage Food Freezing',
    description: 'Calculates total refrigeration required to cool lean ham from 40°F to 28°F, freeze it, and then subcool it to 0°F.',
    category: 'HVAC & Refrigeration',
    text: `{ Multi-Stage Food Freezing }
{ Results: cooling above = 99,600 Btu, freezing = 980,000 Btu, cooling below
  = 148,400 Btu, total = 1.228 x 10^6 Btu. frees solves in SI, so
  Q_total_btu holds joules despite its name: 1.2956e9 J = 1.228e6 Btu. }
{ Problem 10: Multi-Stage Food Freezing }
mass = 10000 [lb]
T_in = 40 [F]
T_freeze = 28 [F]
T_out = 0 [F]
Cp_above = 0.83 [Btu/lb-F]
Cp_below = 0.53 [Btu/lb-F]
L_fusion = 98 [Btu/lb]

Q_sensible_above = mass * Cp_above * (T_in - T_freeze)
Q_latent_freeze = mass * L_fusion
Q_sensible_below = mass * Cp_below * (T_freeze - T_out)

Q_total_btu = Q_sensible_above + Q_latent_freeze + Q_sensible_below
Q_total_millions = Q_total_btu / 1e6
{ CHECK Q_sensible_above 105083562.92095229 2e2 }
{ CHECK Q_latent_freeze 1033954735.5676 2e3 }
{ CHECK Q_sensible_below 156570288.52880788 2e2 }
{ CHECK Q_total_btu 1295608587.0173602 2e3 }`,
  },
  {
    id: 'combined-cycle',
    title: 'Combined Brayton–Rankine Cycle through an HRSG',
    description: 'A complete combined-cycle power plant: an air-standard gas turbine (Brayton) tops a steam Rankine cycle, the two coupled through a Heat Recovery Steam Generator. The HRSG energy balance fixes the steam-to-gas mass ratio; the real-fluid backend supplies every steam state.',
    category: 'Thermodynamics',
    text: `{ Combined Brayton–Rankine Cycle through an HRSG }
{ Solves in one shot per 1 kg/s of gas: compressor exit 678 K, turbine exit
  774 K, 0.121 kg/s of steam raised per kg of gas, and an overall efficiency
  of 51.3% — higher than either cycle alone, as a real combined cycle should
  be. }
{ Combined-cycle plant: air-standard Brayton topping + steam Rankine
  bottoming, coupled through a Heat Recovery Steam Generator (per 1 kg/s gas). }
{ ---- Gas turbine (cold-air-standard) ---- }
cp = 1.005 [kJ/kg-K]; kk = 1.4
T1 = 300 [K]; rp = 12
T3 = 1400 [K]
eta_c = 0.82; eta_gt = 0.88
T2 = T1*(1 + (rp^((kk-1)/kk) - 1)/eta_c)
T4 = T3*(1 - eta_gt*(1 - rp^(-(kk-1)/kk)))
w_comp = cp*(T2 - T1)
w_gt   = cp*(T3 - T4)
q_gas  = cp*(T3 - T2)
wnet_gas = w_gt - w_comp
m_gas = 1 [kg/s]

{ ---- Steam Rankine bottoming (real-water properties) ---- }
P_boil = 6000 [kPa]; T_sup = 450 [C]; P_cond = 10 [kPa]
eta_st = 0.87; eta_p = 0.85
h5 = Enthalpy(Water, P=P_boil, T=T_sup)
s5 = Entropy(Water, P=P_boil, T=T_sup)
h6s = Enthalpy(Water, P=P_cond, s=s5)
h6 = h5 - eta_st*(h5 - h6s)
h7 = Enthalpy(Water, P=P_cond, x=0)
v7 = Volume(Water, P=P_cond, x=0)
wp = v7*(P_boil - P_cond)/eta_p
h8 = h7 + wp
q_steam = h5 - h8
wnet_steam = (h5 - h6) - wp

{ ---- HRSG coupling: gas cooled from T4 to a 400 K stack ---- }
T_stack = 400 [K]
m_gas*cp*(T4 - T_stack) = m_steam*q_steam

{ ---- Plant performance ---- }
W_total = m_gas*wnet_gas + m_steam*wnet_steam
eta_overall = W_total/(m_gas*q_gas)*100
{ CHECK T2 678.2696377296699 7e-4 }
{ CHECK T4 773.7218065590525 8e-4 }
{ CHECK m_steam 0.12100270922000168 2e-7 }
{ CHECK eta_overall 51.285862377480605 6e-5 }`,
  },
  {
    id: 'cd-nozzle-normal-shock-branch',
    title: 'Supersonic Nozzle with a Normal Shock at the Exit',
    description: 'A converging–diverging nozzle with exit-to-throat area ratio 4. The supersonic branch of the area–Mach relation is implicit (two roots), so set a guess of Me ≈ 2.9 in the Variable grid; a normal shock then recovers the post-shock state.',
    category: 'Aerospace & Compressible Flow',
    text: `{ Supersonic Nozzle with a Normal Shock at the Exit }
{ Exit Mach 2.94 on the supersonic branch, post-shock Mach 0.479, and the
  shock destroys stagnation pressure from 1000 kPa to 346 kPa — the classic
  loss across a strong normal shock. The gallery's cd-nozzle-shock is a
  different model; this one is listed as cd-nozzle-normal-shock-branch. }
{ Aerospace: CD nozzle, supersonic branch + normal shock at exit }
g = 1.4
R = 287 [J/kg-K]
P0 = 1000 [kPa]
T0 = 600 [K]
A_ratio = 4.0        { Ae/A* }
{ Area-Mach relation, supersonic root (guess Me = 2.9) }
GUESS Me = 2.9
A_ratio = (1/Me)*((2/(g+1))*(1+(g-1)/2*Me^2))^((g+1)/(2*(g-1)))
{ Isentropic exit before the shock }
Pe = P0*(1+(g-1)/2*Me^2)^(-g/(g-1))
Te = T0*(1+(g-1)/2*Me^2)^(-1)
Ve = Me*sqrt(g*R*Te)
{ Normal shock at the exit plane }
M2 = sqrt((1+(g-1)/2*Me^2)/(g*Me^2-(g-1)/2))
P2 = Pe*(1+g*Me^2)/(1+g*M2^2)
T2 = Te*(1+(g-1)/2*Me^2)/(1+(g-1)/2*M2^2)
P02 = P2*(1+(g-1)/2*M2^2)^(g/(g-1))
{ CHECK Me 2.940179169312597 3e-6 }
{ CHECK M2 0.47882507590260004 5e-7 }
{ CHECK P02 345647.50792781176 4e-1 }`,
  },
  {
    id: 'co2-nozzle-throat',
    title: 'CO₂ Nozzle Throat Velocity',
    description: 'Carbon dioxide enters a converging–diverging nozzle at 60 m/s, 310°C and 300 kPa and leaves supersonic. Because the diverging section reaches supersonic speed, the throat is choked (Ma = 1), so the throat velocity equals the local speed of sound there. The stagnation temperature comes from the inlet energy balance; the sonic temperature and speed of sound follow from constant-specific-heat ideal-gas relations.',
    category: 'Aerospace & Compressible Flow',
    text: `{ CO₂ Nozzle Throat Velocity }
{ Throat velocity ≈ 348 m/s, confirming answer (d) 353 m/s. cp and cv come
  from frees's built-in CO₂ ideal-gas property functions at the inlet
  temperature (cp ≈ 1.06 kJ/kg-K, k ≈ 1.22); the textbook's 353 m/s uses
  room-temperature constant specific heats (k = 1.289), so the small
  difference is just the temperature dependence of cp. }
{ Throat velocity of a choked CO2 nozzle }
{ Supersonic exit => the throat is sonic (Ma = 1), so the throat velocity
  is the local speed of sound there. }
V1 = 60 [m/s]
T1 = 310 [C]
P1 = 300 [kPa]

{ CO2 ideal-gas properties from frees, evaluated at the inlet temperature }
cp = Cp(CO2, T=T1)
cv = Cv(CO2, T=T1)
k = cp / cv
R = cp - cv          { ideal gas: R = cp - cv }

{ Stagnation temperature from the inlet energy balance }
T0 = T1 + V1^2 / (2 * cp)

{ Throat is sonic (Ma = 1) }
T_throat = T0 * 2 / (k + 1)

{ Throat velocity = local speed of sound }
V_throat = sqrt(k * R * T_throat)
{ CHECK V_throat 348.2582048057204 4e-4 }
{ CHECK cp 1061.4344033117586 2e-3 }
{ CHECK k 1.2165265228640985 2e-6 }`,
  },
  {
    id: 'orbit-kepler',
    title: 'Orbital Position from Kepler\'s Equation',
    description: 'An elliptical Earth orbit (300 km × 3000 km altitude). Kepler\'s equation M = E − e·sin E is transcendental and is solved directly for the eccentric anomaly a quarter-period after perigee; radius and speed follow. Note that t and T are reserved (time) names, so the period is named Tper.',
    category: 'Aerospace & Compressible Flow',
    text: `{ Orbital Position from Kepler's Equation }
{ Period 119 min, eccentricity 0.168; a quarter-period after perigee the
  eccentric anomaly is 1.74 rad, the true anomaly 108.9°, radius 8251 km and
  speed 6.85 km/s. }
{ Aerospace: elliptical Earth orbit; position & speed via Kepler's equation }
mu = 398600 [km^3/s^2]
Re = 6378 [km]
alt_p = 300 [km]; alt_a = 3000 [km]
rp = Re + alt_p      { perigee radius }
ra = Re + alt_a      { apogee radius }
a = (rp + ra)/2
ecc = (ra - rp)/(ra + rp)
Tper = 2*pi#*sqrt(a^3/mu)     { orbital period }
tk = Tper/4                  { a quarter-period after perigee }
M = 2*pi#*tk/Tper             { mean anomaly }
M = EA - ecc*sin(EA)         { Kepler's equation (guess EA = 2) }
nu = 2*arctan( sqrt((1+ecc)/(1-ecc)) * tan(EA/2) )
nu_deg = nu*180/pi#
r = a*(1 - ecc*cos(EA))
v = sqrt(mu*(2/r - 1/a))
{ CHECK Tper 7158.503916437114 8e-3 }
{ CHECK ecc 0.1681614349775785 2e-7 }
{ CHECK EA 1.7366502074895294 2e-6 }
{ CHECK nu_deg 108.92037762118493 2e-4 }
{ CHECK r 8250877.648709191 9e0 }
{ CHECK v 6853.378999011704 7e-3 }`,
  },
  {
    id: 'pipe-network',
    title: 'Parallel Pipe Network with Colebrook Friction',
    description: 'A flow splits into two parallel branches that must share the same head loss, then recombines. Each branch\'s friction factor comes from the implicit Colebrook equation, so the whole network — continuity, the equal-head-loss condition, and three transcendental friction equations — is solved simultaneously via a FOR loop block.',
    category: 'Fluids & Fluid Power',
    text: `{ Parallel Pipe Network with Colebrook Friction }
{ The branches divide the 0.10 m³/s feed as 0.029 and 0.071 m³/s so that
  both lose 9.83 m of head; total network head loss is 14.5 m. Reynolds
  numbers and friction factors are all consistent (turbulent). }
{ Civil/Fluids: parallel pipe network, Colebrook friction }
rho = 1000 [kg/m^3]
mu = 0.001 [Pa-s]
g = 9.81 [m/s^2]
Q_in = 0.10 [m^3/s]
L[1]=300; L[2]=500; L[3]=400
D[1]=0.25; D[2]=0.15; D[3]=0.20
eps = 0.00015
Q_in = Q[1]
Q[1] = Q[2] + Q[3]            { continuity at the split }
hf[2] = hf[3]                 { parallel branches share head loss }
FOR j = 1 TO 3
  V[j] = Q[j]/(pi#/4*D[j]^2)
  Re[j] = rho*V[j]*D[j]/mu
  1/sqrt(ff[j]) = -2*log10(eps/(3.7*D[j]) + 2.51/(Re[j]*sqrt(ff[j])))
  hf[j] = ff[j]*L[j]/D[j]*V[j]^2/(2*g)
END
h_total = hf[1] + hf[2]
{ CHECK Q[2] 0.029486844753111918 3e-8 }
{ CHECK Q[3] 0.07051315524688809 8e-8 }
{ CHECK hf[2] 9.828607671416702 1e-5 }
{ CHECK h_total 14.459139691463031 2e-5 }`,
  },
  {
    id: 'open-channel-jump',
    title: 'Manning Flow, Critical Depth & Hydraulic Jump',
    description: 'A rectangular channel on a steep slope. Manning\'s equation for the normal depth is implicit; the critical depth follows from the unit discharge, and the hydraulic-jump momentum function gives the sequent depth and the energy dissipated. (Note Q and q are the same name in case-insensitive frees — the unit discharge is qu.)',
    category: 'Fluids & Fluid Power',
    text: `{ Manning Flow, Critical Depth & Hydraulic Jump }
{ Normal depth 0.825 m is below the critical depth 1.177 m, so the flow is
  supercritical (Fr₁ = 1.70). The jump lifts it to 1.618 m (Fr₂ = 0.62,
  subcritical) and dissipates 0.094 m of head. }
{ Civil/Hydraulics: rectangular channel - normal & critical depth + jump }
g = 9.81 [m/s^2]
Q = 20 [m^3/s]
b = 5 [m]
n = 0.015
S0 = 0.01            { steep slope -> supercritical normal flow }
qu = Q/b             { unit discharge }
yc = (qu^2/g)^(1/3)  { critical depth }
{ Normal depth via Manning (implicit, guess yn = 0.6) }
Aflow = b*yn
Pwet = b + 2*yn
Rh = Aflow/Pwet
Q = (1/n)*Aflow*Rh^(2/3)*sqrt(S0)
V1 = Q/Aflow
Fr1 = V1/sqrt(g*yn)
{ Hydraulic jump: sequent depth from the momentum function }
y2 = yn/2*(sqrt(1 + 8*Fr1^2) - 1)
V2 = Q/(b*y2)
Fr2 = V2/sqrt(g*y2)
dE = (y2 - yn)^3/(4*yn*y2)   { energy dissipated }
{ CHECK yn 0.8249524618733242 9e-7 }
{ CHECK yc 1.1771098442672114 2e-6 }
{ CHECK Fr1 1.7044415130538495 2e-6 }
{ CHECK y2 1.618355297582428 2e-6 }
{ CHECK dE 0.09352300592110521 1e-7 }`,
  },
  {
    id: 'pelton-turbine',
    title: 'Pelton Wheel (Impulse Turbine) Design',
    description: 'Designs a single-jet Pelton wheel for a high-head hydro site. The jet velocity comes from the net head through the nozzle velocity coefficient; the optimum bucket speed sets the wheel diameter at a given rotational speed (entered in rpm, which frees converts to rad/s). The jet diameter follows from continuity, and the bucket force/power use the momentum change through the deflection angle. Demonstrates angle units (deg → rad), rpm → rad/s, and dimensionally derived results.',
    category: 'Fluids & Fluid Power',
    text: `{ Pelton Wheel (Impulse Turbine) Design }
{ Vj ≈ 75.2 m/s, bucket speed u ≈ 34.6 m/s, wheel diameter D ≈ 1.32 m, jet
  diameter d ≈ 92 mm (jet ratio D/d ≈ 14.4). Bucket power ≈ 1.28 MW from
  1.47 MW of water power — hydraulic efficiency η_h ≈ 90% (wheel efficiency
  on head ≈ 87% after the nozzle loss). }
{ Pelton Wheel (Impulse Turbine) Design — single jet }
{ High-head hydro: given net head, flow and speed, size the wheel and
  jet and find the power and efficiency. }
rho = 1000 [kg/m^3]
g = 9.81 [m/s^2]
H = 300 [m]            { net head at the nozzle }
Q = 0.5 [m^3/s]        { volumetric flow (one jet) }
N = 500 [rpm]          { runner speed — rpm auto-converts to rad/s }
C_v = 0.98             { nozzle velocity coefficient }
phi = 0.46             { speed ratio  u / Vj  (optimum ~0.46) }
beta = 165 [deg]       { bucket outlet angle }
k = 0.85               { relative-velocity friction factor }

{ Jet from the nozzle }
Vj = C_v * sqrt(2 * g * H)

{ Optimum bucket (peripheral) speed and the wheel diameter.
  N is an angular velocity in rad/s, so u = N * D_wheel/2.
  (D_wheel and d_jet must differ — names are case-insensitive in frees.) }
u = phi * Vj
u = N * (D_wheel / 2)

{ Jet diameter from continuity, and the jet ratio (good design 11–14) }
Q = (pi# / 4) * d_jet^2 * Vj
m_ratio = D_wheel / d_jet

{ Force and power on the buckets (jet deflected through 180° − beta) }
F = rho * Q * (Vj - u) * (1 + k * cos(180 [deg] - beta))
P_bucket = F * u

{ Water power available and the efficiencies }
P_water = rho * g * Q * H
eta_hydraulic = P_bucket / (0.5 * rho * Q * Vj^2) * 100
eta_wheel = P_bucket / P_water * 100
{ CHECK Vj 75.1858656929612 8e-5 }
{ CHECK u 34.585498218762154 4e-5 }
{ CHECK D_wheel 1.3210687201948652 2e-6 }
{ CHECK d_jet 0.09201782403527424 1e-7 }
{ CHECK P_bucket 1278535.4185472182 2e0 }
{ CHECK eta_hydraulic 90.4691157925348 1e-4 }`,
  },
  {
    id: 'truss-stiffness',
    title: 'Plane Truss by the Direct Stiffness Method',
    description: 'A three-bar truss with one free node, assembled and solved exactly as a finite-element code would: each member contributes its EA/L stiffness with direction cosines to a 2×2 global stiffness matrix, which SolveLinear inverts for the nodal displacements; member axial forces follow.',
    category: 'Mechanics',
    text: `{ Plane Truss by the Direct Stiffness Method }
{ The downward 100 kN load gives a vertical deflection of 1.00 mm and member
  forces −69.8, −25.1, −25.1 kN. They satisfy vertical equilibrium exactly
  (−69.8 − 2·25.1·0.6 = −100 kN). Watch the case-insensitive K/k clash — the
  matrix is Kg, the member stiffness ka. }
{ Structural: 3-bar plane truss solved by the direct stiffness method }
E = 210e9 [Pa]
A = 1e-3 [m^2]
P = 100e3 [N]
{ free node 1 at origin connected to three supports;
  member 1 vertical (L=3); members 2,3 to (+/-4, 3), L=5 }
L[1]=3; L[2]=5; L[3]=5
cx[1]=0;    sy[1]=1
cx[2]=0.8;  sy[2]=0.6
cx[3]=-0.8; sy[3]=0.6
FOR m = 1 TO 3
  ka[m] = E*A/L[m]                 { member axial stiffness EA/L }
END
{ Assemble the 2x2 reduced global stiffness at the free node }
Kg[1,1] = ka[1]*cx[1]^2 + ka[2]*cx[2]^2 + ka[3]*cx[3]^2
Kg[1,2] = ka[1]*cx[1]*sy[1] + ka[2]*cx[2]*sy[2] + ka[3]*cx[3]*sy[3]
Kg[2,1] = Kg[1,2]
Kg[2,2] = ka[1]*sy[1]^2 + ka[2]*sy[2]^2 + ka[3]*sy[3]^2
{ Solve Kg u = F for the nodal displacements, then member forces }
F[1:2] = [0, -P]
u[1:2] = SolveLinear(Kg[1:2,1:2], F[1:2])
FOR m = 1 TO 3
  Naxial[m] = ka[m]*(cx[m]*u[1] + sy[m]*u[2])
END
{ CHECK u[2] -0.0009976057462090981 1e-9 }
{ CHECK Naxial[1] -69832.40223463687 7e-2 }
{ CHECK Naxial[2] -25139.664804469274 3e-2 }`,
  },
  {
    id: 'radiation-enclosure',
    title: '3-Surface Radiation Enclosure with a Reradiating Wall',
    description: 'An equilateral triangular duct with a hot surface, a cold surface and an adiabatic (reradiating) wall. The radiosity-network equations — two gray-surface balances plus the reradiating condition that the wall\'s radiosity equals its irradiation — are nonlinear in T⁴ and solved together.',
    category: 'Heat Transfer',
    text: `{ 3-Surface Radiation Enclosure with a Reradiating Wall }
{ Net exchange between the gray surfaces is 30.1 kW with Q₁ = −Q₂ exactly
  (energy balance), and the floating reradiating wall settles at 846 K,
  between the 1000 K and 400 K surfaces. }
{ Heat transfer: 3-surface enclosure (equilateral triangular duct) with a
  reradiating wall, solved by the radiosity network method }
sigma = 5.67e-8 [W/m^2-K^4]
A = 1 [m^2]
T1 = 1000 [K]; eps1 = 0.8     { hot surface }
T2 = 400 [K];  eps2 = 0.8     { cold surface }
{ Each flat surface of the equilateral triangle sees the others equally }
F12 = 0.5; F13 = 0.5
F21 = 0.5; F23 = 0.5
F31 = 0.5; F32 = 0.5
Eb1 = sigma*T1^4
Eb2 = sigma*T2^4
{ Radiosity balance on the two gray surfaces }
J1 = eps1*Eb1 + (1-eps1)*(F12*J2 + F13*J3)
J2 = eps2*Eb2 + (1-eps2)*(F21*J1 + F23*J3)
{ Reradiating surface: radiosity equals its irradiation }
J3 = F31*J1 + F32*J2
{ Net heat leaving each gray surface }
Q1 = A*eps1/(1-eps1)*(Eb1 - J1)
Q2 = A*eps2/(1-eps2)*(Eb2 - J2)
T3 = (J3/sigma)^0.25          { reradiating-wall temperature }
{ CHECK Q1 30135.534545454553 4e-2 }
{ CHECK Q2 -30135.53454545454 4e-2 }
{ CHECK T3 846.2272458380942 9e-4 }`,
  },
  {
    id: 'auto-cooling-loop',
    title: 'Radiator + Pump + Fan Cooling Loop (EG50 coolant)',
    description: 'An automotive cooling loop where the fan and pump operating points are found implicitly — each performance curve, entered as a TABLE and called like a function, is intersected with its quadratic flow resistance — and the radiator heat duty follows from a digitized effectiveness table. The coolant is a 50/50 ethylene glycol/water mixture (EG50) whose density and specific heat come straight from the real-fluid backend. The fan curve is affinity-scaled by f_rpm so you can slow the fan or sweep it in a Parametric Table.',
    category: 'Systems',
    text: `{ Radiator + Pump + Fan Cooling Loop (EG50 coolant) }
{ Solves to Q = 38.2 kW rejected, fan power 262 W and pump power 97 W, at an
  air-side operating point of 0.90 m³/s (~1910 CFM, 131 Pa) and a coolant
  flow of 89.8 L/min. The TABLE input/output units ([m^3/s] → [Pa]) let
  frees derive SI units all the way through (Vair m³/s, dP_air Pa, Q W,
  T_c_out K) instead of showing '-'. EG50 at 90 °C gives ρ = 1019 kg/m³, cp
  = 3616 J/kg·K (vs water 965 / 4205). Data sources: cross-flow radiator
  effectiveness ε≈0.6–0.85 and heat rejection 25–50 kW (ResearchGate
  397980466, FSAE study 356606738); SPAL 16-inch fan ~2500 CFM free-air /
  ~250 Pa max static (streetmusclemag.com); Davies-Craig EWP pump 90–162
  L/min (daviescraig.com.au/electric-water-pumps). }
{ Automotive cooling loop: radiator + electric pump + electric fan.
  Coolant = 50/50 ethylene glycol / water (EG50), real-fluid properties.
  Pump and fan curves are entered as TABLE blocks and used as functions.

  Data sources (typical passenger-car / aftermarket components):
   - Cross-flow radiator: effectiveness ~0.6-0.85, heat rejection ~25-50 kW
     (ResearchGate 397980466; FSAE radiator study 356606738)
   - Fan curve, SPAL 16in class: ~2500 CFM free air, ~250 Pa max static
     (streetmusclemag.com - SPAL electric fans)
   - Pump curve, Davies-Craig EWP class: 90-162 L/min
     (daviescraig.com.au/electric-water-pumps) }

{ Inputs }
T_c_in = 95 [C]        { hot coolant into radiator }
T_a_in = 35 [C]        { ambient air }
P_atm  = 101325 [Pa]
eta_fan  = 0.45        { fan total efficiency }
eta_pump = 0.55        { pump total efficiency }
f_rpm    = 1           { fan speed / rated (set < 1 to slow the fan) }

{ Fan curve: static pressure [Pa] vs air flow [m^3/s].
  The [Pa] on the table output lets frees derive SI units for everything
  computed from the lookup (dP_air, W_fan, ...). }
TABLE fanCurve(Vair [m^3/s]) [Pa]
  0.0    250
  0.3    232
  0.6    195
  0.9    132
  1.18   0
END

{ Pump curve: head [Pa] vs coolant flow [m^3/s] }
TABLE pumpCurve(Vc [m^3/s]) [Pa]
  0.0      55000
  0.0008   48000
  0.0016   34000
  0.0023   0
END

{ Radiator effectiveness (digitized): dimensionless epsilon vs air flow }
TABLE radEff(Vair [m^3/s]) [-]
  0.3   0.45
  0.6   0.55
  0.9   0.62
  1.2   0.67
END

{ Flow resistances: dP = K * V^2, so K carries [Pa/(m^3/s)^2] = [kg/m^7].
  Annotating K grounds the flows Vair, Vc at m^3/s. }
K_air = 160 [kg/m^7]
K_c   = 1.6e10 [kg/m^7]

{ Fan operating point (affinity-scaled to f_rpm) meets air-side resistance }
dP_air = f_rpm^2 * fanCurve(Vair / f_rpm)
dP_air = K_air * Vair^2

{ Pump operating point meets coolant-loop resistance }
head = pumpCurve(Vc)
head = K_c * Vc^2

{ Coolant properties from the EG50 mixture; air properties at ~40 C }
rho_c = Density(EG50, T=90 [C], P=P_atm)
cp_c  = Cp(EG50, T=90 [C], P=P_atm)
rho_air = 1.13 [kg/m^3]
cp_air  = 1006 [J/kg-K]

{ Mass flows and capacity rates }
m_air = rho_air * Vair
m_c   = rho_c * Vc
C_air = m_air * cp_air
C_c   = m_c * cp_c
C_min = min(C_air, C_c)

{ Heat transfer (effectiveness method) }
eps = radEff(Vair)
Q = eps * C_min * (T_c_in - T_a_in)
T_c_out = T_c_in - Q / C_c
T_a_out = T_a_in + Q / C_air

{ Power draw }
W_fan  = dP_air * Vair / eta_fan
W_pump = head * Vc / eta_pump
{ CHECK Q 38225.37243231919 4e-2 }
{ CHECK W_fan 261.9382447242454 3e-4 }
{ CHECK W_pump 97.43354758791293 1e-4 }
{ CHECK Vair 0.9031581695036179 1e-6 }
{ CHECK dP_air 130.51114866258013 2e-4 }`,
  },
  {
    id: 'load-flow',
    title: 'Two-Bus AC Power Flow (Newton–Raphson Load Flow)',
    description: 'A slack bus feeds a PQ load bus over a transmission line. The polar power-flow equations are exactly the nonlinear system a Newton–Raphson load-flow program solves; here the bus voltage magnitude and angle are recovered directly from the scheduled real and reactive injections.',
    category: 'Electrical & Powertrain',
    text: `{ Two-Bus AC Power Flow (Newton–Raphson Load Flow) }
{ Drawing 0.5 + j0.2 pu through a 0.02 + j0.06 pu line drops the load-bus
  voltage to 0.977 pu at an angle of −1.52° — the expected sag and phase lag
  behind the slack bus. }
{ Power systems: 2-bus AC power flow (Newton-Raphson load flow) }
{ Bus 1 = slack (V1=1, th1=0). Bus 2 = PQ load. Line z = 0.02 + j0.06 pu }
zr = 0.02; zi = 0.06
den = zr^2 + zi^2
yr = zr/den          { series conductance }
yi = -zi/den         { series susceptance }
G22 = yr;  B22 = yi
G21 = -yr; B21 = -yi
V1 = 1.0; th1 = 0
P2 = -0.5; Q2 = -0.2          { scheduled load injections (pu) }
{ Polar power-flow equations (guess V2 = 1, th2 = -0.1) }
P2 = V2^2*G22 + V1*V2*(G21*cos(th2-th1) + B21*sin(th2-th1))
Q2 = -V2^2*B22 + V1*V2*(G21*sin(th2-th1) - B21*cos(th2-th1))
th2_deg = th2*180/pi#
{ CHECK V2 0.9771310387456974 1e-6 }
{ CHECK th2_deg -1.5247352206719103 2e-6 }`,
  },
  {
    id: 'reforming-equilibrium',
    title: 'Coupled Reforming + Water-Gas-Shift Equilibrium',
    description: 'Two reactions reach equilibrium at once: steam-methane reforming (Δn = +2, pressure-dependent) and the water-gas shift (Δn = 0). The two equilibrium-constant expressions, written in mole fractions and extents of reaction, form a coupled nonlinear pair solved for the full product composition.',
    category: 'Thermodynamics',
    text: `{ Coupled Reforming + Water-Gas-Shift Equilibrium }
{ At the given equilibrium constants the methane conversion is 98.5%; the
  dry product is hydrogen-rich (y_H₂ = 0.56) with the mole fractions summing
  exactly to 1. }
{ Chemical: coupled equilibrium of steam-methane reforming + water-gas shift }
{ R1: CH4 + H2O <-> CO + 3 H2     (Kp1, dn=+2)
  R2: CO  + H2O <-> CO2 + H2      (Kp2, dn=0)  }
Kp1 = 26.0      { at ~1000 K, dimensionless with P0 = 1 bar }
Kp2 = 1.45
P = 1.0 [bar]
P0 = 1.0 [bar]
n_CH4_0 = 1; n_H2O_0 = 3
{ Extents x1, x2 (guesses 0.9 and 0.3); equilibrium moles }
n_CH4 = n_CH4_0 - x1
n_H2O = n_H2O_0 - x1 - x2
n_CO  = x1 - x2
n_H2  = 3*x1 + x2
n_CO2 = x2
n_tot = n_CH4 + n_H2O + n_CO + n_H2 + n_CO2
y_CH4 = n_CH4/n_tot; y_H2O = n_H2O/n_tot; y_CO = n_CO/n_tot
y_H2 = n_H2/n_tot;   y_CO2 = n_CO2/n_tot
Kp1 = (y_CO*y_H2^3)/(y_CH4*y_H2O) * (P/P0)^2
Kp2 = (y_CO2*y_H2)/(y_CO*y_H2O)
conv = x1/n_CH4_0*100         { methane conversion, % }
{ CHECK conv 98.52351161827461 1e-4 }
{ CHECK y_H2 0.5627256286879031 6e-7 }`,
  },
  {
    id: 'inhour-equation',
    title: 'Stable Reactor Period from the Inhour Equation',
    description: 'A step reactivity insertion in a reactor with six delayed-neutron groups. The inhour equation relating reactivity to the stable period is transcendental with all six groups contributing; the β and λ data are entered as arrays and summed.',
    category: 'Systems',
    text: `{ Stable Reactor Period from the Inhour Equation }
{ Inserting 0.0025 Δk/k (well below the 0.0065 delayed-neutron fraction)
  gives a stable, positive reactor period of about 10.9 s — a controllable
  transient. Above β the period would collapse to prompt-critical. }
{ Nuclear: stable reactor period from the 6-group inhour equation (U-235) }
Lambda = 2e-5 [s]            { prompt neutron generation time }
rho = 0.0025                 { inserted reactivity (dk/k) }
beta[1:6] = [0.000215, 0.001424, 0.001274, 0.002568, 0.000748, 0.000273]
lam[1:6]  = [0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01]
{ Stable period Tper (guess ~30 s); contributions of the 6 groups }
FOR i = 1 TO 6
  term[i] = beta[i]/(1 + lam[i]*Tper)
END
rho = Lambda/Tper + sum(term[1:6])
beta_tot = sum(beta[1:6])
{ CHECK Tper 10.900983701123218 2e-5 }`,
  },
  {
    id: 'paris-fatigue',
    title: 'Fatigue Life by Integrating the Paris Law',
    description: 'An edge-cracked plate under cyclic stress. The critical crack length comes from the fracture toughness; the cycles to failure are the Paris-law crack-growth rate integrated from the initial to the critical crack length — a definite integral with the unknown (critical length) as its upper limit.',
    category: 'Mechanics',
    text: `{ Fatigue Life by Integrating the Paris Law }
{ The crack grows from 0.5 mm to a critical 10.15 mm, giving a fatigue life
  of about 161,000 cycles. frees evaluates the crack-growth integral
  directly with the critical length solved from the toughness in the same
  system. }
{ Materials: fatigue life of an edge-cracked plate via the Paris law
  integrated from initial to critical crack length (consistent MPa, m units) }
C = 6.9e-12; m = 3.0       { Paris constants (m/cycle, MPa*sqrt(m)) }
Y = 1.12                   { edge-crack geometry factor }
K_IC = 60                  { fracture toughness, MPa*sqrt(m) }
sig_max = 300              { max stress, MPa }
dsig = 200                 { stress range, MPa }
a_i = 0.0005               { initial crack length, m }
a_c = (K_IC/(sig_max*Y))^2/pi#      { critical crack length }
{ Cycles to failure = integral of da / (C (dsig Y sqrt(pi# a))^m) }
N_f = Integral(1/(C*(dsig*Y*sqrt(pi#*a))^m), a, a_i, a_c)
{ CHECK a_c 0.0101501876971872 2e-8 }
{ CHECK N_f 161152.33220882752 2e-1 }`,
  },
  {
    id: 'siyavula-correlation',
    title: 'Linear Correlation (Siyavula Grade 12 Table & Curve Fit)',
    description: 'Defines a bivariate dataset from Siyavula Grade 12 Statistics using an inline TABLE block. When compiled, the table is registered as an internal table and can be selected as the data source in the Curve Fit tool (function icon in the left rail) to find the regression line and correlation coefficient.',
    category: 'Data & Analysis',
    text: `{ Linear Correlation (Siyavula Grade 12 Table & Curve Fit) }
{ How-To: 1. Paste this code and press Check (F4). 2. Open the Curve Fit
  tool on the left rail. 3. Select 'siyavula_data' from the Table dropdown.
  4. Select 'x' as independent, 'y' as dependent column. 5. Choose the
  Linear template and click Fit. R² = 0.9921 yields |r| = sqrt(0.9921) =
  0.9961, and since the slope is negative, r = -0.9961. Solving checks the
  table function at x = 0. }
{ Statistics: Linear Correlation (Siyavula Grade 12) }
{ This example defines the Siyavula Grade 12 Statistics bivariate dataset
  using an inline TABLE block. Once compiled (F4), the table is registered
  in the app's internal tables and can be loaded into the Curve Fit engine. }

TABLE siyavula_data(x)
   58   -100
  -81    195
  -94    210
   67   -126
  -13      9
   52   -102
 -100    228
  -11     40
   44    -96
  -54    131
END

{ A dummy equation using the table function to ensure it compiles }
y_test = siyavula_data(0)
{ CHECK y_test 12.799999999999997 2e-5 }`,
  },
  {
    id: 'radiation-view-factors',
    title: 'Radiation View Factors',
    description: 'Closed-form diffuse view factors for standard configurations.',
    category: 'Heat Transfer',
    text: `// Radiation View Factors
{ Analytic (Howell-catalog) diffuse view factors — no chart lookup
  needed. Each returns the dimensionless fraction of radiation that
  leaves surface 1 and reaches surface 2. }
F_perp = viewfactor_perp(1 [m], 1 [m], 1 [m])       { perpendicular plates sharing an edge }
F_par  = viewfactor_plates(2 [m], 2 [m], 1 [m])     { aligned parallel rectangles }
F_disk = viewfactor_disks(0.5 [m], 1 [m], 0.4 [m])  { coaxial parallel disks }

{ CHECK F_perp 0.20004377607540316 2.1e-10 }
{ CHECK F_par 0.4152532835771469 4.2e-10 }
{ CHECK F_disk 0.8319356147247143 8.4e-10 }`,
  },
  {
    id: 'material-conduction',
    title: 'Conduction (Material Database)',
    description: 'Fourier conduction using a built-in solid-material property.',
    category: 'Heat Transfer',
    text: `// Conduction Through an Aluminum Plate
{ The thermal conductivity comes from the built-in solid-material
  database via k_(Aluminum) — no need to look it up. }
T_hot = 400 [K]
T_cold = 300 [K]
L = 0.02 [m]             { plate thickness }
A = 0.25 [m^2]           { area }
k = k_(Aluminum)         { ~237 W/m-K from the material DB }

q = k * A * (T_hot - T_cold) / L   { heat rate through the plate }

{ CHECK k 237 2.4e-7 }
{ CHECK q 296250 3e-4 }`,
  },
  {
    id: 'engine-map-2d',
    title: 'Engine Map (2-D Interpolation)',
    description: 'Bilinear lookup of a brake-specific-fuel-consumption map.',
    category: 'Electrical & Powertrain',
    text: `// Engine Map - 2-D Interpolation
{ A brake-specific fuel consumption map: rows are engine speed,
  columns are load. Call the table with two arguments to bilinearly
  interpolate, bsfc(rpm, load), or use the classic-solver-style Interpolate2D. }
TABLE bsfc(rpm : load = 0.25, 0.5, 1.0)
  1000   320   300   290
  3000   280   260   250
  5000   300   270   255
END

g_per_kWh = bsfc(2500, 0.6)                  { direct curve-family call }
g_check   = Interpolate2D('bsfc', 2500, 0.6) { same value, classic-solver name }

{ CHECK g_per_kWh 268 2.7e-7 }
{ CHECK g_check 268 2.7e-7 }`,
  },
  {
    id: 'driving-cycle-energy',
    title: 'Driving-Cycle Energy (Parametric)',
    description: 'Integrate tractive power over a speed profile with IntegralValue.',
    category: 'Electrical & Powertrain',
    text: `// Driving-Cycle Energy
{ Tractive power over a speed profile, integrated to total energy.
  This uses a PARAMETRIC table: the base system leaves the speed
  free, so Solve opens the table and runs it. E_total and P_avg are
  whole-table aggregates (the same in every row), computed by the
  parametric accessor pass. }
m = 1500 [kg]
Crr = 0.012
g = 9.81 [m/s^2]
rho_air = 1.2 [kg/m^3]
Cd = 0.30
Af = 2.2 [m^2]

v = t * 1 [m/s]                       { swept speed }
F_roll = Crr * m * g
F_aero = 0.5 * rho_air * Cd * Af * v^2
P = (F_roll + F_aero) * v             { instantaneous tractive power }

E_total = IntegralValue('P', 't')     { trapezoid integral over the cycle }
P_avg = TableAvg('P')                 { mean power across the runs }

PARAMETRIC drive (t, v, P)
  t = 0:2:30
END

{ Trapezoid over t = 0:2:30 and the mean of the 16 rows. }
{ CHECK E_total 160007.4 1e-6 }
{ CHECK P_avg 5499.9 1e-8 }`,
  },
  {
    // Distinct from 'rankine-cycle' above, which is the IDEAL cycle. This one
    // carries turbine and pump isentropic efficiencies, so it is a different
    // teaching model and needs a different identity — the two shared an id,
    // and Help resolves bindings with .find(), so this document was
    // unreachable through every page that bound "rankine-cycle".
    id: 'rankine-cycle-efficiencies',
    title: 'Rankine Cycle (with component efficiencies)',
    description: 'Steam power cycle with turbine and pump isentropic efficiencies.',
    category: 'Thermodynamics',
    text: `// Ideal Rankine Cycle
{ Steam power cycle: pump -> boiler -> turbine -> condenser.
  Real-water properties, computed in the browser. Press Solve (F2). }
P_hi = 8000000 [Pa]      { boiler pressure, 8 MPa }
P_lo = 10000 [Pa]        { condenser pressure, 10 kPa }
eta_t = 0.85             { turbine isentropic efficiency }
eta_p = 0.80             { pump isentropic efficiency }

h1 = Enthalpy(Water, P=P_lo, x=0)    { saturated liquid leaving condenser }
v1 = Volume(Water, P=P_lo, x=0)

w_p = v1 * (P_hi - P_lo) / eta_p     { pump work }
h2 = h1 + w_p

T3 = 753.15 [K]                      { superheated steam, 480 C }
h3 = Enthalpy(Water, P=P_hi, T=T3)
s3 = Entropy(Water, P=P_hi, T=T3)

h4s = Enthalpy(Water, P=P_lo, s=s3)  { isentropic expansion }
w_t = eta_t * (h3 - h4s)
h4 = h3 - w_t

q_in = h3 - h2
w_net = w_t - w_p
eta_th = w_net / q_in

{ CHECK h4 2295430.93301627 0.0023 }
{ CHECK q_in 3147749.13826655 0.0032 }
{ CHECK w_net 1044124.14980918 0.0011 }
{ CHECK eta_th 0.331705006957503 3.4e-10 }`,
  },
  {
    id: 'brayton-cycle',
    title: 'Brayton Cycle',
    description: 'Gas-turbine cycle, cold air-standard with component efficiencies.',
    category: 'Thermodynamics',
    text: `// Air-Standard Brayton Cycle
{ Gas-turbine cycle, cold air-standard (constant properties). }
cp = 1004 [J/kg-K]
k = 1.4
r_p = 10                 { compressor pressure ratio }
T1 = 300 [K]             { compressor inlet }
T3 = 1400 [K]            { turbine inlet }
eta_c = 0.82
eta_t = 0.85

tau = r_p^((k - 1) / k)  { isentropic temperature ratio }
T2 = T1 + T1 * (tau - 1) / eta_c
T4 = T3 - eta_t * T3 * (1 - 1 / tau)

w_c = cp * (T2 - T1)
w_t = cp * (T3 - T4)
q_in = cp * (T3 - T2)
w_net = w_t - w_c
eta_th = w_net / q_in

{ CHECK q_in 762538.8342199575 7.7e-4 }
{ CHECK w_net 234075.91744412924 2.4e-4 }
{ CHECK eta_th 0.30696917578444155 3.1e-10 }`,
  },
  {
    id: 'otto-cycle',
    title: 'Otto Cycle',
    description: 'Spark-ignition engine efficiency from compression ratio (air-standard).',
    category: 'Thermodynamics',
    text: `// Air-Standard Otto Cycle
{ Spark-ignition engine, cold air-standard. }
k = 1.4
r = 8                    { compression ratio }
T1 = 300 [K]
q_in = 1800000 [J/kg]    { heat added per unit mass }
cv = 718 [J/kg-K]

T2 = T1 * r^(k - 1)      { isentropic compression }
T3 = T2 + q_in / cv      { constant-volume heat addition }
T4 = T3 / r^(k - 1)      { isentropic expansion }
q_out = cv * (T4 - T1)
w_net = q_in - q_out
eta_th = w_net / q_in
eta_ideal = 1 - 1 / r^(k - 1)   { closed-form air-standard efficiency }

{ CHECK w_net 1016504.493033488 1.1e-3 }
{ CHECK eta_th 0.5647247183519378 5.7e-10 }
{ CHECK eta_ideal 0.5647247183519379 5.7e-10 }`,
  },
  {
    id: 'refrigeration-vcr',
    title: 'Refrigeration Cycle',
    description: 'Vapor-compression R134a cycle COP with real-refrigerant properties.',
    category: 'Thermodynamics',
    text: `// Vapor-Compression Refrigeration (R134a)
{ Ideal VCR cycle. Real-refrigerant properties, computed in the browser. }
T_evap = 263.15 [K]      { -10 C }
T_cond = 313.15 [K]      { 40 C }
eta_comp = 0.80

P1 = P_sat(R134a, T=T_evap)
h1 = Enthalpy(R134a, T=T_evap, x=1)  { saturated vapor leaving evaporator }
s1 = Entropy(R134a, T=T_evap, x=1)

P2 = P_sat(R134a, T=T_cond)
h2s = Enthalpy(R134a, P=P2, s=s1)
h2 = h1 + (h2s - h1) / eta_comp

h3 = Enthalpy(R134a, P=P2, x=0)      { saturated liquid leaving condenser }
h4 = h3                              { throttle is isenthalpic }

q_L = h1 - h4            { refrigeration effect }
w_c = h2 - h1
COP = q_L / w_c

{ CHECK q_L 136255.66901049565 4.3e-4 }
{ CHECK w_c 42268.47396280995 1.4e-4 }
{ CHECK COP 3.223576728376346 1e-8 }`,
  },
  {
    id: 'cd-nozzle-shock',
    title: 'Nozzle with a Normal Shock',
    description: 'Air shocks where A/A* = 2 in the diverging section: Mach, pressure and stagnation-pressure loss across it.',
    category: 'Aerospace & Compressible Flow',
    text: `// Converging-Diverging Nozzle with a Normal Shock
{ Air (k = 1.4) expands from a reservoir through a C-D nozzle. A normal
  shock stands in the diverging section where the local A/A* = 2.0. }
k = 1.4
P0 = 1000000 [Pa]        { reservoir (stagnation) pressure }
T0 = 500 [K]             { reservoir temperature }
A_ratio = 2.0            { local area / throat area at the shock }

M1 = mach_A_Astar(A_ratio, k, 'supersonic')   { supersonic Mach upstream }
T1 = T0 / T0_T(M1, k)
P1 = P0 / P0_P(M1, k)

M2 = M2_shock(M1, k)                 { Mach downstream of the shock }
P2 = P1 * P2_P1_shock(M1, k)
P02 = P0 * P02_P01_shock(M1, k)      { stagnation pressure after the loss }

{ CHECK M2 0.5474316547926514 5.5e-10 }
{ CHECK P2 513400.72799562756 5.2e-4 }
{ CHECK P02 629412.8957115987 6.3e-4 }`,
  },
  {
    id: 'hx-effectiveness-ntu',
    title: 'Heat Exchanger (Effectiveness-NTU)',
    description: 'Counterflow exchanger duty and outlet temperatures via effectiveness-NTU.',
    category: 'Heat Transfer',
    text: `// Heat Exchanger — Effectiveness-NTU Method
{ Counterflow water-to-water exchanger rated with the effectiveness-NTU method. }
mdot_h = 2.0 [kg/s]
cp_h = 4180 [J/kg-K]
mdot_c = 1.5 [kg/s]
cp_c = 4180 [J/kg-K]
Th_in = 360 [K]
Tc_in = 290 [K]
UA = 12000 [W/K]

C_h = mdot_h * cp_h
C_c = mdot_c * cp_c
C_min = min(C_h, C_c)
C_max = max(C_h, C_c)
Cr = C_min / C_max
NTU = UA / C_min

eps = hx_effectiveness('counterflow', NTU, Cr)
Q_max = C_min * (Th_in - Tc_in)
Q = eps * Q_max
Th_out = Th_in - Q / C_h
Tc_out = Tc_in + Q / C_c
dTlm = LMTD(Th_in - Tc_out, Th_out - Tc_in)

{ CHECK Q 311844.933246102 0.00032 }
{ CHECK Th_out 322.697974492093 3.3e-7 }
{ CHECK Tc_out 339.736034010543 3.4e-7 }
{ CHECK dTlm 25.9870777705085 2.6e-8 }`,
  },
  {
    id: 'cubic-eos-properties',
    title: 'Cubic-EOS Real-Gas Properties',
    description: 'SRK/PR cubic EOS, no real-fluid backend: Z, density, and saturation pressure.',
    category: 'Thermodynamics',
    text: `// Real-Gas Properties from a Cubic EOS (Peng-Robinson)
{ An SRK/PR cubic EOS that needs no real-fluid backend. CO2 at 6 MPa, 320 K. }
T = 320 [K]
P = 6000000 [Pa]
Z = eos_z('co2', 'PR', T, P, 'vapor')          { compressibility factor }
rho = eos_density('co2', 'PR', T, P, 'vapor')
v = eos_volume('co2', 'PR', T, P, 'vapor')
h = eos_enthalpy('co2', 'PR', T, P, 'vapor')
Psat_300 = eos_psat('co2', 'PR', 300)          { saturation pressure at 300 K }

{ CHECK rho 142.796497070525 1.5e-7 }
{ CHECK h -45003.83281558031 4.6e-5 }
{ CHECK Psat_300 6726910.38265417 6.8e-3 }`,
  },
  {
    id: 'engine-cycle-wiebe',
    title: 'Engine Cycle (Wiebe Heat Release)',
    description: 'Crank-angle single-zone SI-engine pressure trace via a DYNAMIC block.',
    category: 'Electrical & Powertrain',
    text: `// Single-Zone Engine Cycle (Wiebe Heat Release)
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

p_max = MaxValue('p') * 1 [Pa]      { peak cylinder pressure }

{ CHECK p_max 4473698.179189238 4.5e-3 }`,
  },
  {
    id: 'adiabatic-flame-temp',
    title: 'Adiabatic Flame Temperature',
    description: 'Methane-air flame temperature, stoichiometric AFR, and heating value.',
    category: 'Thermodynamics',
    text: `// Adiabatic Flame Temperature
{ Complete combustion of methane in air (products frozen, no dissociation).
  Edit phi: 1.0 is stoichiometric, < 1.0 is excess air (lower flame temp). }
phi     = 1.0              { equivalence ratio (1 = stoichiometric, <1 = excess air) }
T_react = 298.15 [K]       { reactants enter at 25 C }
T_flame = AdiabaticFlameTemp('CH4', phi, T_react)
AFR_st  = StoichAFR('CH4') { stoichiometric air-fuel ratio (mass basis) }
LHV     = HeatingValue('CH4', 'LHV')

{ CHECK T_flame 2325.598129753964 2.4e-6 }
{ CHECK AFR_st 17.119975067007417 1.8e-8 }
{ CHECK LHV 50009973.19703297 5.1e-2 }`,
  },
  {
   id: 'pneumatic-spring-actuator',
   "title": "Spring-return pneumatic actuator",
    "description": "Air at 1.2 barA against a 1330 N/m return spring: 35.5 N of force and a 26.7 mm stroke.",
    "category": "Fluids & Fluid Power",
    "text": "PneumaticSupply supply(fluid$=Air, P=120000 [Pa], T=293.15 [K])\nPneumaticActuator actuator(fluid$=Air, area=0.001774 [m^2], Patm=100000 [Pa])\nTransSpring spring(k=1330 [N/m], x0=0 [m])\nTransGround ground()\nconnect(supply.out, actuator.in)\nconnect(actuator.rod, spring.a)\nconnect(spring.b, ground.port)\nstroke = spring.x\nforce = -actuator.rod.f\n{ CHECK stroke 0.0266766917293233 1e-8 }\n{ CHECK force 35.48 1e-6 }"
  },
  {
   id: 'hydraulic-spring-actuator',
   "title": "Hydraulic actuator holding a spring load",
    "description": "Oil at 11 barA on a 10 cm² piston carries 1 kN and compresses a 50 kN/m spring 20 mm.",
    "category": "Fluids & Fluid Power",
    "text": "HydraulicSupply supply(P=1100000 [Pa])\nHydraulicCylinder cylinder(rho=850 [kg/m^3], beta=1.5e9 [Pa], V0=0.0001 [m^3], area=0.001 [m^2], Patm=100000 [Pa], P0=1100000 [Pa])\nTransSpring spring(k=50000 [N/m], x0=0.02 [m])\nTransGround ground()\nconnect(supply.out, cylinder.in)\nconnect(cylinder.rod, spring.a)\nconnect(spring.b, ground.port)\nload = -cylinder.rod.f\nstroke = spring.x\n{ CHECK load 1000 1e-6 }\n{ CHECK stroke 0.02 1e-8 }"
  },
  {
   id: 'pneumatic-sonic-restriction',
   "title": "Air supply through a sonic restriction",
    "description": "7 barA air exhausts to atmosphere through an ISO 6358 restriction; at a pressure ratio of 0.14 the flow is choked.",
    "category": "Fluids & Fluid Power",
    "text": "PneumaticSupply supply(fluid$=Air, P=700000 [Pa], T=293.15 [K])\nPneumaticOrifice restriction(fluid$=Air, C=1e-8, b=0.35)\nPneumaticAtmosphere atmosphere(P=100000 [Pa])\nconnect(supply.out, restriction.in)\nconnect(restriction.out, atmosphere.port)\npressure_ratio = restriction.out.P / restriction.in.P\nmass_flow = restriction.in.mdot\n{ CHECK pressure_ratio 0.142857142857143 1e-9 }\n{ CHECK mass_flow 0.008295 1e-7 }"
  },
  {
   id: 'damped-actuator-motion',
   "title": "Damped actuator motion",
    "description": "The pneumatic actuator's 35.5 N drives a 0.1 kg mass on a spring and damper to its 26.7 mm rest stroke.",
    "category": "Mechanics",
    "text": "ForceSource drive(F=35.48 [N])\nTransMass moving(m=0.1 [kg], v0=0 [m/s])\nTransSpring spring(k=1330 [N/m], x0=0 [m])\nTransDamper damper(c=23.0651251893416 [N-s/m])\nTransGround ground()\nconnect(drive.a, moving.port, spring.a, damper.a)\nconnect(drive.b, spring.b, damper.b, ground.port)\nDYNAMIC motion(method=ode45, time=0..0.2, points=101)\nEND\nfinal_stroke = FinalValue('spring.x') * 1 [m]\n{ CHECK final_stroke 0.0266766917 1e-6 }"
  },
  {
   id: 'reduction-gear-viscous-load',
   "title": "Reduction gear driving a viscous load",
    "description": "A 12 N·m torque through a 3:1 reduction turns a viscous load at 60 rad/s, absorbing 2.16 kW.",
    "category": "Mechanics",
    "text": "TorqueSource drive(T=12 [N-m])\nGear gear(ratio=3)\nRotationalDamper load(c=0.6 [N-m-s])\nMechGround ground()\nconnect(drive.a, gear.in)\nconnect(gear.out, load.a)\nconnect(drive.b, load.b, ground.port)\ninput_speed = gear.in.w\noutput_speed = gear.out.w\nload_power = load.a.tau * load.a.w\n{ CHECK input_speed 180 1e-6 }\n{ CHECK output_speed 60 1e-6 }\n{ CHECK load_power 2160 1e-4 }"
  },
  {
   id: 'pi-temperature-regulation',
   "title": "PI temperature regulation of a thermal mass",
    "description": "A PI heater brings a 5 kJ/K mass from 300 K to a 350 K setpoint against conduction to ambient.",
    "category": "Heat Transfer",
    "text": "PIThermostat controller(Kp=100 [W/K], Ki=0.5 [W/K-s], Tref=350 [K])\nThermalMass body(C=5000 [J/K], T0=300 [K])\nConduction wall(k=2 [W/m-K], area=1 [m^2], L=0.1 [m])\nThermalSource ambient(T=300 [K])\nconnect(controller.port, body.port, wall.a)\nconnect(wall.b, ambient.port)\nDYNAMIC heating(method=ode45, time=0..2000, points=201)\nEND\nfinal_temperature = FinalValue('body.port.t') * 1 [K]\nfinal_heat = -FinalValue('controller.port.qdot') * 1 [W]\n{ CHECK final_temperature 350 0.02 }\n{ CHECK final_heat 1000 0.5 }"
  },
  {
   id: 'glazed-opening-heat-loss',
   "title": "Heat loss through a glazed opening",
    "description": "Inner film, glass and outer film in series between 20 °C inside and 0 °C outside, across 0.9 m² of single glazing.",
    "category": "Heat Transfer",
    "text": "ThermalSource inside(T=293.15 [K])\nConvection inner_film(htc=8 [W/m^2-K], area=0.9 [m^2])\nConduction glass(k=0.81 [W/m-K], area=0.9 [m^2], L=0.003 [m])\nConvection outer_film(htc=25 [W/m^2-K], area=0.9 [m^2])\nThermalSource outside(T=273.15 [K])\nconnect(inside.port, inner_film.a)\nconnect(inner_film.b, glass.a)\nconnect(glass.b, outer_film.a)\nconnect(outer_film.b, outside.port)\nheat_loss = glass.Q\nresistance = 1/(8 [W/m^2-K]*0.9 [m^2]) + 0.003 [m]/(0.81 [W/m-K]*0.9 [m^2]) + 1/(25 [W/m^2-K]*0.9 [m^2])\nexpected_heat = 20 [K]/resistance\nbalance_error = heat_loss - expected_heat\n{ CHECK balance_error 0 1e-7 }"
  },
  {
   id: 'sensor-detrend-smooth-window',
   "title": "Remove drift and smooth a sampled sensor trace",
    "description": "Detrend, a three-point moving average and a Hann window applied to an eight-sample trace.",
    "category": "Data & Analysis",
    "text": "trace = [1, 3, 2, 6, 4, 9, 5, 12]\n[detrended] = Detrend(trace)\n[centered] = Detrend(trace, 'constant')\n[smoothed] = Smooth(trace, 3)\n[tapered] = Window(detrended[1:8], 'hann')\ncentered_mean = sum(centered[1:8])/8\nresidual_mean = sum(detrended[1:8])/8\nleft_edge = smoothed[1]\n{ CHECK centered_mean 0 1e-9 }\n{ CHECK residual_mean 0 1e-9 }\n{ CHECK left_edge 2 1e-9 }\n{ CHECK tapered[1] 0 1e-9 }\n{ CHECK tapered[8] 0 1e-9 }"
  },
  {
   id: 'causal-zero-phase-filter',
   "title": "Causal filtering, zero-phase filtering and convolution",
    "description": "A two-tap average on an impulse: Filter delays it, FiltFilt keeps it centred and Convolve gives the full response.",
    "category": "Data & Analysis",
    "text": "samples = [0, 0, 0, 1, 0, 0, 0]\nb = [0.5, 0.5]\na = [1]\n[causal] = Filter(b, a, samples)\n[zero_phase] = FiltFilt(b, a, samples)\n[full_response] = Convolve(samples, b)\nsymmetry_error = zero_phase[3]-zero_phase[5]\n{ CHECK causal[4] 0.5 1e-9 }\n{ CHECK causal[5] 0.5 1e-9 }\n{ CHECK full_response[8] 0 1e-9 }\n{ CHECK symmetry_error 0 1e-9 }"
  },
  {
   id: 'transport-delay-peak-detection',
   "title": "Measure transport delay and detect peaks",
    "description": "Cross-correlation finds a one-sample (0.1 s) lag between two pulses, and peakcount counts three peaks.",
    "category": "Data & Analysis",
    "text": "late = [0, 0, 1, 2, 1, 0, 0]\nearly = [0, 1, 2, 1, 0, 0, 0]\n[correlation] = XCorr(late, early)\npeak_position = peakindex(1, 0, 0, correlation[1:13])\nlag_samples = peak_position - 7\ndelay_seconds = 0.1 [s]*lag_samples\npulses = [0, 3, 0, 0, 5, 0, 0, 2, 0]\ncount = peakcount(0, 0, pulses)\n{ CHECK lag_samples 1 1e-9 }\n{ CHECK delay_seconds 0.1 1e-9 }\n{ CHECK count 3 1e-9 }"
  },
  {
   id: 'uniform-area-tolerance',
   "title": "Uniform dimensional tolerance and propagated spread",
    "description": "A ±10 % uniform tolerance on piston area spreads a 35.5 N force by 2.05 N (one standard deviation).",
    "category": "Data & Analysis",
    "text": "area = 0.001774 [m^2]\nforce = 20000 [Pa]*area\nDistributionOf(area) = Uniform(0.0015966, 0.0019514)\nforce_sigma = UncertaintyOf(force)\n{ CHECK force 35.48 1e-8 }\n{ CHECK force_sigma 2.048438755 1e-7 }"
  },
  {
   id: 'uncertain-tank-inventory',
   "title": "Tank inventory from uncertain measurements",
    "description": "Gas mass in a tank from pressure, volume and temperature readings, each carrying its own uncertainty.",
    "category": "Data & Analysis",
    "text": "pressure = 934000 [Pa]\nvolume = 0.010 [m^3]\ntemperature = 295.45 [K]\nmass = pressure*volume/(208.1 [J/kg-K]*temperature)\nUncertaintyOf(pressure) = 22000\nUncertaintyOf(volume) = 0.0004\nUncertaintyOf(temperature) = 1.2\nmass_sigma = UncertaintyOf(mass)\n{ CHECK mass 0.151911552344956 1e-9 }\n{ CHECK mass_sigma 0.00707868056268796 1e-8 }"
  },
  {
    id: 'rc-step-charging',
    title: 'RC step charging',
    description: 'A 10 V step charges a 1 µF capacitor through 1 kΩ.',
    category: 'Electrical & Powertrain',
    text: `VoltageSource VS(E=10 [V])
Resistor R(R=1000 [ohm])
Capacitor CAP(C=1e-6 [farad], V0=0 [V])
Ground G()
connect(VS.p, R.a)
connect(R.b, CAP.p)
connect(CAP.n, VS.n, G.port)
DYNAMIC charge(method=ode45, time=0..0.005, points=101)
END
tau = 1000 [ohm] * 1e-6 [farad]
v_2ms = ODEValue('cap.vc', 0.002) * 1 [V]
i_2ms = (10 [V] - v_2ms) / 1000 [ohm]
{ CHECK tau 0.001 1e-12 }
{ CHECK v_2ms 8.64664716763387 1e-7 }
{ CHECK i_2ms 0.00135335283236613 1e-9 }`,
  },
  {
    id: 'series-rlc-resonance',
    title: 'Series RLC resonance and damping',
    description: 'A 1 V step rings a series RLC circuit at 7071 rad/s with damping ratio 0.071.',
    category: 'Electrical & Powertrain',
    text: `VoltageSource VS(E=1 [V])
Inductor L1(L=0.001 [H], I0=0 [A])
Resistor R1(R=1 [ohm])
Capacitor C1(C=20e-6 [farad], V0=0 [V])
Ground G()
connect(VS.p, L1.p)
connect(L1.n, R1.a)
connect(R1.b, C1.p)
connect(C1.n, VS.n, G.port)
DYNAMIC ring(method=ode45, time=0..0.01, points=201)
END
omega_n = 1 / sqrt(0.001 [H] * 20e-6 [farad]) { angular frequency, rad/s }
zeta = 1 [ohm] / (2 * sqrt(0.001 [H] / 20e-6 [farad]))
{ CHECK omega_n 7071.06781186548 1e-7 }
{ CHECK zeta 0.0707106781186548 1e-9 }`,
  },
  {
    id: 'resistor-bridge-equivalent',
    title: 'Resistor bridge equivalent resistance',
    description: 'Reduce a five-resistor bridge to its equivalent resistance.',
    category: 'Electrical & Powertrain',
    text: `VoltageSource VS(E=1 [V])
Resistor R1(R=10 [ohm])
Resistor R2(R=20 [ohm])
Resistor R3(R=30 [ohm])
Resistor R4(R=40 [ohm])
Resistor R5(R=50 [ohm])
Ground G()
connect(VS.p, R1.a, R3.a)
connect(R1.b, R2.a, R5.a)
connect(R3.b, R4.a, R5.b)
connect(R2.b, R4.b, VS.n, G.port)
current = -VS.p.I
R_eq = 1 [V] / current
{ CHECK R_eq 20.9459459459459 1e-9 }`,
  },
  {
    id: 'resistor-bridge-parametric',
    title: 'Bridge network parametric study',
    description: 'Solve Table to sweep the bridge diagonal resistor and compare equivalent resistance.',
    category: 'Electrical & Powertrain',
    text: `VoltageSource VS(E=1 [V])
Resistor R1(R=10 [ohm])
Resistor R2(R=20 [ohm])
Resistor R3(R=30 [ohm])
Resistor R4(R=40 [ohm])
r5 = 50 [ohm]
Resistor R5(R=r5)
Ground G()
connect(VS.p, R1.a, R3.a)
connect(R1.b, R2.a, R5.a)
connect(R3.b, R4.a, R5.b)
connect(R2.b, R4.b, VS.n, G.port)
R_eq = 1 [V] / (-VS.p.I)
PARAMETRIC bridge (r5, R_eq)
  r5 = 10:10:50
END
{ CHECK R_eq 20.9459459459459 1e-9 }`,
  },
  {
    id: 'pneumatic-diaphragm-fill',
    title: 'Orifice-fed diaphragm actuator',
    description: 'A spring-loaded diaphragm fills through an orifice until the spring balances 20 kPa.',
    category: 'Fluids & Fluid Power',
    text: `{ A 1774 mm2 diaphragm on a 1.33 N/mm spring is fed at 20 kPa gauge through an
  ISO 6358 orifice into a 15 cm3 chamber. The stem (0.1 kg) is critically damped.
  Near equal pressures the orifice flow is linear in the pressure difference, so
  the chamber settles exponentially; by 2 s it is at rest. Then the stroke is
  dP*A/k = 26.68 mm and the chamber holds the full 20.0 kPa, the textbook answer. }
PneumaticSupply supply(fluid$=Air, P=120000 [Pa], T=293.15 [K])
PneumaticOrifice feed(fluid$=Air, C=2e-9 [m^3/s-Pa], b=0.3)
PneumaticVolume chamber(V=15e-6 [m^3], T=293.15 [K], R=287 [J/kg-K], P0=100000 [Pa])
PneumaticActuator diaphragm(fluid$=Air, area=0.001774 [m^2], Patm=100000 [Pa])
TransMass stem(m=0.1 [kg], v0=0 [m/s])
TransSpring spring(k=1330 [N/m], x0=0 [m])
TransDamper damper(c=23.0651251893416 [kg/s])
TransGround ground()
connect(supply.out, feed.in)
connect(feed.out, chamber.in)
connect(chamber.out, diaphragm.in)
connect(diaphragm.rod, stem.port, spring.a, damper.a)
connect(spring.b, damper.b, ground.port)
DYNAMIC fill(method=ode45, time=0..2, points=201)
END
z_final = FinalValue('spring.x') * 1 [m]
dP_final = FinalValue('chamber.in.P') * 1 [Pa] - 100000 [Pa]
z_static = 20000 [Pa] * 0.001774 [m^2] / 1330 [N/m]
{ CHECK z_final 0.0266766917293233 1e-12 }
{ CHECK dP_final 20000 0.001 }
{ CHECK z_static 0.0266766917293233 1e-12 }`,
  },
  {
    id: 'pneumatic-cylinder-stall-force',
    title: 'Double-acting cylinder stall force',
    description: 'Net rod force of a 25 mm bore cylinder at 7 barA, rod side vented.',
    category: 'Fluids & Fluid Power',
    text: `{ 25 mm bore, 12 mm rod, 7.0 barA on the cap side and atmosphere (1.013 barA)
  on the rod side, rod held still. The component reports the force of the two
  chamber pressures on the piston; atmosphere also pushes on the rod end outside
  the cylinder, so the net force is (P1 - Patm) * A_cap = 293.88 N. }
D = 0.025 [m]
d_rod = 0.012 [m]
A_cap = pi# * D^2 / 4
A_annulus = pi# * (D^2 - d_rod^2) / 4
P_atm = 101300 [Pa]
PneumaticSupply supply(fluid$=Air, P=700000 [Pa], T=293.15 [K])
PneumaticSupply exhaust(fluid$=Air, P=P_atm, T=293.15 [K])
PneumaticDoubleActingCylinder cyl(Aa=A_cap, Ab=A_annulus, R=287 [J/kg-K], T=293.15 [K], Va0=1e-5 [m^3], Vb0=1e-5 [m^3], Pa0=700000 [Pa], Pb0=P_atm)
TransGround stop()
connect(supply.out, cyl.a)
connect(exhaust.out, cyl.b)
connect(cyl.rod, stop.port)
F_chambers = -cyl.rod.f
F_rod_end = P_atm * pi# * d_rod^2 / 4
F_net = F_chambers - F_rod_end
{ CHECK F_chambers 305.342935355394 1e-06 }
{ CHECK F_rod_end 11.4567600891113 1e-08 }
{ CHECK F_net 293.886175266283 1e-06 }`,
  },
  {
    id: 'pneumatic-accumulator-equalization',
    title: 'Three accumulators equalizing',
    description: 'Three air receivers equalize through a large and a small orifice.',
    category: 'Fluids & Fluid Power',
    text: `{ Receivers of 20, 20 and 100 L at 15, 10 and 1 barA, joined in a chain by a
  500 mm2 and a 20 mm2 orifice (ISO 6358 conductance taken as 2e-9 m3/(s Pa)
  per mm2, b = 0.5). Isothermal mass conservation fixes the end state:
  sum(P*V)/sum(V) = 4.2857 barA (textbook 4.29 barA). The large orifice
  equalizes the first two receivers within seconds; the small one sets the
  long tail into the third. }
function [port] = ClosedEnd(T [K], domain$ = gas)
port(port)
  port.mdot = 0
  port.h    = Enthalpy(Air, P=port.P, T=T)
end
function [port] = GasCap(domain$ = gas)
port(port)
  port.mdot = 0
end
ClosedEnd        head(T=293.15 [K])
PneumaticVolume  tank1(V=0.020 [m^3], T=293.15 [K], R=287 [J/kg-K], P0=1500000 [Pa])
PneumaticOrifice big(fluid$=Air, C=1e-6 [m^3/s-Pa], b=0.5)
PneumaticVolume  tank2(V=0.020 [m^3], T=293.15 [K], R=287 [J/kg-K], P0=1000000 [Pa])
PneumaticOrifice small(fluid$=Air, C=4e-8 [m^3/s-Pa], b=0.5)
PneumaticVolume  tank3(V=0.100 [m^3], T=293.15 [K], R=287 [J/kg-K], P0=100000 [Pa])
GasCap           tail()
connect(head.port, tank1.in)
connect(tank1.out, big.in)
connect(big.out, tank2.in)
connect(tank2.out, small.in)
connect(small.out, tank3.in)
connect(tank3.out, tail.port)
DYNAMIC equalize(method=ode23s, time=0..200, points=201)
END
P1_final = FinalValue('tank1.in.P') * 1 [Pa]
P2_final = FinalValue('tank2.in.P') * 1 [Pa]
P3_final = FinalValue('tank3.in.P') * 1 [Pa]
P_mass_balance = (1500000 [Pa] * 0.020 [m^3] + 1000000 [Pa] * 0.020 [m^3] + 100000 [Pa] * 0.100 [m^3]) / (0.140 [m^3])
{ CHECK P1_final 428570.809647344 5 }
{ CHECK P2_final 428571.41397698 5 }
{ CHECK P3_final 428571.555275133 5 }
{ CHECK P_mass_balance 428571.428571429 1e-06 }`,
  },
  {
    id: 'hydraulic-vertical-cylinder',
    title: 'Vertical cylinder under weight and spring',
    description: 'Oil pressure that holds a 3.2 kg piston against a 150 N spring.',
    category: 'Fluids & Fluid Power',
    text: `{ A vertical cylinder of 35 cm2 bore, blocked inlet, carries a 3.2 kg piston
  and a 150 N spring load; the far side is at 95 kPa. The force balance gives
  P = Patm + (m g + F_spring) / A = 146.83 kPa. The source bank lists
  146.97 kPa, 0.1 % higher, consistent with a rounded g. }
function [port] = OilCap(domain$ = oil)
port(port)
  port.mdot = 0
  port.h    = 0
end
m_piston = 3.2 [kg]
g = 9.81 [m/s^2]
A = 0.0035 [m^2]
P_atm = 95000 [Pa]
F_spring = 150 [N]
OilCap            blocked()
HydraulicCylinder cyl(rho=870 [kg/m^3], beta=1.5e9 [Pa], V0=0.0002 [m^3], area=A, Patm=P_atm, P0=150000 [Pa])
TransMass         piston(m=m_piston, v0=0 [m/s])
ForceSource       weight(F=m_piston * g)
ForceSource       spring(F=F_spring)
TransGround       ground()
connect(blocked.port, cyl.in)
connect(cyl.rod, piston.port, weight.b, spring.b)
connect(weight.a, spring.a, ground.port)
P_oil = cyl.in.P
P_hand = P_atm + (m_piston * g + F_spring) / A
{ CHECK P_oil 146826.285714286 1e-06 }
{ CHECK P_hand 146826.285714286 1e-06 }`,
  },
  {
    id: 'hydraulic-orifice-lpm',
    title: 'Sharp-edged orifice in L/min',
    description: 'Oil flow through a 3 mm orifice at 40 bar, reported in L/min.',
    category: 'Fluids & Fluid Power',
    text: `{ Inputs written in engineering units ([mm], [bar]) are stored in SI, so the
  model reads as the problem does. Q = Cd * A * sqrt(2 dP / rho) with Cd = 0.61:
  4.159e-4 m3/s, or 24.95 L/min (textbook 4.16e-4 m3/s, 24.97 L/min). }
d = 3 [mm]
C_d = 0.61
rho = 860 [kg/m^3]
dP = 40 [bar]
P_tank = 1 [bar]
CdA = C_d * pi# * d^2 / 4
HydraulicSupply  pump(P=P_tank + dP)
HydraulicOrifice jet(CdA=CdA, rho=rho)
HydraulicTank    tank(P=P_tank)
connect(pump.out, jet.in)
connect(jet.out, tank.port)
GUESS jet.in.mdot = 0.4
Q = jet.in.mdot / rho
Q_lpm = Q / (1 [l/min])  { the flow as a count of litres per minute }
Q_hand = CdA * sqrt(2 * dP / rho)
{ CHECK Q 0.00041587038427498 1e-12 }
{ CHECK Q_lpm 24.9522230564988 1e-06 }
{ CHECK Q_hand 0.00041587038427498 1e-12 }`,
  },
  {
    id: 'tank-orifice-draining',
    title: 'Tank draining through a bottom orifice',
    description: 'A 3 m tank drains through a 3 cm orifice.',
    category: 'Fluids & Fluid Power',
    text: `{ A 3.0 m diameter open tank, 2.75 m of water, drains through a 3 cm bottom
  orifice (Cd = 0.55). Torricelli gives the time to empty in closed form,
  t = (D/d)^2 / Cd * sqrt(2 H0 / g) = 13,616 s, and the time to fall to a
  quarter of the height is half of it. The simulated level reaches H0/4 at
  that time. The source bank lists 12,306 s to empty, which the stated inputs
  do not reproduce. }
function [port] = NoInflow(domain$ = liquid)
port(port)
  port.mdot = 0
  port.h    = 104900
end
function [port] = Atmosphere(P [Pa], domain$ = liquid)
port(port)
  port.P = P
end
D = 3.0 [m]
H0 = 2.75 [m]
d_o = 0.03 [m]
C = 0.55
rho = 998 [kg/m^3]
g = 9.80665 [m/s^2]
NoInflow     lid()
OpenTank     tank(A_t=pi# * D^2 / 4, P0=101325 [Pa], rho=rho, L0=H0)
GravityDrain orifice(Cd=C, A_d=pi# * d_o^2 / 4, rho=rho)
Atmosphere   outside(P=101325 [Pa])
connect(lid.port, tank.in)
connect(tank.out, orifice.in)
connect(orifice.out, outside.port)
DYNAMIC drain(method=ode45, time=0..14000, points=1401)
END
t_quarter = TimeAt('tank.lvl', H0 / 4) * 1 [s]
t_empty_hand = (D / d_o)^2 / C * sqrt(2 * H0 / g)
t_quarter_hand = t_empty_hand * (1 - sqrt(1/4))
{ CHECK t_quarter 6808.13866650534 0.01 }
{ CHECK t_empty_hand 13616.2751079056 1e-06 }
{ CHECK t_quarter_hand 6808.13755395278 1e-06 }`,
  },
  {
    id: 'gear-impedance-reflection',
    title: 'Gear train and reflected stiffness',
    description: 'A 25:50 gear reflects an output spring to the input shaft.',
    category: 'Mechanics',
    text: `{ A 10 N-m motor drives a 1 kg-m2 rotor through a 25:50 gear into a
  4 N-m/rad shaft spring. Seen from the input the spring is K2 / GR^2 =
  1 N-m/rad, so the rotor rings at 1 rad/s. Released from rest, the output
  twist swings to twice its static value T2 / K2 = 5 rad and peaks at
  t = pi s. }
N1 = 25
N2 = 50
GR = N2 / N1
T1 = 10 [N-m]
K2 = 4 [N-m]
J1 = 1 [kg-m^2]
TorqueSource     motor(T=T1)
Inertia          rotor(J=J1, w0=0 [rad/s])
Gear             mesh(ratio=GR)
RotationalSpring shaft(k=K2, theta0=0 [rad])
MechGround       frame1()
MechGround       frame2()
connect(motor.a, rotor.port, mesh.in)
connect(motor.b, frame1.port)
connect(mesh.out, shaft.a)
connect(shaft.b, frame2.port)
DYNAMIC release(method=ode45, time=0..10, points=1001)
END
K_e = K2 / GR^2
T2 = GR * T1
theta2_static = T2 / K2
omega_n = sqrt(K_e / J1)
theta2_peak = MaxValue('shaft.theta') * 1 [rad]
t_peak = pi# / omega_n
theta2_at_peak = ODEValue('shaft.theta', t_peak / (1 [s])) * 1 [rad]
{ CHECK GR 2.0 1e-12 }
{ CHECK K_e 1.0 1e-12 }
{ CHECK T2 20.0 1e-12 }
{ CHECK theta2_static 5.0 1e-12 }
{ CHECK theta2_peak 9.99999245795475 0.0001 }
{ CHECK theta2_at_peak 9.9999653735619 0.0001 }`,
  },
  {
    id: 'vehicle-launch-equivalent-mass',
    title: 'Vehicle acceleration with rotating inertia',
    description: 'Engine, gearbox, wheels and body; the wheels add equivalent mass.',
    category: 'Electrical & Powertrain',
    text: `{ 2165 kg car, four 22.9 kg wheels (r = 0.33 m, taken as discs), 325 N-m at
  the engine through 4.28:1 at 85 % efficiency, Cd = 0.38, A = 1.86 m2,
  fr = 0.02, from 10 m/s. The wheels add J/r^2 = 45.8 kg of equivalent mass.
  A slip tyre joins the wheel inertia to the body; a rigid joint would make
  the system index-2. The simulated acceleration over 0.5-1 s matches
  (F_t - F_res) / m_eq at the mid speed. The source bank's 1.203 m/s2 depends
  on a speed or drivetrain inertia it does not state. }
m = 2165 [kg]
m_wheel = 22.9 [kg]
r = 0.33 [m]
T_e = 325 [N-m]
i_g = 4.28
eta = 0.85
C_d = 0.38
A_f = 1.86 [m^2]
f_r = 0.02
rho_air = 1.225 [kg/m^3]
v_0 = 10 [m/s]
J_wheels = 4 * 0.5 * m_wheel * r^2
Engine       engine(Tmax=T_e, throttle=1, bf=0 [N-m-s])
Transmission gearbox(ratio=i_g, eta=eta)
Inertia      wheels(J=J_wheels, w0=v_0 / r * 1 [rad])
TireLongitudinal tyre(r=r, Fz=m * 9.80665 [m/s^2], B=10, C=1.9, D=1.0, epsv=0.1 [m/s])
VehicleBody  body(m=m, Cd=C_d, Af=A_f, rhoA=rho_air, Crr=f_r, grade=0 [rad], v0=v_0)
connect(engine.shaft, gearbox.in)
connect(gearbox.out, wheels.port, tyre.wheel)
connect(tyre.veh, body.port)
DYNAMIC launch(method=ode45, time=0..1, points=101)
END
v_a = ODEValue('body.port.vel', 0.5) * 1 [m/s]
v_b = ODEValue('body.port.vel', 1.0) * 1 [m/s]
a_sim = (v_b - v_a) / 0.5 [s]
v_mid = (v_a + v_b) / 2
F_t = T_e * i_g * eta / r
F_res = 0.5 * rho_air * C_d * A_f * v_mid^2 + f_r * m * 9.80665 [m/s^2]
m_eq = m + J_wheels / r^2
a_hand = (F_t - F_res) / m_eq
{ CHECK a_sim 1.40436851073671 0.0001 }
{ CHECK a_hand 1.40463315299653 0.0001 }
{ CHECK m_eq 2210.8 1e-09 }`,
  },
  {
    id: 'capstan-belt-friction',
    title: 'Belt friction lifting a load',
    description: 'Capstan equation in US customary units.',
    category: 'Mechanics',
    text: `{ A rope wrapped half a turn round a fixed drum (f = 0.30) lifts 50 lbf.
  The capstan equation P = W * exp(f * theta) gives 128.3 lbf. Inputs in
  [lbf] and [deg] are stored in SI; dividing by one unit reads a result back
  in that unit. }
W = 50 [lbf]
f = 0.30
theta = 180 [deg]
P = W * exp(f * theta)
P_lbf = P / (1 [lbf])
P_N = P / (1 [N])
{ CHECK P 570.780761615404 1e-08 }
{ CHECK P_lbf 128.316619760407 1e-08 }`,
  },
  {
    id: 'second-order-step-metrics',
    title: 'Second-order step response metrics',
    description: 'Natural frequency, damping, peak time, overshoot and settling time of 121/(s^2+11s+121).',
    category: 'Control Systems',
    text: `{ T(s) = 121 / (s^2 + 11 s + 121): wn = 11 rad/s, zeta = 0.5. stepinfo
  measures the sampled response (5 ms grid) against the closed-form metrics:
  Tp = 0.330 s, OS = 16.3 %. The textbook settling time, 0.727 s, is the
  4 / (zeta wn) estimate; the measured 2 % settling time is 0.734 s. }
num = [0, 0, 121]
den = [1, 11, 121]
tv = 0:0.005:2
[ys] = step(num, den, tv)
[Tr, Tp, Ts, OS] = stepinfo(tv, ys)
omega_n = sqrt(den[3])
zeta = den[2] / (2 * omega_n)
Tp_formula = pi# / (omega_n * sqrt(1 - zeta^2))
OS_formula = 100 * exp(-zeta * pi# / sqrt(1 - zeta^2))
Ts_formula = 4 / (zeta * omega_n)
{ CHECK omega_n 11.0 1e-12 }
{ CHECK zeta 0.5 1e-12 }
{ CHECK Tp 0.33 1e-09 }
{ CHECK OS 16.3054379807141 1e-06 }
{ CHECK Ts 0.734080151892073 1e-06 }
{ CHECK Tp_formula 0.32978170258804 1e-09 }
{ CHECK OS_formula 16.303353482158 1e-09 }
{ CHECK Ts_formula 0.727272727272727 1e-12 }`,
  },
  {
    id: 'pi-zero-overshoot',
    title: 'PI control with zero overshoot',
    description: 'A PI zero at 0.1 on 800/(s^2+101s+100) gives no overshoot and no steady-state error.',
    category: 'Control Systems',
    text: `{ Plant 800 / (s^2 + 101 s + 100) under PI control Kp (s + zc) / s with
  Kp = 0.48, zc = 0.10, unity feedback. The step never overshoots (the peak is
  the last sample) and the closed-loop DC gain is exactly 1, so e_ss = 0. The
  price is a slow tail from the closed-loop pole near the PI zero. }
K_p = 0.48
z_c = 0.10
num_c = [K_p, K_p * z_c]
den_c = [1, 0]
num_p = [0, 0, 800]
den_p = [1, 101, 100]
[num_l, den_l] = series(num_c, den_c, num_p, den_p)
num_h = [1]
den_h = [1]
[num_t, den_t] = feedback(num_l, den_l, num_h, den_h)
tv = 0:0.5:80
[ys] = step(num_t, den_t, tv)
[Tr, Tp, Ts, OS] = stepinfo(tv, ys)
y_80 = ys[161]
e_ss = 1 - num_t[4] / den_t[4]
y_peak = max(ys[1:161])
{ CHECK OS 0.0 1e-09 }
{ CHECK e_ss 0.0 1e-12 }
{ CHECK y_80 0.999691373519896 1e-06 }
{ CHECK y_peak 0.999691373519896 1e-06 }`,
  },
  {
    id: 'first-order-motor-step',
    title: 'First-order motor speed step',
    description: 'Time constant of G = 1000/(0.00992 s + 1).',
    category: 'Control Systems',
    text: `{ Motor speed G(s) = 1000 / (0.00992 s + 1) under a unit step. TimeAt finds
  when the speed reaches 63.2 % of 1000 rad/s, which is the time constant,
  9.92 ms; ODEValue reads the speed at that instant. }
K = 1000 [rad/s]
tau = 0.00992 [s]
DYNAMIC spinup(method=ode45, time=0..0.05, points=501, rtol=1e-9)
  der(w) = (K * 1 - w) / tau
  w(0) = 0
END
w_ss = K
t_63 = TimeAt('w', 1000 * (1 - exp(-1))) * 1 [s]
w_at_tau = ODEValue('w', 0.00992) * 1 [rad/s]
fraction_at_tau = w_at_tau / w_ss
{ CHECK t_63 0.00992008065196089 1e-07 }
{ CHECK w_at_tau 632.117576902679 0.001 }
{ CHECK fraction_at_tau 0.632117576902679 1e-06 }`,
  },
  {
    id: 'moist-air-adiabatic-mixing',
    title: 'Adiabatic mixing of two air streams',
    description: '1000 L/s of warm air mixes with 500 L/s of cool air.',
    category: 'HVAC & Refrigeration',
    text: `{ 1.0 m3/s at 38 C DB / 24 C WB mixes with 0.5 m3/s at 16 C DB / 10 C WB at
  101.325 kPa. Volume flows become dry-air mass flows through each stream's
  specific volume; the box conserves dry air, water and enthalpy. Result:
  W3 = 0.01028, h3 = 56.79 kJ/kg, T3 = 303.46 K (30.31 C). The source bank,
  read from a chart, lists 30.67 C, 57.77 kJ/kg and 0.01053. }
P = 101325 [Pa]
Vdot_1 = 1.000 [m^3/s]
T_1 = 38 [C]
Twb_1 = 24 [C]
Vdot_2 = 0.500 [m^3/s]
T_2 = 16 [C]
Twb_2 = 10 [C]
W_1 = HumRat(AirH2O, T=T_1, P=P, B=Twb_1)
W_2 = HumRat(AirH2O, T=T_2, P=P, B=Twb_2)
v_1 = Volume(AirH2O, T=T_1, P=P, W=W_1)
v_2 = Volume(AirH2O, T=T_2, P=P, W=W_2)
MoistAirSource hot(P=P, T=T_1, W=W_1, mdot=Vdot_1 / v_1)
MoistAirSource cool(P=P, T=T_2, W=W_2, mdot=Vdot_2 / v_2)
MixingBox      box()
MoistAirSink   supply()
connect(hot.out, box.in1)
connect(cool.out, box.in2)
connect(box.out, supply.in)
W_3 = box.out.W
h_3 = box.out.h
T_3 = Temperature(AirH2O, H=h_3, P=P, W=W_3)
{ CHECK W_3 0.0102845692818076 1e-08 }
{ CHECK h_3 56788.562311828 0.01 }
{ CHECK T_3 303.464657436987 0.0001 }`,
  },
  {
    id: 'cooling-coil-dehumidification',
    title: 'Cooling and dehumidifying coil',
    description: 'Back-solve the apparatus dew point and bypass factor for 28 C/50 % to 13 C/90 %.',
    category: 'HVAC & Refrigeration',
    text: `{ 1.5 kg/s of air from 28 C / 50 % to 13 C / 90 %. The coil's apparatus dew
  point and bypass factor are unknowns, fixed by the two leaving conditions.
  The coil line crosses saturation twice; the GUESS picks the physical
  crossing near 10 C (the other is near -22 C). Condensate 0.00519 kg/s
  matches the source bank (0.0051), but its 7.66 kW latent load contradicts
  that rate (0.0051 kg/s x 2.5 MJ/kg = 12.8 kW); this model gives 13.09 kW. }
P = 101325 [Pa]
mdot = 1.5 [kg/s]
T_in = 28 [C]
RH_in = 0.50
T_out = 13 [C]
RH_out = 0.90
W_in = HumRat(AirH2O, T=T_in, P=P, R=RH_in)
MoistAirSource        room(P=P, T=T_in, W=W_in, mdot=mdot)
ApparatusDewPointCoil coil(T_adp=T_adp, BF=BF)
MoistAirSink          supply()
connect(room.out, coil.in)
connect(coil.out, supply.in)
coil.T_out = T_out
RelHum(AirH2O, T=T_out, P=P, W=coil.out.W) = RH_out
GUESS T_adp = 283.6
GUESS BF = 0.1
Q_total = coil.Q_air
Q_sensible = coil.Q_sens
Q_latent = Q_total - Q_sensible
SHR = coil.SHR
condensate = coil.mdot_w
{ CHECK T_adp 283.396143144343 0.0001 }
{ CHECK BF 0.15410050953991 1e-06 }
{ CHECK Q_total 36241.4405317929 0.1 }
{ CHECK Q_sensible 23148.5195341037 0.1 }
{ CHECK Q_latent 13092.9209976892 0.1 }
{ CHECK SHR 0.6387306683849 1e-06 }
{ CHECK condensate 0.00519166771651502 1e-08 }`,
  },
  {
    id: 'preheat-steam-humidifier-ip',
    title: 'Preheat coil and steam humidifier (IP units)',
    description: 'Winter air heated and humidified to 90 F / 40 %, in US customary units.',
    category: 'HVAC & Refrigeration',
    text: `{ 235 lbm/min of dry air at 40 F DB / 36 F WB is preheated, then a steam
  humidifier (h_g = 1156.9 Btu/lbm) brings it to 90 F / 40 %. Unknown: the
  preheat leaving temperature. The energy balance closes to rounding, giving
  163,700 Btu/hr of heat and 120.8 lbm/hr of steam. The source bank lists
  112,518 Btu/hr and 125.8 lbm/hr; with this steam enthalpy its heat and steam
  figures do not close the same balance. }
P = 14.696 [psi]
mdot = 235 [lbm/min]
T_in = 40 [F]
Twb_in = 36 [F]
T_out = 90 [F]
RH_out = 0.40
h_steam = 1156.9 [Btu/lbm]
W_in = HumRat(AirH2O, T=T_in, P=P, B=Twb_in)
W_out = HumRat(AirH2O, T=T_out, P=P, R=RH_out)
MoistAirSource  outdoor(P=P, T=T_in, W=W_in, mdot=mdot)
HeatingCoil     preheat(Q=Q_coil)
SteamHumidifier steam(W_set=W_out, h_steam=h_steam)
MoistAirSink    supply()
connect(outdoor.out, preheat.in)
connect(preheat.out, steam.in)
connect(steam.out, supply.in)
Temperature(AirH2O, H=steam.out.h, P=P, W=steam.out.W) = T_out
h_mid = Enthalpy(AirH2O, T=T_mid, P=P, W=W_in)
Q_coil = mdot * (h_mid - outdoor.out.h)
GUESS T_mid = 300
steam_lbm_hr = steam.mdot_w / (1 [lbm/hr])
Q_btu_hr = Q_coil / (1 [Btu/hr])
h_in = outdoor.out.h
h_out = steam.out.h
balance = Q_coil + steam.mdot_w * h_steam - mdot * (h_out - h_in)
{ CHECK Q_coil 47981.0628232086 0.01 }
{ CHECK Q_btu_hr 163718.182060797 0.05 }
{ CHECK steam_lbm_hr 120.799347918465 1e-05 }
{ CHECK balance -1.45519152283669e-11 1e-06 }`,
  },
  {
    id: 'crossflow-hx-effectiveness',
    title: 'Cross-flow exchanger by effectiveness-NTU',
    description: 'Effectiveness, duty and outlet temperatures of a cross-flow exchanger, both fluids unmixed.',
    category: 'Heat Transfer',
    text: `{ UA = 1000 W/K; hot stream 90 C, 3 kg/s, cp 2100; cold stream 20 C,
  2 kg/s, cp 1009. Cr = 0.3203 and NTU = 0.4955 as in the textbook.
  The correlation gives eps = 0.364 and q = 51.40 kW. The source bank's
  eps = 0.388 exceeds the counterflow effectiveness at the same NTU and Cr
  (0.371, computed below), which bounds every arrangement, so it is a chart
  misread. }
UA = 200 [W/K] * 5
T_h_in = 90 [C]
mdot_h = 3 [kg/s]
cp_h = 2100 [J/kg-K]
T_c_in = 20 [C]
mdot_c = 2 [kg/s]
cp_c = 1009 [J/kg-K]
C_h = mdot_h * cp_h
C_c = mdot_c * cp_c
C_min = min(C_h, C_c)
C_max = max(C_h, C_c)
C_r = C_min / C_max
NTU = UA / C_min
epsilon = hx_effectiveness('crossflow_both_unmixed', NTU, C_r)
q = epsilon * C_min * (T_h_in - T_c_in)
T_c_out = T_c_in + q / C_c
T_h_out = T_h_in - q / C_h
eps_counterflow = hx_effectiveness('counterflow', NTU, C_r)
eps_cmin_mixed = hx_effectiveness('crossflow_cmin_mixed', NTU, C_r)
{ CHECK C_r 0.32031746031746 1e-09 }
{ CHECK NTU 0.495540138751239 1e-09 }
{ CHECK epsilon 0.363868503817334 1e-09 }
{ CHECK q 51400.0648492367 0.0001 }
{ CHECK T_c_out 318.620795267213 1e-06 }
{ CHECK T_h_out 354.99125954774 1e-06 }
{ CHECK eps_counterflow 0.370754891621542 1e-09 }`,
  },
  {
    id: 'annular-fin-efficiency',
    title: 'Annular fin efficiency and heat loss',
    description: 'Bessel-function efficiency of annular fins on a 2.5 cm tube.',
    category: 'Heat Transfer',
    text: `{ Aluminium annular fins (k = 160 W/m-K), r1 = 12.5 mm, r2 = 22.5 mm, 1 mm
  thick, 100 per metre, h = 200 W/m2-K, base 170 C, air 30 C, insulated tip.
  The exact Bessel-function efficiency at mL = 0.5 is 0.9005 (chart 0.90),
  the overall surface efficiency 0.9247 (0.924), and the loss 7,524 W per
  metre of tube (textbook 7,503 W/m from the rounded chart value). }
D_o = 0.025 [m]
r_1 = D_o / 2
r_2 = 0.0225 [m]
t = 0.001 [m]
N = 100 [1/m]
k = 160 [W/m-K]
h = 200 [W/m^2-K]
T_b = 170 [C]
T_inf = 30 [C]
m = sqrt(2 * h / (k * t))
L = r_2 - r_1
mL = m * L
x_1 = m * r_1
x_2 = m * r_2
eta_f = 2 * r_1 / (m * (r_2^2 - r_1^2)) * (besselk1(x_1) * besseli1(x_2) - besseli1(x_1) * besselk1(x_2)) / (besseli0(x_1) * besselk1(x_2) + besselk0(x_1) * besseli1(x_2))
A_fin = N * 2 * pi# * (r_2^2 - r_1^2)
A_base = 2 * pi# * r_1 * (1 - N * t)
eta_o = (A_base + eta_f * A_fin) / (A_base + A_fin)
Q_per_m = h * (A_base + eta_f * A_fin) * (T_b - T_inf)
Q_bare = h * 2 * pi# * r_1 * (T_b - T_inf)
{ CHECK mL 0.5 1e-12 }
{ CHECK eta_f 0.900515730969610 1e-09 }
{ CHECK eta_o 0.924714607220245 1e-09 }
{ CHECK Q_per_m 7524.14843727966 1e-06 }`,
  },
  {
    id: 'shell-tube-lmtd-sizing',
    title: 'Shell-and-tube sizing by LMTD',
    description: 'Area and tube count for a 150.75 kW exchanger with two shell passes.',
    category: 'Heat Transfer',
    text: `{ 150.75 kW, U = 400 W/m2-K, hot 100 -> 60 C, cold 20 -> 50 C, 26.67 mm
  tubes 2 m long. Counterflow LMTD 44.81 K. The textbook's F = 0.975 is the
  two-shell-pass value; one shell pass gives 0.891 (shown for contrast), so
  this exchanger uses two. A = 8.63 m2, 52 tubes. }
q = 150.75 [kW]
U = 400 [W/m^2-K]
T_h_in = 100 [C]
T_h_out = 60 [C]
T_c_in = 20 [C]
T_c_out = 50 [C]
d_o = 0.02667 [m]
L = 2 [m]
N_shells = 2
dT_lm = LMTD(T_h_in - T_c_out, T_h_out - T_c_in)
P_eff = (T_c_out - T_c_in) / (T_h_in - T_c_in)
R_cap = (T_h_in - T_h_out) / (T_c_out - T_c_in)
S = sqrt(R_cap^2 + 1)
X = ((1 - P_eff * R_cap) / (1 - P_eff))^(1 / N_shells)
P_1 = (1 - X) / (R_cap - X)
F = S / (R_cap - 1) * ln((1 - P_1) / (1 - P_1 * R_cap)) / ln((2 - P_1 * (R_cap + 1 - S)) / (2 - P_1 * (R_cap + 1 + S)))
F_one_shell = S / (R_cap - 1) * ln((1 - P_eff) / (1 - P_eff * R_cap)) / ln((2 - P_eff * (R_cap + 1 - S)) / (2 - P_eff * (R_cap + 1 + S)))
A = q / (U * F * dT_lm)
N_exact = A / (pi# * d_o * L)
N_tubes = ceil(N_exact)
{ CHECK dT_lm 44.8142011772455 1e-09 }
{ CHECK F 0.974570771805907 1e-09 }
{ CHECK F_one_shell 0.890605633012191 1e-09 }
{ CHECK A 8.62915535068924 1e-08 }
{ CHECK N_tubes 52.0 1e-12 }`,
  },
  {
    id: 'beam-deflection-uncertainty',
    title: 'Beam deflection uncertainty',
    description: 'Root-sum-square and worst-case uncertainty of a cantilever deflection.',
    category: 'Data & Analysis',
    text: `{ Cantilever under a distributed load, y = w L^4 / (8 E I), with
  w = 750 +/- 30 N/m, L = 9.0 +/- 0.03 m, E = 7.5e9 +/- 5e7 Pa and
  I = 5e-4 +/- 5e-6 m4. UncertaintyOf propagates first-order, root-sum-
  square: +/- 0.00719 m (4.4 %). The textbook's +/- 0.01148 m (7.0 %) is the
  worst-case linear sum, computed below. }
w = 750 [N/m]
L = 9.0 [m]
E = 7.5e9 [Pa]
I = 5e-4 [m^4]
y = w * L^4 / (8 * E * I)
UncertaintyOf(w) = 30 [N/m]
UncertaintyOf(L) = 0.03 [m]
UncertaintyOf(E) = 5e7 [Pa]
UncertaintyOf(I) = 5e-6 [m^4]
u_y = UncertaintyOf(y)
rel_rss = u_y / y
rel_worst = 30 [N/m] / w + 4 * 0.03 [m] / L + 5e7 [Pa] / E + 5e-6 [m^4] / I
u_y_worst = rel_worst * y
{ CHECK y 0.164025 1e-12 }
{ CHECK u_y 0.00719136230459362 1e-09 }
{ CHECK rel_rss 0.0438430867525903 1e-09 }
{ CHECK rel_worst 0.07 1e-12 }
{ CHECK u_y_worst 0.01148175 1e-09 }`,
  },
  {
    id: 'quadratic-regression',
    title: 'Quadratic regression',
    description: 'Second-order polynomial fit of six points, with its standard error.',
    category: 'Data & Analysis',
    text: `{ Second-order least-squares polynomial through six points. polyfit
  returns the coefficients constant term first. Data and published answer:
  Chapra & Canale, Example 17.5: y = 2.47857 + 2.35929 x + 1.86071 x^2,
  s_y/x = 1.12, r^2 = 0.99851. }
x = [0, 1, 2, 3, 4, 5]
y = [2.1, 7.7, 13.6, 27.2, 40.9, 61.1]
[c] = polyfit(x, y, 2)
n = 6
FOR i = 1 TO 6
  e2[i] = (y[i] - (c[1] + c[2] * x[i] + c[3] * x[i]^2))^2
END
S_r = sum(e2[1:6])
y_mean = sum(y[1:6]) / n
FOR i = 1 TO 6
  d2[i] = (y[i] - y_mean)^2
END
S_t = sum(d2[1:6])
s_yx = sqrt(S_r / (n - 3))
r_sq = (S_t - S_r) / S_t
{ CHECK c[1] 2.47857142857142 1e-09 }
{ CHECK c[2] 2.35928571428572 1e-09 }
{ CHECK c[3] 1.86071428571429 1e-09 }
{ CHECK s_yx 1.11752277062132 1e-09 }
{ CHECK r_sq 0.998509357298405 1e-12 }`,
  },
  {
    id: 'power-law-log-fit',
    title: 'Power law by log linearization',
    description: 'Fit y = alpha x^beta by a straight line through log10 data.',
    category: 'Data & Analysis',
    text: `{ y = alpha * x^beta becomes log10(y) = log10(alpha) + beta * log10(x), a
  straight line. Data and published answer: Chapra & Canale, Example 17.4:
  y = 0.5 x^1.75. The fit minimizes error in log10(y), so it weights relative
  rather than absolute error; a direct nonlinear fit of the same data would
  give slightly different coefficients. }
x = [1, 2, 3, 4, 5]
y = [0.5, 1.7, 3.4, 5.7, 8.4]
FOR i = 1 TO 5
  lx[i] = log10(x[i])
  ly[i] = log10(y[i])
END
[beta_2, log_alpha, r_sq_log] = linfit(lx[1:5], ly[1:5])
alpha_2 = 10^log_alpha
y_at_2_5 = alpha_2 * 2.5^beta_2
{ CHECK beta_2 1.75172364807736 1e-09 }
{ CHECK alpha_2 0.500933649097749 1e-09 }
{ CHECK r_sq_log 0.999967195116412 1e-12 }`,
  },
  {
    id: 'damping-sensitivity-oscillators',
    title: 'Damping sensitivity of a soft and a stiff oscillator',
    description: 'Central-difference dx/db at t = 5 s for k = 1 and k = 50 N/m.',
    category: 'Data & Analysis',
    text: `{ A 1 kg mass under a 1 N step, damping b = 3 N-s/m, read at t = 5 s. Each
  system runs twice, at b - 1 % and b + 1 %, for a central difference. The
  stiff oscillator (k = 50 N/m) has settled at F/k, so its position no longer
  depends on b: dx/db ~ 0. The soft one (k = 1 N/m) is still creeping toward
  1 m, so more damping slows it: dx/db = -0.122 m/(N-s/m). The source bank's
  k, b grid and time are not stated in full; these inputs are this model's own. }
m = 1 [kg]
F = 1 [N]
b = 3 [N-s/m]
db = 0.01 * b
k_soft = 1 [N/m]
k_stiff = 50 [N/m]
DYNAMIC respond(method=ode45, time=0..5, points=501, rtol=1e-10)
  der(xs_lo) = vs_lo
  der(vs_lo) = (1 - (3 - 0.03) * vs_lo - 1 * xs_lo) / 1
  der(xs_hi) = vs_hi
  der(vs_hi) = (1 - (3 + 0.03) * vs_hi - 1 * xs_hi) / 1
  der(xk_lo) = vk_lo
  der(vk_lo) = (1 - (3 - 0.03) * vk_lo - 50 * xk_lo) / 1
  der(xk_hi) = vk_hi
  der(vk_hi) = (1 - (3 + 0.03) * vk_hi - 50 * xk_hi) / 1
  xs_lo(0) = 0
  vs_lo(0) = 0
  xs_hi(0) = 0
  vs_hi(0) = 0
  xk_lo(0) = 0
  vk_lo(0) = 0
  xk_hi(0) = 0
  vk_hi(0) = 0
END
x_soft = 0.5 * (FinalValue('xs_lo') + FinalValue('xs_hi')) * 1 [m]
x_stiff = 0.5 * (FinalValue('xk_lo') + FinalValue('xk_hi')) * 1 [m]
dxdb_soft = (FinalValue('xs_hi') - FinalValue('xs_lo')) * 1 [m] / (2 * db)
dxdb_stiff = (FinalValue('xk_hi') - FinalValue('xk_lo')) * 1 [m] / (2 * db)
x_static_soft = F / k_soft
x_static_stiff = F / k_stiff
{ CHECK x_soft 0.826607132893831 1e-06 }
{ CHECK x_stiff 0.0200110768396382 1e-06 }
{ CHECK dxdb_soft -0.121613772423779 1e-05 }
{ CHECK dxdb_stiff -2.8986855849245e-05 1e-05 }`,
  },
  {
    id: 'drive-cycle-energy-sensitivity',
    title: 'Normalized drive-cycle energy sensitivity',
    description: 'Normalized sensitivities of cycle traction energy to mass, drag area and rolling resistance.',
    category: 'Data & Analysis',
    text: `{ A 1200 kg car (CdA = 0.60 m2, cr = 0.010) accelerates to 20 m/s in 20 s,
  cruises 160 s and brakes for 20 s; braking returns nothing. Traction energy
  integrates max(0, F v). Each parameter is raised 1 % in its own copy of the
  integral; S = (dE/E) / (dp/p). Energy is linear in each parameter within
  each phase, so the hand decomposition below gives the same indices: mass
  carries inertia and rolling, drag area carries aero. The source bank's cycle
  is not stated; this one is the model's own. }
function P = traction(m, CdA, c_r, v, a)
  F := m * a + m * 9.81 * c_r + 0.5 * 1.2 * CdA * v^2
  P := max(0, F * v)
end
m = 1200 [kg]
CdA = 0.60 [m^2]
c_r = 0.010
dp = 0.01
DYNAMIC cycle(method=ode45, time=0..200, points=2001, rtol=1e-9)
  v = min(time, min(20, 200 - time))
  a = If(time, 20, 1, 0, If(time, 180, 0, 0, -1))
  der(E_0)  = traction(1200, 0.60, 0.010, v, a)
  der(E_m)  = traction(1200 * 1.01, 0.60, 0.010, v, a)
  der(E_C)  = traction(1200, 0.60 * 1.01, 0.010, v, a)
  der(E_cr) = traction(1200, 0.60, 0.010 * 1.01, v, a)
  E_0(0) = 0
  E_m(0) = 0
  E_C(0) = 0
  E_cr(0) = 0
END
E0 = FinalValue('E_0') * 1 [J]
S_m = (FinalValue('E_m') * 1 [J] - E0) / (dp * E0)
S_CdA = (FinalValue('E_C') * 1 [J] - E0) / (dp * E0)
S_cr = (FinalValue('E_cr') * 1 [J] - E0) / (dp * E0)
E_inertia = 0.5 * m * (20 [m/s])^2
D_traction = 0.5 * 20 [m/s] * 20 [s] + 20 [m/s] * 160 [s]
E_rolling = m * 9.81 [m/s^2] * c_r * D_traction
E_aero = 0.5 * 1.2 [kg/m^3] * CdA * ((20 [m/s])^4 / (4 * 1 [m/s^2]) + (20 [m/s])^3 * 160 [s])
E_hand = E_inertia + E_rolling + E_aero
S_m_hand = (E_inertia + E_rolling) / E_hand
S_CdA_hand = E_aero / E_hand
S_cr_hand = E_rolling / E_hand
{ CHECK E0 1115447.8413277 1 }
{ CHECK S_m 0.5739828452802 1e-06 }
{ CHECK S_CdA 0.42601715472081 1e-06 }
{ CHECK S_cr 0.35882263264625 1e-06 }
{ CHECK E_hand 1115448.0 1e-06 }
{ CHECK S_m_hand 0.573982830217097 1e-09 }`,
  },
  {
    id: 'feedback-error-sensitivity',
    title: 'Feedback steady-state error and sensitivity',
    description: 'Steady-state error and the sensitivity of the closed loop to plant gain.',
    category: 'Control Systems',
    text: `{ Closed loop T = a b / (a b + K) with a = 100, b = 1, K = 10. The
  steady-state error is e = K / (a b + K) = 0.0909; tripling the gain to
  a = 300 cuts it to 0.0323. The sensitivity of T to a, S = (dT/da)(a/T), is
  also K / (a b + K): high loop gain makes the output insensitive to the plant.
  The central difference confirms the analytic value. }
a = 100
b = 1
K = 10
T = a * b / (a * b + K)
e_ss = 1 - T
e_ss_formula = K / (a * b + K)
a_hi = 300
e_ss_hi = K / (a_hi * b + K)
S_a = K / (a * b + K)
da = 1e-4 * a
T_up = (a + da) * b / ((a + da) * b + K)
T_dn = (a - da) * b / ((a - da) * b + K)
S_a_numeric = (T_up - T_dn) / (2 * da) * a / T
S_K = -K / (a * b + K)
{ CHECK e_ss 0.0909090909090909 1e-12 }
{ CHECK e_ss_hi 0.032258064516129 1e-12 }
{ CHECK S_a 0.0909090909090909 1e-12 }
{ CHECK S_a_numeric 0.0909090916603739 1e-08 }
{ CHECK S_K -0.0909090909090909 1e-12 }`,
  },
  {
    id: 'rankine-ideal-cycle',
    title: 'Ideal Rankine cycle from components',
    description: 'Solve. Pump, Boiler, Turbine and Condenser close a steam loop; Cengel Example 10-1.',
    category: 'Thermodynamics',
    text: `{ Simple ideal Rankine cycle (Cengel, Thermodynamics 9th ed., Example 10-1).
  Steam enters the turbine at 3 MPa and 350 C and is condensed at 75 kPa;
  the pump and turbine are isentropic. The four library components close the
  loop; only the states the book fixes are pinned. Per kilogram of steam the
  book gets w_pump = 3.03 kJ/kg, w_turb = 713.1 kJ/kg, q_in = 2728.6 kJ/kg,
  x_4 = 0.8861 and eta = 26.0 %; at 1 kg/s the model reproduces each to the
  book's rounding. }
P_cond = 75 [kPa]
P_boil = 3 [MPa]
T_3 = 350 [C]
Pump      pump(eta=1, fluid$=Water)
Boiler    boiler()
Turbine   turb(eta=1, fluid$=Water)
Condenser cond()
connect(pump.out, boiler.in)
connect(boiler.out, turb.in)
connect(turb.out, cond.in)
connect(cond.out, pump.in)
pump.in.mdot = 1 [kg/s]
cond.out.P = P_cond
cond.out.h = Enthalpy(Water, P=P_cond, x=0)
pump.out.P = P_boil
boiler.out.h = Enthalpy(Water, P=P_boil, T=T_3)
W_pump = pump.W
W_turb = turb.W
Q_in = boiler.Q
Q_out = cond.Q
eta_th = (W_turb - W_pump) / Q_in
x_4 = Quality(Water, P=P_cond, h=turb.out.h)
{ CHECK W_pump 3033.89265439718 0.003 }
{ CHECK W_turb 713042.434933793 0.7 }
{ CHECK Q_in 2728592.04508707 3 }
{ CHECK eta_th 0.260210588665239 3e-07 }
{ CHECK x_4 0.886140864191067 9e-07 }`,
  },
  {
    id: 'rankine-open-feedwater-heater',
    title: 'Regenerative Rankine with an open feedwater heater',
    description: 'Solve. A Splitter bleeds steam into a Mixer heater; the saturated-liquid exit fixes the bled fraction. Cengel Example 10-5.',
    category: 'Thermodynamics',
    text: `{ Ideal regenerative Rankine cycle with one open feedwater heater (Cengel,
  Thermodynamics 9th ed., Example 10-5). Steam enters the turbine at 15 MPa and
  600 C, part of it is bled at 1.2 MPa into an open heater, and the rest
  condenses at 10 kPa. The Splitter is the bleed point and the Mixer is the
  open heater; requiring saturated liquid at the heater exit fixes the bled
  fraction y. Mixer sets its outlet pressure from in1 only, so the bleed line's
  pressure is pinned at 1.2 MPa as the book's schematic does. Book: bled
  fraction 0.2270, heat input 2769.1 kJ/kg, net work 1282.2 kJ/kg, thermal
  efficiency 46.3 %. }
P_cond = 10 [kPa]
P_fwh = 1.2 [MPa]
P_boil = 15 [MPa]
T_5 = 600 [C]
Pump      pump1(eta=1, fluid$=Water)
Pump      pump2(eta=1, fluid$=Water)
Boiler    boiler()
Turbine   hp(eta=1, fluid$=Water)
Splitter  bleed()
Turbine   lp(eta=1, fluid$=Water)
Condenser cond()
Mixer     fwh()
connect(cond.out, pump1.in)
connect(pump1.out, fwh.in1)
connect(fwh.out, pump2.in)
connect(pump2.out, boiler.in)
connect(boiler.out, hp.in)
connect(hp.out, bleed.in)
connect(bleed.out1, lp.in)
connect(bleed.out2, fwh.in2)
connect(lp.out, cond.in)
pump2.in.mdot = 1 [kg/s]
cond.out.P = P_cond
cond.out.h = Enthalpy(Water, P=P_cond, x=0)
pump1.out.P = P_fwh
hp.out.P = P_fwh
fwh.out.h = Enthalpy(Water, P=P_fwh, x=0)
pump2.out.P = P_boil
boiler.out.h = Enthalpy(Water, P=P_boil, T=T_5)
y = bleed.out2.mdot / pump2.in.mdot
Q_in = boiler.Q
W_net = hp.W + lp.W - pump1.W - pump2.W
eta_th = W_net / Q_in
{ CHECK y 0.227071487246907 2e-07 }
{ CHECK Q_in 2769091.74856688 3 }
{ CHECK W_net 1282416.05947055 1 }
{ CHECK eta_th 0.463117937545498 5e-07 }`,
  },
  {
    id: 'regenerative-gas-turbine',
    title: 'Gas turbine with a regenerator',
    description: 'Solve. Compressor, Regenerator, heater and Turbine on real-fluid air; Cengel Examples 9-7 and 9-8.',
    category: 'Thermodynamics',
    text: `{ Actual gas-turbine cycle with regeneration (Cengel, Thermodynamics 9th ed.,
  Examples 9-7 and 9-8). Air enters the compressor at 100 kPa and 300 K, the
  pressure ratio is 8, the turbine inlet is 1300 K, eta_C = 0.80, eta_T = 0.85,
  and the regenerator effectiveness is 0.80. The book uses air-table
  enthalpies (ideal gas, variable cp); the model uses the real-fluid Air
  surface, so works differ in the fourth digit. The book defines the
  regenerator effectiveness on enthalpy, (h5 - h2)/(h4 - h2) = 0.80, while the
  Regenerator component rates eps on inlet capacity rates; the model solves
  for the component eps that gives the book's enthalpy effectiveness (0.82).
  The heater is a Boiler: an air-standard heat addition with no fuel mass.
  Book: w_C = 305.20 kJ/kg, w_T = 515.61 kJ/kg, r_bw = 0.592, T_2a = 598 K,
  T_4a = 853 K, q_in = 570.60 kJ/kg, eta = 36.9 %. }
P_1 = 100 [kPa]
T_1 = 300 [K]
r_p = 8
T_3 = 1300 [K]
Source       inlet(fluid$=Air, mdot=1 [kg/s], P=P_1, T=T_1)
Compressor   comp(eta=0.80, fluid$=Air)
Regenerator  regen(hot$=Air, cold$=Air, eps=eps_cp)
Boiler       heater()
Turbine      turb(eta=0.85, fluid$=Air)
Sink         stack()
connect(inlet.out, comp.in)
connect(comp.out, regen.cold_in)
connect(regen.cold_out, heater.in)
connect(heater.out, turb.in)
connect(turb.out, regen.hot_in)
connect(regen.hot_out, stack.in)
comp.out.P = r_p * P_1
heater.out.h = Enthalpy(Air, P=r_p * P_1, T=T_3)
turb.out.P = P_1
(heater.in.h - comp.out.h) / (turb.out.h - comp.out.h) = 0.80
W_C = comp.W
W_T = turb.W
r_bw = W_C / W_T
Q_in = heater.Q
eta_th = (W_T - W_C) / Q_in
T_2a = Temperature(Air, P=comp.out.P, h=comp.out.h)
T_4a = Temperature(Air, P=turb.out.P, h=turb.out.h)
{ CHECK W_C 305436.634509068 0.3 }
{ CHECK W_T 515980.430019411 0.5 }
{ CHECK r_bw 0.59195391285979 6e-07 }
{ CHECK T_2a 598.487346721287 0.0006 }
{ CHECK T_4a 852.966348723098 0.0009 }
{ CHECK Q_in 571017.002653695 0.6 }
{ CHECK eta_th 0.368717209000574 4e-07 }
{ CHECK eps_cp 0.821507251199574 8e-07 }`,
  },
  {
    id: 'steam-turbine-efficiency',
    title: 'Steam turbine isentropic efficiency',
    description: 'Solve. The measured exit state and power fix the efficiency of the Turbine and the flow; Cengel Example 7-14.',
    category: 'Thermodynamics',
    text: `{ Isentropic efficiency of a steam turbine (Cengel, Thermodynamics 9th ed.,
  Example 7-14). Steam enters an adiabatic turbine at 3 MPa and 400 C and
  leaves at 50 kPa and 100 C; the power output is 2 MW. The turbine's eta and
  the source's mass flow are unknowns of the system: the measured exit state
  and the power fix them. Book: eta_T = 0.667 (66.7 %), m = 3.64 kg/s. }
P_1 = 3 [MPa]
T_1 = 400 [C]
P_2 = 50 [kPa]
T_2 = 100 [C]
W_out = 2 [MW]
Source  steam(fluid$=Water, mdot=m_dot, P=P_1, T=T_1)
Turbine turb(eta=eta_T, fluid$=Water)
Sink    exhaust()
connect(steam.out, turb.in)
connect(turb.out, exhaust.in)
turb.out.P = P_2
turb.out.h = Enthalpy(Water, P=P_2, T=T_2)
turb.W = W_out
h_2s = turb.h_s
{ CHECK eta_T 0.666738862010099 7e-07 }
{ CHECK m_dot 3.64124336961134 4e-06 }`,
  },
  {
    id: 'air-compressor-efficiency',
    title: 'Air compressor isentropic efficiency',
    description: 'Solve. Exit temperature and power of an 80 % efficient Compressor; Cengel Example 7-15.',
    category: 'Thermodynamics',
    text: `{ Effect of efficiency on compressor power (Cengel, Thermodynamics 9th ed.,
  Example 7-15). Air is compressed from 100 kPa and 12 C to 800 kPa at
  0.2 kg/s by a compressor with an isentropic efficiency of 80 %. The book uses
  air-table enthalpies; the real-fluid Air surface lands within 0.5 K and
  0.2 %. Book: T_2a = 569.5 K, W_in = 58.0 kW. }
P_1 = 100 [kPa]
T_1 = 12 [C]
P_2 = 800 [kPa]
Source     intake(fluid$=Air, mdot=0.2 [kg/s], P=P_1, T=T_1)
Compressor comp(eta=0.80, fluid$=Air)
Sink       receiver()
connect(intake.out, comp.in)
connect(comp.out, receiver.in)
comp.out.P = P_2
T_2s = Temperature(Air, P=P_2, h=comp.h_s)
T_2a = Temperature(Air, P=P_2, h=comp.out.h)
W_in = comp.W
{ CHECK T_2s 514.198906959286 0.0005 }
{ CHECK T_2a 569.993756478625 0.0006 }
{ CHECK W_in 58092.2122147274 0.06 }`,
  },
  {
    id: 'ideal-vapor-compression-cycle',
    title: 'Ideal vapor-compression refrigeration cycle',
    description: 'Solve. R-134a through Compressor, Condenser, Throttle and evaporator; Cengel Example 11-1.',
    category: 'HVAC & Refrigeration',
    text: `{ Ideal vapor-compression refrigeration cycle (Cengel, Thermodynamics 9th ed.,
  Example 11-1). R-134a enters the compressor as saturated vapor at 0.14 MPa
  and leaves the condenser as saturated liquid at 0.8 MPa; the flow is
  0.05 kg/s. An isentropic Compressor, a Condenser, a Throttle and a Boiler
  used as the evaporator close the loop. Book: Q_L = 7.18 kW, W_in = 1.81 kW,
  Q_H = 8.99 kW, COP_R = 3.97. }
P_L = 0.14 [MPa]
P_H = 0.8 [MPa]
Compressor comp(eta=1, fluid$=R134a)
Condenser  cond()
Throttle   valve()
Boiler     evap()
connect(comp.out, cond.in)
connect(cond.out, valve.in)
connect(valve.out, evap.in)
connect(evap.out, comp.in)
comp.in.mdot = 0.05 [kg/s]
comp.in.P = P_L
comp.in.h = Enthalpy(R134a, P=P_L, x=1)
comp.out.P = P_H
cond.out.h = Enthalpy(R134a, P=P_H, x=0)
Q_L = evap.Q
W_in = comp.W
Q_H = cond.Q
COP_R = Q_L / W_in
{ CHECK Q_L 7183.72814157027 0.007 }
{ CHECK W_in 1810.59993467223 0.002 }
{ CHECK Q_H 8994.3280762425 0.009 }
{ CHECK COP_R 3.96759549362887 4e-06 }`,
  },
  {
    id: 'square-duct-friction-loss',
    title: 'Friction loss in a rough air duct',
    description: 'Solve. Duct takes absolute roughness k [m]; Miller, Internal Flow Systems, Chapter 8 Example 1.',
    category: 'Fluids & Fluid Power',
    text: `{ Friction loss in a square air duct (Miller, Internal Flow Systems 2nd ed.,
  Chapter 8, Example 1). Air (rho = 1.23 kg/m3, nu = 1.45e-5 m2/s) flows at
  0.8 m3/s through a 0.2 m square duct 25 m long with an absolute roughness of
  0.025 mm. Duct takes the absolute roughness k [m] and forms k/D itself.
  Duct is a round passage, so it is given the square duct's hydraulic diameter
  (0.2 m) and a mass flow that reproduces the square duct's 20 m/s: Re, f and
  the loss depend only on D and U, so they are the square duct's. Book:
  Re = 2.8e5, f = 0.0158, loss 40.3 m of air or 49.6 mm of water. }
a = 0.2 [m]
L = 25 [m]
Q_duct = 0.8 [m^3/s]
rho_air = 1.23 [kg/m^3]
nu_air = 1.45e-5 [m^2/s]
k_s = 0.025 [mm]
g = 9.81 [m/s^2]
rho_water = 1000 [kg/m^3]
D_h = 4 * a^2 / (4 * a)
U = Q_duct / a^2
Duct duct(rho=rho_air, mu=rho_air * nu_air, L=L, D=D_h, rough=k_s)
duct.in.P = 101.325 [kPa]
duct.in.mdot = rho_air * U * pi# / 4 * D_h^2
Re = duct.Re_d
f = duct.f
dP = duct.in.P - duct.out.P
H_air = dP / (rho_air * g)
H_water = dP / (rho_water * g)
{ CHECK Re 275862.068965517 0.3 }
{ CHECK f 0.0158280323641626 2e-08 }
{ CHECK H_air 40.3364739147873 4e-05 }
{ CHECK H_water 0.0496138629151884 5e-08 }`,
  },
  {
    id: 'gravity-pipe-flow',
    title: 'Gravity flow through a pipe and fittings',
    description: 'Solve. Colebrook Pipe plus a Valve standing in for K = 6.5; Miller, Internal Flow Systems, Chapter 8 Example 2.',
    category: 'Fluids & Fluid Power',
    text: `{ Gravity flow between two tanks (Miller, Internal Flow Systems 2nd ed.,
  Chapter 8, Example 2). Water at 15 C runs through 40 m of smooth 50 mm pipe
  under a 6 m level difference; the fittings add K = 6.5. Pipe solves Colebrook
  with the property-library viscosity (1.14e-6 m2/s at 15 C, as the book
  uses). The fittings are a fixed-Cv Valve: its law mdot^2 = Cv^2 rho dP is the
  K loss dP = K rho U^2 / 2 when Cv = A sqrt(2/K). Book (two chart
  iterations): U = 2.38 m/s, f = 0.0179, Q = 4.68e-3 m3/s. }
T_w = 15 [C]
P_atm = 101.325 [kPa]
dH = 6 [m]
D = 50 [mm]
L = 40 [m]
K_t = 6.5
g = 9.81 [m/s^2]
rho_w = Density(Water, P=P_atm, T=T_w)
A = pi# / 4 * D^2
Source supply(fluid$=Water, mdot=m_dot, P=P_atm + rho_w * g * dH, T=T_w)
Pipe   line(fluid$=Water, L=L, D=D, rough=0 [m])
Valve  fittings(Cv=A * sqrt(2 / K_t), rho=rho_w)
Sink   tank()
connect(supply.out, line.in)
connect(line.out, fittings.in)
connect(fittings.out, tank.in)
tank.P = P_atm
Q = m_dot / rho_w
U = Q / A
f = line.f
Re = line.Re_d
{ CHECK U 2.3814100603598 2e-06 }
{ CHECK f 0.0178227733558207 2e-08 }
{ CHECK Q 0.00467588771925697 5e-09 }`,
  },
  {
    id: 'parallel-pipe-branches',
    title: 'Flow split between parallel pipe branches',
    description: 'Solve. Splitter, two Colebrook Pipes, a FlowSensor and a Mixer; NCEES HVAC&R Problem 127.',
    category: 'Fluids & Fluid Power',
    text: `{ Flow split between two parallel branches (NCEES, HVAC and Refrigeration
  sample questions, Problem 127). 20 gpm of 60 F water enters two 1-in.
  Schedule 40 steel branches (1.049 in. bore): A has an equivalent length of
  80 ft; B has 100 ft of pipe, four elbows at 5.2 ft and a globe valve at 29 ft
  (149.8 ft). The book assumes one friction factor for both branches, so
  q_A/q_B = sqrt(149.8/80) and q_B = 8.4 gpm (q_B_equal_f below). Each Pipe
  here solves Colebrook at its own Reynolds number (commercial steel,
  k = 0.046 mm); B is slower, so its f is higher and it carries 8.32 gpm,
  1 % under the book. A FlowSensor on branch B reads the flow. The Mixer sets
  its outlet pressure from in1 only, so the two branch outlets are joined
  explicitly. }
q_total = 20 [gpm]
T_w = 60 [F]
P_in = 300 [kPa]
D_i = 1.049 [in]
k_steel = 0.046 [mm]
rho_w = Density(Water, P=P_in, T=T_w)
Source     supply(fluid$=Water, mdot=rho_w * q_total, P=P_in, T=T_w)
Splitter   tee()
Pipe       branchA(fluid$=Water, L=80 [ft], D=D_i, rough=k_steel)
FlowSensor meterB()
Pipe       branchB(fluid$=Water, L=149.8 [ft], D=D_i, rough=k_steel)
Mixer      join()
Sink       drain()
connect(supply.out, tee.in)
connect(tee.out1, branchA.in)
connect(tee.out2, meterB.in)
connect(meterB.out, branchB.in)
connect(branchA.out, join.in1)
connect(branchB.out, join.in2)
connect(join.out, drain.in)
join.in2.P = join.in1.P
q_B = meterB.mdot_meas / rho_w
q_A = branchA.in.mdot / rho_w
f_A = branchA.f
f_B = branchB.f
q_B_equal_f = q_total / (1 + sqrt(149.8 / 80))
{ CHECK q_B 0.000525087329555773 1e-09 }
{ CHECK q_A 0.000736716598444227 1e-09 }
{ CHECK f_A 0.0273706365406121 3e-08 }
{ CHECK f_B 0.0287740439831863 3e-08 }
{ CHECK q_B_equal_f 0.000532767919714017 1e-09 }`,
  },
  {
    id: 'pipeline-pump-head',
    title: 'Pump head for a long cooling-water line',
    description: 'Solve. Pump into a smooth Pipe against a 160 ft lift; NCEES HVAC&R Problem 515.',
    category: 'Fluids & Fluid Power',
    text: `{ Operating head of a cooling-pond pump (NCEES, HVAC and Refrigeration
  sample questions, Problem 515). 26,000 gpm of 90 F water flows through a
  smooth 36 in. OD pipe with a 3/8 in. wall; the equivalent length from the
  pump outlet to the pipe exit is 2,425 ft, the pond is 160 ft above the pump,
  and the pump inlet is at 20 psig. The pipe exit discharges to atmosphere, so
  the 160 ft lift appears as the back pressure the line must reach. The book
  takes f = 0.01; Pipe solves Colebrook for a smooth bore and gets 0.0097, so
  the friction head is 9.1 ft against the book's 9.3. Book: V = 8.54 ft/s,
  pump head 123.1 ft (answer 124 ft). }
q = 26000 [gpm]
T_w = 90 [F]
P_atm = 14.696 [psi]
P_suction = 20 [psi]
dz = 160 [ft]
D_i = 36 [in] - 2 * 0.375 [in]
g = 9.80665 [m/s^2]
rho_w = Density(Water, P=P_atm + P_suction, T=T_w)
Source supply(fluid$=Water, mdot=rho_w * q, P=P_atm + P_suction, T=T_w)
Pump   pump(eta=1, fluid$=Water)
Pipe   line(fluid$=Water, L=2425 [ft], D=D_i, rough=0 [m])
Sink   pond()
connect(supply.out, pump.in)
connect(pump.out, line.in)
connect(line.out, pond.in)
pond.P = P_atm + rho_w * g * dz
V = line.V
f = line.f
h_f = (line.in.P - line.out.P) / (rho_w * g)
H_pump = (pump.out.P - pump.in.P) / (rho_w * g)
{ CHECK V 2.60489509195721 3e-06 }
{ CHECK f 0.00969503410666183 1e-08 }
{ CHECK h_f 2.76937932231388 3e-06 }
{ CHECK H_pump 37.4055856263781 4e-05 }`,
  },
  {
    id: 'shower-heat-exchanger',
    title: 'Counterflow water heater by effectiveness-NTU',
    description: 'Solve. HeatExchanger sized for a 45 C outlet, checked against a TwoZoneHX; Cengel and Ghajar Problem 11-104.',
    category: 'Heat Transfer',
    text: `{ Counterflow heater for shower water by effectiveness-NTU (Cengel and
  Ghajar, Heat and Mass Transfer, Problem 11-104). Cold water at 0.25 kg/s is
  heated from 15 C to 45 C by hot water entering at 100 C at 3 kg/s; U is
  950 W/m2-K. HeatExchanger rates Q = eps Cmin (Th - Tc) with eps from the
  counterflow NTU relation; the required outlet temperature fixes UA and so
  the area. The book's cp values are 4180 and 4190 J/kg-K; the property
  library's are 0.2 % higher at these states, which moves the area by 0.9 %.
  A TwoZoneHX (two counterflow cells of UA/2 in series) with the same UA
  delivers the same outlet temperature to 0.01 K; the halves compose exactly
  only for constant cp, and each cell takes cp at its own inlet. The LMTD
  method on the solved temperatures gives the same area to 0.05 %. Book:
  Q = 31.35 kW, A = 0.482 m2. }
U = 950 [W/m^2-K]
T_c_in = 15 [C]
T_c_out = 45 [C]
T_h_in = 100 [C]
P_w = 200 [kPa]
Source        cold(fluid$=Water, mdot=0.25 [kg/s], P=P_w, T=T_c_in)
Source        hot(fluid$=Water, mdot=3 [kg/s], P=P_w, T=T_h_in)
HeatExchanger hx(UA=UA, hot$=Water, cold$=Water, arr$=counterflow)
Sink          shower()
Sink          drain()
connect(hot.out, hx.hot_in)
connect(hx.hot_out, drain.in)
connect(cold.out, hx.cold_in)
connect(hx.cold_out, shower.in)
Temperature(Water, P=P_w, h=shower.h) = T_c_out
eps = hx.eps
NTU = UA / hx.Cmin
A_s = UA / U
Q = 0.25 [kg/s] * (shower.h - cold.out.h)
T_h_out = Temperature(Water, P=P_w, h=drain.h)
dT_lm = ((T_h_in - T_c_out) - (T_h_out - T_c_in)) / ln((T_h_in - T_c_out) / (T_h_out - T_c_in))
A_lmtd = Q / (U * dT_lm)
Source        cold2(fluid$=Water, mdot=0.25 [kg/s], P=P_w, T=T_c_in)
Source        hot2(fluid$=Water, mdot=3 [kg/s], P=P_w, T=T_h_in)
TwoZoneHX     hx2(UA=UA, hot$=Water, cold$=Water, arr$=counterflow)
Sink          shower2()
Sink          drain2()
connect(hot2.out, hx2.hot_in)
connect(hx2.hot_out, drain2.in)
connect(cold2.out, hx2.cold_in)
connect(hx2.cold_out, shower2.in)
T_two_zone = Temperature(Water, P=P_w, h=shower2.h)
{ CHECK Q 31357.4790120779 0.03 }
{ CHECK eps 0.352340635359073 4e-07 }
{ CHECK NTU 0.441323634632449 4e-07 }
{ CHECK A_s 0.486399435659162 5e-07 }
{ CHECK A_lmtd 0.486612506968564 5e-07 }
{ CHECK T_two_zone 318.142645523967 0.0003 }`,
  },
  {
    id: 'converging-diverging-nozzle',
    title: 'Converging-diverging nozzle at Mach 2',
    description: 'Solve. Throat state, choked flow and the exit state of the Nozzle component; Cengel Example 17-7.',
    category: 'Aerospace & Compressible Flow',
    text: `{ Isentropic flow through a converging-diverging nozzle (Cengel,
  Thermodynamics 9th ed., Example 17-7). Air enters at 1.0 MPa and 800 K with
  negligible velocity; the throat area is 20 cm2 and the exit Mach number is
  2 (k = 1.4). The exit area follows from A/A* at Mach 2 and the choked mass
  flow from the throat state; the Nozzle component then recovers the exit
  Mach number from the area ratio and the exit state from the isentropic
  relations. Book: T* = 666.7 K, P* = 0.5283 MPa, V* = 517.5 m/s,
  T_e = 444.5 K, P_e = 0.1278 MPa, V_e = 845.2 m/s, A_e = 33.75 cm2,
  m = 2.86 kg/s. }
k = 1.4
R = 0.287 [kJ/kg-K]
P0 = 1.0 [MPa]
T0 = 800 [K]
A_t = 20 [cm^2]
Ma_e = 2
A_e = A_t * a_astar(Ma_e, k)
T_star = T0 / T0_T(1, k)
P_star = P0 / P0_P(1, k)
V_star = sqrt(k * R * T_star)
m_dot = P_star / (R * T_star) * V_star * A_t
Source supply(fluid$=Air, mdot=m_dot, P=P0, T=T0)
Nozzle cd(k=k, R=R, A_throat=A_t, A_exit=A_e, P_amb=100 [kPa], T0=T0)
Sink   jet()
connect(supply.out, cd.in)
connect(cd.out, jet.in)
Ma_exit = cd.M_exit
P_e = jet.P
T_e = cd.T_exit
V_e = cd.V_exit
{ CHECK A_e 0.003375 3e-09 }
{ CHECK T_star 666.666666666667 0.0007 }
{ CHECK P_star 528281.787717174 0.5 }
{ CHECK V_star 517.558370299106 0.0005 }
{ CHECK m_dot 2.85801387919442 3e-06 }
{ CHECK Ma_exit 1.99999999999977 2e-06 }
{ CHECK P_e 127804.525462996 0.1 }
{ CHECK T_e 444.444444444489 0.0004 }
{ CHECK V_e 845.169279559439 0.0008 }`,
  },
  {
    id: 'draining-tank-time-constant',
    title: 'Time constant of a draining tank',
    description: 'Solve (DYNAMIC). An Accumulator tank drains through a laminar Duct; the level reaches 1/e after one time constant.',
    category: 'Fluids & Fluid Power',
    text: `{ Time constant of a draining fuel-oil tank (Chapter 5, Fluid Systems,
  Example 4: a liquid-level system). A 2 ft diameter tank of fuel oil at 70 F
  (rho = 1.82 slug/ft3, mu = 0.02 lbf-s/ft2) drains through a 1 in. pipe 2 ft
  long in laminar flow; the inflow is zero here. The tank is an Accumulator
  with capacitance C = A/g (mass stored per unit of bottom pressure); the pipe
  is a Duct, whose friction factor is the laminar 64/Re, so its drop is the
  Hagen-Poiseuille R Q with R = 128 mu L/(pi D^4). The head after one time
  constant must be 1/e of the start. Duct carries no enthalpy, so its outlet
  is a pinned pressure rather than a Sink. Book: tau = 1812 s (about 30 min). }
rho = 1.82 [slug/ft^3]
mu = 0.02 [lbf-s/ft^2]
D_tank = 2 [ft]
D = 1 [in]
L = 2 [ft]
g = 32.2 [ft/s^2]
P_atm = 101.325 [kPa]
h_0 = 1 [ft]
A_tank = pi# / 4 * D_tank^2
R = 128 * mu * L / (pi# * D^4)
tau = R * A_tank / (rho * g)
Accumulator tank(C=A_tank / g, P0=P_atm + rho * g * h_0)
Duct        outlet(rho=rho, mu=mu, L=L, D=D, rough=0 [m])
connect(tank.out, outlet.in)
tank.in.mdot = 0 [kg/s]
tank.in.h = 0 [J/kg]
outlet.out.P = P_atm
DYNAMIC drain_down(method=ode45, time=0..1812, points=50, rtol=1e-9)
END
h_end = (FinalValue('tank.in.p') * 1 [Pa] - P_atm) / (rho * g)
level_ratio = h_end / h_0
Q_0 = rho * g * h_0 / R
Re_0 = rho * Q_0 / (pi# / 4 * D^2) * D / mu
{ CHECK tau 1811.62241450544 0.002 }
{ CHECK level_ratio 0.367802774276053 4e-07 }
{ CHECK Re_0 2.41109845289068 2e-06 }`,
  },
  {
    id: 'actual-vapor-compression-cycle',
    title: 'Actual vapor-compression refrigeration cycle',
    description: 'Solve. Two-phase compressor, condenser, valve and evaporator with superheat, subcooling and line pressure drops; the measured discharge fixes the compressor efficiency. Cengel Example 11-2.',
    category: 'Thermodynamics',
    text: `{ Actual vapor-compression refrigeration cycle (Cengel, Thermodynamics 9th
  ed., Example 11-2). R-134a enters the compressor at 0.14 MPa and -10 C at
  0.05 kg/s and leaves at 0.8 MPa and 50 C; it is cooled in the condenser to
  26 C and 0.72 MPa and throttled to 0.15 MPa. The superheat, subcooling and
  heat-exchanger pressure drops come from the stated states, and the measured
  compressor exit fixes the unknown isentropic efficiency eta_c; the valve Cv
  follows from the pinned pressures. Book: Q_L = 7.93 kW, W_in = 2.02 kW,
  eta_c = 0.938, COP_R = 3.93. The book takes the condenser exit as h_f at
  26 C; the model evaluates the compressed liquid at 0.72 MPa. }
P_1 = 0.14 [MPa]
T_1 = -10 [C]
P_2 = 0.8 [MPa]
T_2 = 50 [C]
P_3 = 0.72 [MPa]
T_3 = 26 [C]
P_4 = 0.15 [MPa]
SH_1 = T_1 - T_sat(R134a, P=P_1)
SC_3 = T_sat(R134a, P=P_3) - T_3
TwoPhaseCompressor comp(fluid$=R134a, eta=eta_c)
TwoPhaseCondenser cond(fluid$=R134a, SC_set=SC_3, dP=P_2 - P_3)
TwoPhaseExpansionValve valve(fluid$=R134a, Cv=Cv)
TwoPhaseEvaporator evap(fluid$=R134a, SH_set=SH_1, dP=P_4 - P_1)
connect(comp.out, cond.in)
connect(cond.out, valve.in)
connect(valve.out, evap.in)
connect(evap.out, comp.in)
comp.in.mdot = 0.05 [kg/s]
comp.out.P = P_2
comp.out.h = Enthalpy(R134a, P=P_2, T=T_2)
valve.out.P = P_4
Q_L = evap.Q
W_in = comp.W
COP_R = Q_L / W_in
{ CHECK Q_L 7926.42315285554 0.008 }
{ CHECK W_in 2016.89059230794 0.002 }
{ CHECK eta_c 0.937366633284896 9e-07 }
{ CHECK COP_R 3.93002138196564 4e-06 }`,
  },
  {
    id: 'refrigeration-exergy-destruction',
    title: 'Exergy destruction in a refrigeration cycle',
    description: 'Solve. Entropy at each port of a two-phase refrigeration loop gives the exergy destroyed in every component and the second-law efficiency. Cengel Example 11-3.',
    category: 'Thermodynamics',
    text: `{ Exergy analysis of a vapor-compression refrigeration cycle (Cengel,
  Thermodynamics 9th ed., Example 11-3). R-134a enters the compressor at
  100 kPa superheated by 6.4 C at 0.05 kg/s; the compressor is 85 percent
  isentropic and the condenser exit is saturated liquid at 39.4 C (1 MPa).
  The space is at -13 C and the ambient at 27 C; the book rounds these to
  260 K and 300 K, and the model uses the same values. Book: Q_L = 6.609 kW,
  W_in = 2.919 kW, COP_R = 2.264; destruction 0.3945 (compressor), 0.4314
  (condenser), 0.6726 (valve), 0.4037 kW (evaporator); W_min = 1.016 kW,
  eta_II = 0.348, total 1.903 kW. Absolute entropies follow CoolProp's
  reference state, but every result uses differences only. }
T_L = 260 [K]
T_0 = 300 [K]
P_L = 100 [kPa]
P_H = 1 [MPa]
TwoPhaseCompressor comp(fluid$=R134a, eta=0.85)
TwoPhaseCondenser cond(fluid$=R134a, SC_set=0 [K], dP=0 [Pa])
TwoPhaseExpansionValve valve(fluid$=R134a, Cv=Cv)
TwoPhaseEvaporator evap(fluid$=R134a, SH_set=6.4 [K], dP=0 [Pa])
connect(comp.out, cond.in)
connect(cond.out, valve.in)
connect(valve.out, evap.in)
connect(evap.out, comp.in)
comp.in.mdot = 0.05 [kg/s]
comp.out.P = P_H
valve.out.P = P_L
m = comp.in.mdot
s_1 = Entropy(R134a, P=comp.in.P, h=comp.in.h)
s_2 = Entropy(R134a, P=comp.out.P, h=comp.out.h)
s_3 = Entropy(R134a, P=cond.out.P, h=cond.out.h)
s_4 = Entropy(R134a, P=evap.in.P, h=evap.in.h)
Q_L = evap.Q
Q_H = cond.Q
W_in = comp.W
COP_R = Q_L / W_in
X_comp = m * T_0 * (s_2 - s_1)
X_cond = T_0 * (m * (s_3 - s_2) + Q_H / T_0)
X_valve = m * T_0 * (s_4 - s_3)
X_evap = T_0 * (m * (s_1 - s_4) - Q_L / T_L)
W_min = Q_L * (T_0 - T_L) / T_L
eta_II = W_min / W_in
X_total = W_in - W_min
{ CHECK Q_L 6609.18671900606 0.007 }
{ CHECK W_in 2918.51407947422 0.003 }
{ CHECK Q_H 9527.70079848028 0.01 }
{ CHECK COP_R 2.26457249786396 2e-06 }
{ CHECK X_comp 394.071431552685 0.0004 }
{ CHECK X_cond 430.43271842116 0.0004 }
{ CHECK X_valve 672.912578025936 0.0007 }
{ CHECK X_evap 404.299394704275 0.0004 }
{ CHECK W_min 1016.79795677016 0.001 }
{ CHECK eta_II 0.348395768902148 3e-07 }
{ CHECK X_total 1901.71612270405 0.002 }`,
  },
  {
    id: 'cascade-refrigeration',
    title: 'Two-stage cascade refrigeration',
    description: 'Solve. Two R-134a loops share an adiabatic cascade exchanger; equating its duties fixes the lower-loop flow. Cengel Example 11-4.',
    category: 'Thermodynamics',
    text: `{ Two-stage cascade refrigeration cycle (Cengel, Thermodynamics 9th ed.,
  Example 11-4). Both stages run ideal R-134a cycles: the upper loop A between
  0.8 and 0.32 MPa at 0.05 kg/s, the lower loop B between 0.32 and 0.14 MPa.
  The adiabatic cascade heat exchanger is the lower condenser and the upper
  evaporator; equating their duties fixes the lower-loop flow m_B. Book:
  m_B = 0.039 kg/s, Q_L = 7.18 kW, W_in = 1.61 kW, COP_R = 4.46. }
P_H = 0.8 [MPa]
P_i = 0.32 [MPa]
P_L = 0.14 [MPa]
TwoPhaseCompressor compA(fluid$=R134a, eta=1)
TwoPhaseCondenser condA(fluid$=R134a, SC_set=0 [K], dP=0 [Pa])
TwoPhaseExpansionValve valveA(fluid$=R134a, Cv=Cv_A)
TwoPhaseEvaporator evapA(fluid$=R134a, SH_set=0 [K], dP=0 [Pa])
connect(compA.out, condA.in)
connect(condA.out, valveA.in)
connect(valveA.out, evapA.in)
connect(evapA.out, compA.in)
TwoPhaseCompressor compB(fluid$=R134a, eta=1)
TwoPhaseCondenser condB(fluid$=R134a, SC_set=0 [K], dP=0 [Pa])
TwoPhaseExpansionValve valveB(fluid$=R134a, Cv=Cv_B)
TwoPhaseEvaporator evapB(fluid$=R134a, SH_set=0 [K], dP=0 [Pa])
connect(compB.out, condB.in)
connect(condB.out, valveB.in)
connect(valveB.out, evapB.in)
connect(evapB.out, compB.in)
compA.in.mdot = 0.05 [kg/s]
compA.out.P = P_H
valveA.out.P = P_i
compB.out.P = P_i
valveB.out.P = P_L
condB.Q = evapA.Q
m_B = compB.in.mdot
Q_L = evapB.Q
W_in = compA.W + compB.W
COP_R = Q_L / W_in
{ CHECK m_B 0.0389572723226361 4e-08 }
{ CHECK Q_L 7167.51626172292 0.007 }
{ CHECK W_in 1602.43913422338 0.002 }
{ CHECK COP_R 4.47287894350923 4e-06 }`,
  },
  {
    id: 'flash-chamber-refrigeration',
    title: 'Two-stage refrigeration with a flash chamber',
    description: 'Solve. A FlashTank and a TwoPhaseMixer split and rejoin the flow between two compressors. Cengel Example 11-5.',
    category: 'Thermodynamics',
    text: `{ Two-stage compression refrigeration with a flash chamber (Cengel,
  Thermodynamics 9th ed., Example 11-5). R-134a cycle between 0.8 and
  0.14 MPa; the condenser liquid is throttled into a FlashTank at 0.32 MPa,
  the flash vapor joins the low-stage discharge in a TwoPhaseMixer, and the
  tank liquid is throttled to the evaporator. Both compressors are
  isentropic. Results are per kilogram through the condenser (1 kg/s). Book:
  x_6 = 0.2050, q_L = 146.3 kJ/kg, w_in = 32.68 kJ/kg, COP_R = 4.48. }
P_H = 0.8 [MPa]
P_i = 0.32 [MPa]
P_L = 0.14 [MPa]
TwoPhaseCompressor lp(fluid$=R134a, eta=1)
TwoPhaseCompressor hp(fluid$=R134a, eta=1)
TwoPhaseCondenser cond(fluid$=R134a, SC_set=0 [K], dP=0 [Pa])
TwoPhaseExpansionValve v1(fluid$=R134a, Cv=Cv_1)
TwoPhaseSensor s6(fluid$=R134a)
FlashTank tank(fluid$=R134a)
TwoPhaseExpansionValve v2(fluid$=R134a, Cv=Cv_2)
TwoPhaseEvaporator evap(fluid$=R134a, SH_set=0 [K], dP=0 [Pa])
TwoPhaseMixer mix()
connect(hp.out, cond.in)
connect(cond.out, v1.in)
connect(v1.out, s6.in)
connect(s6.out, tank.in)
connect(tank.liq, v2.in)
connect(v2.out, evap.in)
connect(evap.out, lp.in)
connect(lp.out, mix.in1)
connect(tank.vap, mix.in2)
connect(mix.out, hp.in)
cond.in.mdot = 1 [kg/s]
hp.out.P = P_H
lp.out.P = P_i
v1.out.P = P_i
v2.out.P = P_L
x_6 = s6.x
q_L = evap.Q / cond.in.mdot
w_in = (lp.W + hp.W) / cond.in.mdot
COP_R = q_L / w_in
{ CHECK x_6 0.204922496309883 2e-07 }
{ CHECK q_L 146281.56945469 0.1 }
{ CHECK w_in 32686.2042702323 0.03 }
{ CHECK COP_R 4.47533057816414 4e-06 }`,
  },
  {
    id: 'two-evaporator-refrigeration',
    title: 'Two evaporators on one compressor',
    description: 'Solve. A junction splits the condenser liquid to two evaporators at different pressures; a reducing valve and a mixer rejoin them. Cengel Problem 11-62.',
    category: 'Thermodynamics',
    text: `{ Two-evaporator refrigeration system with one compressor (Cengel,
  Thermodynamics 9th ed., Problem 11-62). R-134a, condenser at 800 kPa,
  evaporator 1 at 0 C and evaporator 2 at -26.4 C; 0.1 kg/s through the
  isentropic compressor and an 8 kW load on the cold evaporator. The
  condenser liquid splits at a connect() junction; a pressure-reducing valve
  drops evaporator 1 to the suction pressure before the TwoPhaseMixer.
  TwoPhaseMixer sets its outlet at in1's pressure and leaves in2's free, so
  the reducing-valve outlet is pinned. Answers: 6.58 kW, 4.51 kW, 3.24. }
P_H = 800 [kPa]
T_E1 = 0 [C]
T_E2 = -26.4 [C]
P_E1 = P_sat(R134a, T=T_E1)
P_E2 = P_sat(R134a, T=T_E2)
TwoPhaseCompressor comp(fluid$=R134a, eta=1)
TwoPhaseCondenser cond(fluid$=R134a, SC_set=0 [K], dP=0 [Pa])
TwoPhaseExpansionValve v1(fluid$=R134a, Cv=Cv_1)
TwoPhaseEvaporator evap1(fluid$=R134a, SH_set=0 [K], dP=0 [Pa])
TwoPhaseExpansionValve prv(fluid$=R134a, Cv=Cv_prv)
TwoPhaseExpansionValve v2(fluid$=R134a, Cv=Cv_2)
TwoPhaseEvaporator evap2(fluid$=R134a, SH_set=0 [K], dP=0 [Pa])
TwoPhaseMixer mix()
connect(comp.out, cond.in)
connect(cond.out, v1.in, v2.in)
connect(v1.out, evap1.in)
connect(evap1.out, prv.in)
connect(v2.out, evap2.in)
connect(evap2.out, mix.in1)
connect(prv.out, mix.in2)
connect(mix.out, comp.in)
comp.in.mdot = 0.1 [kg/s]
comp.out.P = P_H
v1.out.P = P_E1
v2.out.P = P_E2
evap2.Q = 8 [kW]
prv.out.P = P_E2
Q_L1 = evap1.Q
W_in = comp.W
COP_R = (Q_L1 + evap2.Q) / W_in
{ CHECK Q_L1 6572.83388573691 0.007 }
{ CHECK W_in 4507.47096769874 0.005 }
{ CHECK COP_R 3.23303998853641 3e-06 }`,
  },
  {
    id: 'refrigerant-throttling-quality',
    title: 'Refrigerant throttling: exit quality',
    description: 'Solve. Saturated R-134a liquid throttled to evaporator pressure; a TwoPhaseSensor reads the exit quality and temperature. Cengel Example 5-8.',
    category: 'Thermodynamics',
    text: `{ Expansion of refrigerant-134a in a capillary tube (Cengel, Thermodynamics
  9th ed., Example 5-8). Saturated liquid at 0.8 MPa is throttled to
  0.12 MPa. A TwoPhaseExpansionValve stands in for the capillary: the library
  CapillaryTube rides on the inlet's distance from saturation and passes no
  flow for a saturated-liquid inlet. Book: x_2 = 0.340, dT = -53.63 C. }
P_1 = 0.8 [MPa]
P_2 = 0.12 [MPa]
TwoPhaseSource inlet(fluid$=R134a, mdot=1 [kg/s], P=P_1, x=0)
TwoPhaseExpansionValve tube(fluid$=R134a, Cv=Cv)
TwoPhaseSensor exit(fluid$=R134a)
TwoPhasePressureSink evap(P=P_2)
connect(inlet.out, tube.in)
connect(tube.out, exit.in)
connect(exit.out, evap.in)
x_2 = exit.x
T_1 = T_sat(R134a, P=P_1)
DELTAT = exit.T - T_1
{ CHECK x_2 0.340343737221829 3e-07 }
{ CHECK DELTAT -53.6369730476349 5e-05 }`,
  },
  {
    id: 'steam-throttling-calorimeter',
    title: 'Throttling calorimeter',
    description: 'Solve. The measured temperature after a throttle fixes the unknown quality of the steam line. Cengel Problem 5-63.',
    category: 'Thermodynamics',
    text: `{ Throttling calorimeter (Cengel, Thermodynamics 9th ed., Problem 5-63).
  Wet steam in a 1500 kPa line is throttled to 50 kPa and 100 C. The source
  quality x_1 is the unknown: the sensor's measured temperature fixes it.
  Answer: 0.944. }
P_1 = 1500 [kPa]
P_2 = 50 [kPa]
T_2 = 100 [C]
TwoPhaseSource line(fluid$=Water, mdot=0.01 [kg/s], P=P_1, x=x_1)
TwoPhaseExpansionValve valve(fluid$=Water, Cv=Cv)
TwoPhaseSensor cal(fluid$=Water)
TwoPhasePressureSink vent(P=P_2)
connect(line.out, valve.in)
connect(valve.out, cal.in)
connect(cal.out, vent.in)
cal.T = T_2
GUESS x_1 = 0.9
{ CHECK x_1 0.944239280738636 9e-07 }`,
  },
  {
    id: 'ammonia-flash-intercooler',
    title: 'Ammonia two-stage compression with flash-gas removal',
    description: 'Solve. A combined intercooler and flash tank between two compressors serving one evaporator. Stoecker Example 16-3.',
    category: 'HVAC & Refrigeration',
    text: `{ Two compressors and one evaporator with flash-gas removal (Stoecker,
  Refrigeration and Air Conditioning, Example 16-3). An ammonia system serves
  a 250 kW evaporator at -25 C and condenses at 35 C; the intercooler/flash
  tank sits at the optimum pressure sqrt(p_s p_d). The low-stage discharge
  and the throttled condenser liquid meet in a TwoPhaseMixer feeding a
  FlashTank: vapor to the high stage, liquid to the evaporator. Book:
  w_1 = 0.204 kg/s, w_3 = 0.255 kg/s, 29.2 + 40.0 = 69.2 kW. The book reads
  the isentropic discharge enthalpies from a pressure-enthalpy chart. }
T_e = -25 [C]
T_c = 35 [C]
p_s = P_sat(Ammonia, T=T_e)
p_d = P_sat(Ammonia, T=T_c)
p_i = sqrt(p_s * p_d)
TwoPhaseEvaporator evap(fluid$=Ammonia, SH_set=0 [K], dP=0 [Pa])
TwoPhaseCompressor low(fluid$=Ammonia, eta=1)
TwoPhaseMixer vessel_in()
FlashTank vessel(fluid$=Ammonia)
TwoPhaseCompressor high(fluid$=Ammonia, eta=1)
TwoPhaseCondenser cond(fluid$=Ammonia, SC_set=0 [K], dP=0 [Pa])
TwoPhaseExpansionValve v56(fluid$=Ammonia, Cv=Cv_56)
TwoPhaseExpansionValve v78(fluid$=Ammonia, Cv=Cv_78)
connect(evap.out, low.in)
connect(low.out, vessel_in.in1)
connect(v56.out, vessel_in.in2)
connect(vessel_in.out, vessel.in)
connect(vessel.vap, high.in)
connect(high.out, cond.in)
connect(cond.out, v56.in)
connect(vessel.liq, v78.in)
connect(v78.out, evap.in)
evap.Q = 250 [kW]
low.out.P = p_i
v56.out.P = p_i
high.out.P = p_d
v78.out.P = p_s
w_1 = evap.in.mdot
w_3 = high.in.mdot
W_low = low.W
W_high = high.W
W_total = W_low + W_high
{ CHECK p_i 452123.674272708 0.5 }
{ CHECK w_1 0.204240136509844 2e-07 }
{ CHECK w_3 0.254899217057876 3e-07 }
{ CHECK W_low 29721.3726286602 0.03 }
{ CHECK W_high 39299.9736813667 0.04 }
{ CHECK W_total 69021.3463100269 0.07 }`,
  },
  {
    id: 'ammonia-two-evaporator-intercooler',
    title: 'Ammonia two-evaporator system with intercooling',
    description: 'Solve. A high-temperature evaporator at the intercooler pressure and a low-temperature one on the low stage. Stoecker Example 16-4.',
    category: 'HVAC & Refrigeration',
    text: `{ Two compressors and two evaporators with intercooling and flash-gas
  removal (Stoecker, Refrigeration and Air Conditioning, Example 16-4).
  Ammonia: 180 kW at -30 C, 200 kW at 5 C, condensing at 40 C. The 5 C
  evaporator runs at the intercooler pressure, fed from the flash-tank
  liquid; its vapor joins the tank vapor at the high-stage suction. Book:
  w_1 = 0.150 kg/s, w_3 = 0.382 kg/s, 31.1 + 60.4 = 91.5 kW. The book reads
  h_2 = 1630 kJ/kg from a chart; the isentropic value is 6 kJ/kg lower,
  which accounts for the 1 kW gap in the low-stage power. }
T_low = -30 [C]
T_high = 5 [C]
T_c = 40 [C]
p_low = P_sat(Ammonia, T=T_low)
p_i = P_sat(Ammonia, T=T_high)
p_d = P_sat(Ammonia, T=T_c)
TwoPhaseEvaporator evap_low(fluid$=Ammonia, SH_set=0 [K], dP=0 [Pa])
TwoPhaseCompressor low(fluid$=Ammonia, eta=1)
TwoPhaseMixer vessel_in()
FlashTank vessel(fluid$=Ammonia)
TwoPhaseSensor liquid(fluid$=Ammonia)
TwoPhaseEvaporator evap_high(fluid$=Ammonia, SH_set=0 [K], dP=0 [Pa])
TwoPhaseMixer suction()
TwoPhaseCompressor high(fluid$=Ammonia, eta=1)
TwoPhaseCondenser cond(fluid$=Ammonia, SC_set=0 [K], dP=0 [Pa])
TwoPhaseExpansionValve v56(fluid$=Ammonia, Cv=Cv_56)
TwoPhaseExpansionValve v78(fluid$=Ammonia, Cv=Cv_78)
connect(evap_low.out, low.in)
connect(low.out, vessel_in.in1)
connect(v56.out, vessel_in.in2)
connect(vessel_in.out, vessel.in)
connect(vessel.liq, liquid.in)
connect(liquid.out, v78.in, evap_high.in)
connect(v78.out, evap_low.in)
connect(vessel.vap, suction.in1)
connect(evap_high.out, suction.in2)
connect(suction.out, high.in)
connect(high.out, cond.in)
connect(cond.out, v56.in)
evap_low.Q = 180 [kW]
evap_high.Q = 200 [kW]
low.out.P = p_i
v56.out.P = p_i
high.out.P = p_d
v78.out.P = p_low
w_1 = evap_low.in.mdot
w_3 = high.in.mdot
W_low = low.W
W_high = high.W
W_total = W_low + W_high
{ CHECK w_1 0.149981725659663 1e-07 }
{ CHECK w_3 0.380935428293322 4e-07 }
{ CHECK W_low 30080.9289712386 0.03 }
{ CHECK W_high 59652.3009132691 0.06 }
{ CHECK W_total 89733.2298845077 0.09 }`,
  },
  {
    id: 'liquid-suction-heat-exchanger',
    title: 'Liquid-suction heat exchanger',
    description: 'Solve. A TwoPhaseInternalHX subcools the liquid against the suction vapor; the vapor exit temperature fixes its effectiveness. Dossat Section 8-8.',
    category: 'HVAC & Refrigeration',
    text: `{ Liquid-suction heat exchanger (Dossat, Principles of Refrigeration,
  Section 8-8). An R-12 saturated cycle evaporates at 20 F and condenses at
  100 F; a counterflow liquid-suction exchanger superheats the suction vapor
  from 20 F to 60 F. The measured vapor exit fixes the effectiveness eps.
  Book: 5.71 Btu/lb exchanged, liquid at 75 F, refrigerating effect
  55.04 Btu/lb, heat of compression 11.40 Btu/lb, COP 4.91. CoolProp's R-12
  and the book's table differ by up to 3 percent in each enthalpy difference
  (5.90, 54.43 and 11.08 Btu/lb here); their ratio, the COP, agrees. }
T_evap = 20 [F]
T_cond = 100 [F]
T_suction = 60 [F]
P_L = P_sat(R12, T=T_evap)
P_H = P_sat(R12, T=T_cond)
TwoPhaseCompressor comp(fluid$=R12, eta=1)
TwoPhaseCondenser cond(fluid$=R12, SC_set=0 [K], dP=0 [Pa])
TwoPhaseInternalHX lshx(fluid$=R12, eps=eps)
TwoPhaseExpansionValve valve(fluid$=R12, Cv=Cv)
TwoPhaseEvaporator evap(fluid$=R12, SH_set=0 [K], dP=0 [Pa])
connect(comp.out, cond.in)
connect(cond.out, lshx.liq_in)
connect(lshx.liq_out, valve.in)
connect(valve.out, evap.in)
connect(evap.out, lshx.vap_in)
connect(lshx.vap_out, comp.in)
comp.in.mdot = 1 [kg/s]
comp.out.P = P_H
valve.out.P = P_L
Temperature(R12, P=P_L, h=lshx.vap_out.h) = T_suction
GUESS eps = 0.5
q_hx = lshx.Q / comp.in.mdot
T_liquid = Temperature(R12, P=P_H, h=lshx.liq_out.h)
RE = evap.Q / comp.in.mdot
COP = evap.Q / comp.W
q_hx_ip = q_hx / (1 [Btu/lbm])
RE_ip = RE / (1 [Btu/lbm])
w_ip = comp.W / comp.in.mdot / (1 [Btu/lbm])
T_liquid_F = (T_liquid - 459.67 [R]) / (1 [R])
{ CHECK eps 0.502691577551595 5e-07 }
{ CHECK q_hx_ip 5.89962943061483 6e-06 }
{ CHECK T_liquid_F 75.3947322779111 8e-05 }
{ CHECK RE_ip 54.4262962954564 5e-05 }
{ CHECK w_ip 11.0823068947073 1e-05 }
{ CHECK COP 4.91109809650275 5e-06 }`,
  },
  {
    id: 'pump-operating-cost',
    title: 'Pump power and annual operating cost',
    description: 'Solve. A LiquidPump lifts 200 gpm against 60 ft of head; motor efficiency and tariff give the yearly cost. NCEES sample question 125.',
    category: 'HVAC & Refrigeration',
    text: `{ Pump operating cost (NCEES PE Mechanical HVAC and Refrigeration sample
  question 125). A centrifugal pump delivers 200 gpm of 60 F water against
  60 ft of head; pump efficiency 0.75, motor efficiency 0.83, electricity
  at 0.06 dollars per kWh for 8,000 hr/yr. The LiquidPump's shaft power is
  the flow times the pressure rise over its efficiency. Book: 3.63 kW input,
  1,742 dollars a year (answer D, 1,750). }
Q = 200 [gpm]
T = 60 [F]
P_in = 1 [atm]
H = 60 [ft]
eta_motor = 0.83
rho = Density(Water, T=T, P=P_in)
LiquidSource supply(fluid$=Water, mdot=rho*Q, P=P_in, T=T)
LiquidPump pump(eta=0.75, fluid$=Water)
LiquidSink discharge()
connect(supply.out, pump.in)
connect(pump.out, discharge.in)
pump.out.P = pump.in.P + rho * g# * H
W_shaft = pump.W
W_elec = W_shaft / eta_motor
cost = W_elec * 8000 [hr] * 0.06 / (1 [kW*hr])
{ CHECK W_shaft 3014.32735409539 0.003 }
{ CHECK W_elec 3631.71970372939 0.004 }
{ CHECK cost 1743.22545779011 0.002 }`,
  },
  {
    id: 'pipe-pressure-drop-brass',
    title: 'Friction loss in a brass water pipe',
    description: 'Solve. A LiquidPipe computes its own Colebrook friction factor for 5 ft/s of water in 1-in brass pipe. NCEES sample question 126.',
    category: 'Fluids & Fluid Power',
    text: `{ Friction pressure drop in a brass pipe (NCEES PE Mechanical HVAC and
  Refrigeration sample question 126). Water at 60 F flows at 5 ft/s through
  100 ft of 1-in brass pipe (1.063 in ID). The book gives a Moody friction
  factor of 0.025 and gets 4.75 psi (answer B, 4.8). LiquidPipe computes f
  from Colebrook at Re = 4.0e4 for drawn brass (roughness 1.5 um) and gets
  0.0226, so its drop is 4.29 psi; answer B is still the nearest choice. }
D = 1.063 [in]
L = 100 [ft]
V = 5 [ft/s]
T = 60 [F]
P_in = 50 [psia]
rho = Density(Water, T=T, P=P_in)
LiquidSource supply(fluid$=Water, mdot=rho*V*pi#*D^2/4, P=P_in, T=T)
LiquidPipe pipe(fluid$=Water, L=L, D=D, rough=1.5e-6 [m])
LiquidSink drain()
connect(supply.out, pipe.in)
connect(pipe.out, drain.in)
f = pipe.f
dP = pipe.in.P - pipe.out.P
dP_psi = dP / (1 [psi])
{ CHECK f 0.022579009258861 2e-08 }
{ CHECK dP_psi 4.28939468988375 4e-06 }`,
  },
  {
    id: 'chilled-water-coil-flow',
    title: 'Chilled-water flow for a coil load',
    description: 'Solve. A LiquidColdPlate carries the coil load; the 12 F chilled-water rise fixes the flow. NCEES sample question 513.',
    category: 'HVAC & Refrigeration',
    text: `{ Chilled-water flow for a cooling-coil load (NCEES PE Mechanical HVAC and
  Refrigeration sample question 513). The coil carries 220,000 Btu/hr
  (100,000 sensible, 40,000 latent and 80,000 outdoor air) with a 12 F
  chilled-water rise. The supply temperature is not given; 44 F is assumed.
  A LiquidColdPlate takes the load and the rise fixes the flow. Book, from
  the 500 x gpm x dT rule: 36.67 gpm. The rule rounds the density and
  specific heat of water; the property library gives 36.55 gpm at 44 F. }
Q_load = 220000 [Btu/hr]
T_supply = 44 [F]
DELTAT = 12 [R]
P = 50 [psia]
LiquidSource supply(fluid$=Water, mdot=m, P=P, T=T_supply)
LiquidColdPlate coil(Q=Q_load)
LiquidSink ret()
connect(supply.out, coil.in)
connect(coil.out, ret.in)
Temperature(Water, P=P, h=coil.out.h) = T_supply + DELTAT
GUESS m = 2
gpm = m / Density(Water, T=T_supply, P=P) / (1 [gpm])
{ CHECK m 2.30573882104506 2e-06 }
{ CHECK gpm 36.545344286763 4e-05 }`,
  },
  {
    id: 'run-around-coil-loop',
    title: 'Run-around heat-recovery loop',
    description: 'Solve. Two LiquidColdPlates move exhaust-air heat to cold outdoor air on a 15 gpm water loop. NCEES sample question 511.',
    category: 'HVAC & Refrigeration',
    text: `{ Run-around heat-recovery loop (NCEES PE Mechanical HVAC and Refrigeration
  sample question 511). A 15 gpm water loop runs between 45 F and 55 F. It
  picks up heat in the exhaust-air coil and gives it to 4,000 cfm of 35 F
  outdoor air. Two LiquidColdPlates are the coils; the loop is opened at the
  55 F point, and the exhaust coil returns it to 55 F. The outdoor-air rise
  uses the book's sensible factor 1.1 Btu/hr per cfm F. Book:
  Q = 75,000 Btu/hr, T_2 = 52 F (answer C). }
P = 30 [psia]
T_hot = 55 [F]
T_cold = 45 [F]
T_1 = 35 [F]
cfm_oa = 4000 [cfm]
k_air = 1.1 [Btu/hr] / (1 [cfm] * 1 [R])
rho = Density(Water, T=T_hot, P=P)
LiquidSource loop_in(fluid$=Water, mdot=rho*15 [gpm], P=P, T=T_hot)
LiquidColdPlate oa_coil(Q=Q_oa)
LiquidColdPlate ea_coil(Q=Q_ea)
LiquidSink loop_out()
connect(loop_in.out, oa_coil.in)
connect(oa_coil.out, ea_coil.in)
connect(ea_coil.out, loop_out.in)
Temperature(Water, P=P, h=oa_coil.out.h) = T_cold
Temperature(Water, P=P, h=ea_coil.out.h) = T_hot
Q = -Q_oa
T_2 = T_1 + Q / (k_air * cfm_oa)
{ CHECK Q 22042.8973441781 0.02 }
{ CHECK T_2 284.313319159449 0.0003 }`,
  },
  {
    id: 'pump-npsh-available',
    title: 'NPSH available for a hot-water pump',
    description: 'Solve. The LiquidPump npsh model reports the suction head above vapor pressure for 200 F water. NCEES sample question 517.',
    category: 'Fluids & Fluid Power',
    text: `{ NPSH available for a hot-water pump (NCEES PE Mechanical HVAC and
  Refrigeration sample question 517). 200 F water is drawn from a vented tank
  whose level is 6 in above the pump centerline; the suction loses 3 ft at
  the entrance and 1.5 ft per 100 ft over 50 ft of pipe. The LiquidPump's
  npsh model reports NPSH_a = (P_in - P_vap) v / g. The required NPSH is not
  given, so NPSHr = 0 switches the derating off; the efficiency and
  discharge pressure do not enter the answer. Book: 4.09 ft (answer C). The
  book converts both pressure heads with 2.31 ft/psi, the cold-water figure;
  at 200 F water is 4 percent lighter, which gives 4.32 ft. }
T = 200 [F]
P_atm = 14.7 [psia]
h_z = 6 [in]
h_f = 3.0 [ft] + 1.5 [ft] / 2
rho = Density(Water, T=T, P=P_atm)
P_suction = P_atm + rho * g# * (h_z - h_f)
LiquidSource tank(fluid$=Water, mdot=rho*450 [gpm], P=P_suction, T=T)
LiquidPump pump(fluid$=Water, model$=npsh, eta=0.7, Pvap=P_sat(Water, T=T), NPSHr=0 [m], eps_n=0.1 [m])
LiquidSink chiller()
connect(tank.out, pump.in)
connect(pump.out, chiller.in)
pump.out.P = P_suction + 30 [psi]
NPSH_a = pump.NPSH_a
NPSH_ft = NPSH_a / (1 [ft])
{ CHECK NPSH_a 1.31815343970395 1e-06 }
{ CHECK NPSH_ft 4.32465039272951 4e-06 }`,
  },
  {
    id: 'shower-mixing-ratio',
    title: 'Hot and cold water mixing in a shower',
    description: 'Solve. A LiquidMixer joins hot and cold supplies; the mixed temperature fixes the flow ratio. Cengel Example 5-9.',
    category: 'Thermodynamics',
    text: `{ Mixing of hot and cold waters in a shower (Cengel, Thermodynamics 9th ed.,
  Example 5-9). Hot water at 140 F mixes with cold water at 50 F at 20 psia
  to supply 110 F. The LiquidMixer ties the cold inlet to the hot inlet
  pressure, so the cold source pressure is left for it to set. The outlet
  temperature fixes the hot-to-cold ratio y. Book: y = 2.0. }
P = 20 [psia]
LiquidSource hot(fluid$=Water, mdot=y * 1 [lbm/s], P=P, T=140 [F])
LiquidSource cold(fluid$=Water, mdot=1 [lbm/s], P=P_cold, T=50 [F])
LiquidMixer tee()
LiquidSink head()
connect(hot.out, tee.in1)
connect(cold.out, tee.in2)
connect(tee.out, head.in)
Temperature(Water, P=P, h=head.h) = 110 [F]
GUESS y = 1
{ CHECK y 2.00040043865686 2e-06 }`,
  },
  {
    id: 'parallel-branches-three-way-valve',
    title: 'Parallel branches behind a three-way valve',
    description: 'Solve. A LiquidThreeWayValve splits the flow and a LiquidMixer ties the branch pressures, which fixes the split. NCEES sample question 127.',
    category: 'Fluids & Fluid Power',
    text: `{ Parallel pipe branches with a three-way valve (NCEES PE Mechanical HVAC and
  Refrigeration sample question 127). 20 gpm of 60 F water splits between
  branch A (80 ft equivalent) and branch B (149.8 ft equivalent, including
  elbows and a globe valve) of 1-in Sch. 40 steel pipe. The liquid-domain
  counterpart of parallel-pipe-branches: the LiquidThreeWayValve's split
  fraction u is the unknown, and the LiquidMixer ties the branch outlet
  pressures, which closes it. Each LiquidPipe computes its own Colebrook f;
  the book assumes one f for both. Book: q_B = 8.4 gpm (answer B). }
T = 60 [F]
P_in = 50 [psia]
D = 1.049 [in]
rho = Density(Water, T=T, P=P_in)
LiquidSource supply(fluid$=Water, mdot=rho*20 [gpm], P=P_in, T=T)
LiquidThreeWayValve split(u=u)
LiquidPipe branch_A(fluid$=Water, L=80 [ft], D=D, rough=4.6e-5 [m])
LiquidPipe branch_B(fluid$=Water, L=149.8 [ft], D=D, rough=4.6e-5 [m])
LiquidMixer join()
LiquidSink drain()
connect(supply.out, split.in)
connect(split.outa, branch_A.in)
connect(split.outb, branch_B.in)
connect(branch_A.out, join.in1)
connect(branch_B.out, join.in2)
connect(join.out, drain.in)
GUESS u = 0.5
q_B = branch_B.in.mdot / rho / (1 [gpm])
q_A = branch_A.in.mdot / rho / (1 [gpm])
{ CHECK u 0.583859683361629 6e-07 }
{ CHECK q_A 11.6771936672326 1e-05 }
{ CHECK q_B 8.32280633276743 8e-06 }`,
  },
  {
    id: 'valve-loss-coefficients',
    title: 'Valve and exit loss coefficients',
    description: 'Solve. A LiquidCheckValve and a LiquidOrifice reproduce K-factor losses in a pumping main. Miller, Internal Flow Systems, Section 3.3.',
    category: 'Fluids & Fluid Power',
    text: `{ Loss coefficients in a pumping main (Miller, Internal Flow Systems 2nd ed.,
  Section 3.3, Table 3.1). 2.75 m3/s of water flows through the 0.8 m
  delivery line, past a reflux valve (K = 0.5) and out into the reservoir
  (K = 1.0). Each loss K rho U^2/2 is a square-law element with
  CdA = A/sqrt(K): a LiquidCheckValve for the reflux valve and a
  LiquidOrifice for the exit. Book: U = 5.47 m/s, velocity head 1.53 m,
  valve 0.76 m (7.456 kN/m2), exit 1.53 m. }
Q = 2.75 [m^3/s]
d = 0.8 [m]
rho = 1000 [kg/m^3]
K_valve = 0.5
K_exit = 1.0
A = pi# * d^2 / 4
U = Q / A
LiquidSource supply(fluid$=Water, mdot=rho*Q, P=3 [bar], T=15 [C])
LiquidCheckValve reflux(CdA=A/sqrt(K_valve), rho=rho, eps=1 [Pa])
LiquidOrifice outlet(CdA=A/sqrt(K_exit), rho=rho)
LiquidSink reservoir()
connect(supply.out, reflux.in)
connect(reflux.out, outlet.in)
connect(outlet.out, reservoir.in)
dP_valve = reflux.in.P - reflux.out.P
H_valve = dP_valve / (rho * g#)
H_exit = (outlet.in.P - outlet.out.P) / (rho * g#)
H_velocity = U^2 / (2 * g#)
{ CHECK U 5.4709511687839 5e-06 }
{ CHECK H_velocity 1.52607193543248 2e-06 }
{ CHECK H_valve 0.763035967716242 8e-07 }
{ CHECK dP_valve 7482.82667280448 0.007 }
{ CHECK H_exit 1.52607193543248 2e-06 }`,
  },
  {
    id: 'closed-loop-pump-operating-point',
    title: 'Closed-loop pump operating point',
    description: 'Solve. A LiquidPumpMap head curve meets the Colebrook drop of a closed chilled-water loop; a LiquidExpansionTank is its one pressure reference.',
    category: 'HVAC & Refrigeration',
    text: `{ Operating point of a closed chilled-water loop. A centrifugal pump with a
  catalogue head curve (eight points, read linearly between them) circulates
  water through a 40 kW load coil, 150 m of DN65 commercial steel piping
  (equivalent length, fittings included) and a chiller evaporator held at 5 C
  with UA = 12 kW/K. An expansion tank at the pump suction holds 1.5 bar: in a
  closed loop it is the one pressure reference, since every other element only
  sets a difference. The pump runs where its head equals the Colebrook drop of
  the piping, and the chiller removes the load plus the pump's own heat.
  Cross-check (Colebrook iterated by hand at the pipe's water properties,
  intersected with the same table): Q = 5.0317 L/s, H = 5.9162 m,
  W = rho g Q H / eta = 449.0 W, chiller duty 40,449 W. }
P_tank = 1.5 [bar]
T_evap = 5 [C]
Q_load = 40 [kW]
rho = 999.7 [kg/m^3]
TABLE curve(Q [m^3/s]) [m]
  0       12
  0.001   11.76
  0.002   11.04
  0.003   9.84
  0.004   8.16
  0.005   6.00
  0.006   3.36
  0.007   0.24
END
LiquidExpansionTank tank(P=P_tank)
LiquidPumpMap pump(rho=rho, eta=0.65, map$=curve)
LiquidColdPlate load(Q=Q_load)
LiquidPipe piping(fluid$=Water, L=150 [m], D=0.065 [m], rough=4.5e-5 [m])
LiquidWallHX chiller(fluid$=Water, UA=12 [kW/K])
ThermalSource evaporator(T=T_evap)
connect(pump.out, load.in)
connect(load.out, piping.in)
connect(piping.out, chiller.in)
connect(chiller.out, pump.in)
connect(tank.port, pump.in)
connect(chiller.wall, evaporator.port)
Q = pump.in.mdot / rho
H = (pump.out.P - pump.in.P) / (rho * g#)
W_pump = pump.W
Q_chiller = chiller.Q
T_supply = Temperature(Water, P=pump.in.P, h=pump.in.h)
T_return = Temperature(Water, P=piping.out.P, h=piping.out.h)
{ CHECK Q 0.005031743438680591 5e-09 }
{ CHECK H 5.916197321883239 5.9e-06 }
{ CHECK W_pump 448.9915322511392 0.00045 }
{ CHECK Q_chiller 40448.99153225115 0.04 }
{ CHECK T_supply 280.65362883560783 0.00028 }
{ CHECK T_return 282.56927151043067 0.00028 }`,
  },
  {
    id: 'pipeline-hydrostatic-test',
    title: 'Pipeline hydrostatic test',
    description: 'Solve (DYNAMIC). A test pump pressurises a blind-flanged pipeline; the LiquidVolume reaches test pressure at the closed-form time C dP / mdot.',
    category: 'Fluids & Fluid Power',
    text: `{ Time to pressurise a pipeline for a hydrostatic test. 500 m of DN150 steel
  line pipe (D = 0.15 m, wall 7.1 mm), filled with 15 C water and vented at
  1 bar, is closed with a blind flange and fed by a 2 L/min test pump until it
  reaches the 16 bar test pressure. The LiquidVolume stores C = rho V / beta_eff
  per pascal, where the effective bulk modulus adds the pipe wall's
  elasticity to the water's: 1/beta_eff = 1/beta + D/(E t). With no outflow
  the pressure rises linearly, so the closed form is t = C (P_test - P_0) / mdot.
  Cross-check: that formula gives 222.73 s; the simulated pressure crosses
  16 bar at the same time. }
function [port] = TestPump(mdot [kg/s], h [J/kg], domain$ = liquid)
port(port)
  port.mdot = mdot
  port.h    = h
end
function [port] = BlindFlange(domain$ = liquid)
port(port)
  port.mdot = 0
end
T = 15 [C]
P_0 = 1 [bar]
P_test = 16 [bar]
L = 500 [m]
D = 0.15 [m]
t_w = 7.1 [mm]
E = 200 [GPa]
beta = 2.2 [GPa]
Vdot = 2 [L/min]
rho = Density(Water, T=T, P=P_0)
V = pi# / 4 * D^2 * L
beta_eff = 1 / (1 / beta + D / (E * t_w))
C = rho * V / beta_eff
TestPump pump(mdot=rho * Vdot, h=Enthalpy(Water, T=T, P=P_0))
LiquidVolume line(C=C, P0=P_0)
BlindFlange flange()
connect(pump.port, line.in)
connect(line.out, flange.port)
DYNAMIC fill(method=ode45, time=0..300, points=31, rtol=1e-9)
END
t_closed = C * (P_test - P_0) / (rho * Vdot)
t_test = TimeAt('line.in.p', P_test / 1 [Pa]) * 1 [s]
P_end = FinalValue('line.in.p') * 1 [Pa]
{ CHECK C 4.945147578971818e-06 4.9e-12 }
{ CHECK t_closed 222.7316534522813 0.00022 }
{ CHECK t_test 222.73165345228006 0.00022 }
{ CHECK P_end 2120368.4255251717 2.1 }`,
  },
  {
    id: 'tank-warm-up-time-constant',
    title: 'Warm-up of a mixed water tank',
    description: 'Solve (DYNAMIC). A LiquidTank fed with hot water and losing heat to the room follows the first-order closed form.',
    category: 'Heat Transfer',
    text: `{ Warm-up of a mixed water tank. A 40 kg tank of water at 15 C is fed
  0.05 kg/s of 60 C water and loses heat through UA = 15 W/K to a 20 C room;
  the outflow leaves at the tank temperature. With constant cp the tank is a
  first-order system: T_inf = (mdot cp T_feed + UA T_room)/(mdot cp + UA) and
  tau = m cp / (mdot cp + UA). The LiquidTank integrates the energy balance in
  enthalpy, so it carries water's real cp. Cross-check: the closed form at
  cp = 4179 J/kg-K (the 37.5 C mean) gives T_inf = 57.32 C, tau = 746.4 s and
  T(600 s) = 38.378 C; the simulation reads 38.377 C at 600 s. }
T_feed = 60 [C]
T_0 = 15 [C]
T_room = 20 [C]
mdot = 0.05 [kg/s]
m = 40 [kg]
UA = 15 [W/K]
P = 2 [bar]
LiquidSource feed(fluid$=Water, mdot=mdot, P=P, T=T_feed)
LiquidTank tank(fluid$=Water, m=m, UA=UA, T0=T_0)
ThermalSource room(T=T_room)
LiquidSink drain()
connect(feed.out, tank.in)
connect(tank.out, drain.in)
connect(tank.wall, room.port)
DYNAMIC warm(method=ode45, time=0..1800, points=181, rtol=1e-9)
END
cp = Cp(Water, T=(T_feed + T_0) / 2, P=P)
T_inf = (mdot * cp * T_feed + UA * T_room) / (mdot * cp + UA)
tau = m * cp / (mdot * cp + UA)
T_600_closed = T_inf + (T_0 - T_inf) * exp(-600 [s] / tau)
T_600 = ODEValue('tank.tt', 600) * 1 [K]
T_end = FinalValue('tank.tt') * 1 [K]
{ CHECK T_inf 330.4708359141258 0.00033 }
{ CHECK tau 746.4167182825173 0.00075 }
{ CHECK T_600_closed 311.5277496588768 0.00031 }
{ CHECK T_600 311.52747582745906 0.00031 }
{ CHECK T_end 326.6795732461245 0.00033 }`,
  },
  {
    id: 'thermostat-opening-flow',
    title: 'Engine thermostat opening flow',
    description: 'Solve. A LiquidThermostat passes coolant at 80, 85 and 92 C; the flows follow its tanh opening and the orifice law.',
    category: 'Fluids & Fluid Power',
    text: `{ Flow through an engine thermostat as it opens. A wax thermostat with a
  full-open flow area CdA = 3 cm^2 sits between the engine block (1.8 bar) and
  the radiator (1.5 bar). It opens smoothly about T_open = 85 C over a 3 K
  band: u = (1 + tanh((T - T_open)/T_band))/2, and the flow obeys the
  orifice law mdot = u CdA sqrt(2 rho dP). Three copies see coolant at 80, 85
  and 92 C. Cross-check: u = 0.0344, 0.5000 and 0.9907 from the formula, and
  the full-open flow is 3e-4 * sqrt(2 * 968.65 * 30000) = 2.287 kg/s. }
function [out] = EngineBlock(fluid$, P [Pa], T [K], domain$ = liquid)
port(out)
  out.P = P
  out.h = Enthalpy(fluid$, P=P, T=T)
end
function [in] = RadiatorInlet(P [Pa], domain$ = liquid)
port(in)
  in.P = P
end
P_up = 1.8 [bar]
dP = 0.3 [bar]
T_open = 85 [C]
T_band = 3 [K]
CdA = 3 [cm^2]
rho = Density(Water, T=T_open, P=P_up)
EngineBlock e80(fluid$=Water, P=P_up, T=80 [C])
LiquidThermostat s80(fluid$=Water, CdA=CdA, rho=rho, Topen=T_open, Tband=T_band)
RadiatorInlet r80(P=P_up - dP)
connect(e80.out, s80.in)
connect(s80.out, r80.in)
EngineBlock e85(fluid$=Water, P=P_up, T=85 [C])
LiquidThermostat s85(fluid$=Water, CdA=CdA, rho=rho, Topen=T_open, Tband=T_band)
RadiatorInlet r85(P=P_up - dP)
connect(e85.out, s85.in)
connect(s85.out, r85.in)
EngineBlock e92(fluid$=Water, P=P_up, T=92 [C])
LiquidThermostat s92(fluid$=Water, CdA=CdA, rho=rho, Topen=T_open, Tband=T_band)
RadiatorInlet r92(P=P_up - dP)
connect(e92.out, s92.in)
connect(s92.out, r92.in)
m_full = CdA * sqrt(2 * rho * dP)
m_80 = s80.in.mdot
m_85 = s85.in.mdot
m_92 = s92.in.mdot
u_80 = m_80 / m_full
u_85 = m_85 / m_full
u_92 = m_92 / m_full
{ CHECK m_full 2.287071087145202 2.3e-06 }
{ CHECK m_80 0.07877861109902025 7.9e-08 }
{ CHECK m_85 1.1435355435662307 1.1e-06 }
{ CHECK m_92 2.265764825878045 2.3e-06 }
{ CHECK u_80 0.03444519566611037 3.4e-08 }
{ CHECK u_92 0.9906840406549181 9.9e-07 }`,
  },
  {
    id: 'small-hydro-turbine-power',
    title: 'Small hydro turbine power',
    description: 'Solve. A HydroTurbine with an efficiency map turns 0.6 m3/s through 28 m of head into shaft power and generator torque.',
    category: 'Fluids & Fluid Power',
    text: `{ Shaft power of a small hydro turbine. 0.6 m^3/s of 12 C water falls through
  a 28 m net head to a Francis runner that turns a generator at 750 rpm. The
  runner's efficiency comes from a four-point map against mass flow, read
  linearly between points; the shaft delivers P = eta rho g Q H and the
  torque is P / omega. Cross-check: at mdot = 599.70 kg/s the map gives
  eta = 0.86 + 0.04 (599.70 - 400)/200 = 0.89994, so
  P = 0.89994 * 999.50 * 9.80665 * 0.6 * 28 = 148.19 kW and
  T = 148,193 / 78.540 = 1886.8 N-m. }
H = 28 [m]
Q = 0.6 [m^3/s]
N = 750 [rpm]
T_w = 12 [C]
P_tail = 1 [atm]
TABLE etamap(mdot [kg/s]) [-]
  200   0.78
  400   0.86
  600   0.90
  800   0.88
END
rho = Density(Water, T=T_w, P=P_tail)
LiquidSource intake(fluid$=Water, mdot=rho * Q, P=P_tail + rho * g# * H, T=T_w)
HydroTurbine runner(fluid$=Water, rho=rho, eta$=etamap, epsw=1e-6 [rad/s])
LiquidSink tailrace()
SpeedSource generator(w=N)
MechGround frame()
connect(intake.out, runner.in)
connect(runner.out, tailrace.in)
connect(runner.shaft, generator.a)
connect(generator.b, frame.port)
runner.out.P = P_tail
eta = runner.eta
P_shaft = runner.Pm
T_shaft = -runner.shaft.tau
{ CHECK eta 0.8999400415168007 9e-07 }
{ CHECK P_shaft 148192.58769821076 0.15 }
{ CHECK T_shaft 1886.8466049158783 0.0019 }`,
  },
  {
    id: 'cooling-tower-range-approach',
    title: 'Cooling tower range and approach',
    description: 'Solve. A CoolingTower rejects condenser-water heat on the saturated-air enthalpy potential; range and approach follow.',
    category: 'HVAC & Refrigeration',
    text: `{ Range and approach of a cooling tower. 10 L/s of condenser water at 35 C
  enters a tower that moves 8 kg/s of air at a 24 C wet bulb. The
  CoolingTower rates the heat rejected on the enthalpy potential between
  saturated air at the water inlet temperature and saturated air at the
  wet bulb, Q = eps_t mdot_a (h_s(T_in) - h_s(T_wb)), with eps_t = 0.55. The
  range is the water's temperature drop; the approach is how far its outlet
  stays above the wet bulb. Cross-check with the ideal-gas psychrometric
  equations (ASHRAE Fundamentals ch. 1, Hyland-Wexler saturation pressure):
  h_s = 129.07 kJ/kg at 35 C and 72.20 kJ/kg at 24 C give Q = 250.2 kW; the
  engine's real-gas humid air gives 251.1 kW, 0.4 % higher. }
P_atm = 1 [atm]
T_hot = 35 [C]
T_wb = 24 [C]
Vdot = 10 [L/s]
mdot_a = 8 [kg/s]
eps_t = 0.55
rho = Density(Water, T=T_hot, P=P_atm)
LiquidSource hot(fluid$=Water, mdot=rho * Vdot, P=P_atm, T=T_hot)
CoolingTower tower(fluid$=Water, eps_t=eps_t, mdot_a=mdot_a, Patm=P_atm)
SigConstant wetbulb(k=T_wb)
LiquidSink basin()
connect(hot.out, tower.in)
connect(tower.out, basin.in)
connect(wetbulb.out, tower.wb)
Q = tower.Q
T_cold = Temperature(Water, P=P_atm, h=basin.in.h)
range = T_hot - T_cold
approach = T_cold - T_wb
{ CHECK Q 251116.05588824747 0.25 }
{ CHECK T_cold 302.1057283576566 0.0003 }
{ CHECK range 6.0442716423434035 6e-06 }
{ CHECK approach 4.9557283576565965 5e-06 }`,
  },
  {
    id: 'stratified-tank-charging',
    title: 'Charging a stratified storage tank',
    description: 'Solve (DYNAMIC). A three-node ThermalStorageTank charged from the top matches the tanks-in-series closed form.',
    category: 'Heat Transfer',
    text: `{ Charging a stratified storage tank. A solar loop delivers 0.25 kg/s of 70 C
  water to the top of a tank that starts uniformly at 20 C; the return leaves
  from the bottom. The ThermalStorageTank models three 100 kg plug-flow nodes;
  with no mixing between them and no shell loss it is three mixed tanks in
  series, whose response to a step in inlet temperature is known in closed
  form: with tau = m_node / mdot = 400 s and x = t / tau, the bottom node is
  T_3 = T_in - (T_in - T_0) e^(-x) (1 + x + x^2/2). Cross-check: at
  t = 1200 s (x = 3) the formula gives 48.840 C, as the simulation does. }
mdot = 0.25 [kg/s]
m_node = 100 [kg]
cp = 4180 [J/kg-K]
T_in = 70 [C]
T_0 = 20 [C]
LiquidSource solar(fluid$=Water, mdot=mdot, P=2 [bar], T=T_in)
ThermalStorageTank tank(fluid$=Water, m_node=m_node, cp_f=cp, UA_loss=0 [W/K], T_amb=T_0, kmix=0 [W/K], T10=T_0, T20=T_0, T30=T_0)
LiquidSink collector_return()
connect(solar.out, tank.in)
connect(tank.out, collector_return.in)
DYNAMIC charge(method=ode45, time=0..2400, points=241, rtol=1e-10)
END
tau = m_node / mdot
x = 1200 [s] / tau
T_3_closed = T_in - (T_in - T_0) * exp(-x) * (1 + x + x^2 / 2)
T_1_1200 = ODEValue('tank.t1', 1200) * 1 [K]
T_3_1200 = ODEValue('tank.t3', 1200) * 1 [K]
{ CHECK T_1_1200 340.6606465931416 0.00034 }
{ CHECK T_3_1200 321.99049592479713 0.00032 }
{ CHECK T_3_closed 321.9904959436578 0.00032 }`,
  },
  {
    id: 'ice-bank-discharge',
    title: 'Ice bank discharge',
    description: 'Solve (DYNAMIC). Glycol melts an IceStorageBrine store; the time to half melted is checked against an epsilon-NTU estimate.',
    category: 'HVAC & Refrigeration',
    text: `{ Discharging an ice bank. 0.5 kg/s of 50 % ethylene glycol returns at 8 C and
  passes an 800 kg ice store (UA = 1500 W/K) that starts at -3 C. The ice
  melts over a narrow band about 0 C (the PCMMass spreads L = 334 kJ/kg over a
  Gaussian of width 0.3 K, so the stored energy is exact). While the ice
  melts the brine sees a wall near 0 C, so by epsilon-NTU
  Q = mdot cp (1 - e^(-NTU)) (T_in - 0 C). Cross-check: with cp at 8 C,
  NTU = 0.924 and Q = 7.83 kW, so the time to warm the ice to 0 C and melt
  half of it is m (cp_ice 3 K + L/2) / Q = 17,700 s. The simulation reaches
  half melted (0 C) at 17,254 s, 2.5 % sooner: for most of that time the ice
  sits below 0 C in its melt band, which raises the driving difference. }
mdot = 0.5 [kg/s]
T_in = 8 [C]
UA = 1500 [W/K]
m_ice = 800 [kg]
cp_ice = 2100 [J/kg-K]
L_f = 334 [kJ/kg]
T_m = 0 [C]
T_0 = -3 [C]
LiquidSource brine_return(fluid$=EG50, mdot=mdot, P=2 [bar], T=T_in)
IceStorageBrine bank(fluid$=EG50, UA=UA, m=m_ice, cp_p=cp_ice, L=L_f, Tm=T_m, dTm=0.3 [K], T0=T_0)
LiquidSink brine_supply()
connect(brine_return.out, bank.in)
connect(bank.out, brine_supply.in)
DYNAMIC melt(method=radau5, time=0..43200, points=433, rtol=1e-8)
END
cp_b = Cp(EG50, T=T_in, P=2 [bar])
NTU = UA / (mdot * cp_b)
Q_plateau = mdot * cp_b * (1 - exp(-NTU)) * (T_in - T_m)
t_half_closed = m_ice * (cp_ice * (T_m - T_0) + L_f / 2) / Q_plateau
t_half = TimeAt('bank.ice.port.t', T_m / 1 [K]) * 1 [s]
{ CHECK NTU 0.923801976432673 9.2e-07 }
{ CHECK Q_plateau 7832.759716644005 0.0078 }
{ CHECK t_half_closed 17700.01953531152 0.018 }
{ CHECK t_half 17253.637008918224 0.017 }`,
  },
  {
    id: 'fans-in-series-duct',
    title: 'Two fans in series on a duct',
    description: 'Solve. A FanCurve and a catalogue FanMap add their rises against the Colebrook drop of a 200 m exhaust duct.',
    category: 'Fluids & Fluid Power',
    text: `{ Two fans in series on a long exhaust duct. Fan A is a FanCurve with a
  quadratic characteristic (600 Pa shut-off, 2.0 m^3/s free delivery); fan B
  is a FanMap read linearly from six catalogue points. Together they push air
  (rho 1.2 kg/m^3) through 200 m of 0.4 m galvanised duct to atmosphere, so
  the flow settles where the two rises add up to the Colebrook drop of the
  duct. FanCurve, FanMap and Duct carry no enthalpy, so the model passes it
  through each of them itself. Cross-check (Colebrook iterated by hand
  against the same two curves): Q = 1.3992 m^3/s, dP_A = 306.34 Pa,
  dP_B = 344.11 Pa. }
function [out] = Intake(P [Pa], T [K])
port(out)
  out.P = P
  out.h = Enthalpy(Air, P=P, T=T)
end
function [in] = Outlet(P [Pa])
port(in)
  in.P = P
end
P_atm = 101325 [Pa]
rho = 1.2 [kg/m^3]
mu = 1.81e-5 [Pa-s]
TABLE curveB(Q [m^3/s]) [Pa]
  0     450
  0.5   440
  1.0   400
  1.5   330
  2.0   230
  2.5   100
END
Intake inlet(P=P_atm, T=293.15 [K])
FanCurve fanA(rho=rho, dP0=600 [Pa], Q0=2.0 [m^3/s])
FanMap fanB(rho=rho, map$=curveB)
Duct duct(rho=rho, mu=mu, L=200 [m], D=0.4 [m], rough=1.5e-4 [m])
Outlet exhaust(P=P_atm)
connect(inlet.out, fanA.in)
connect(fanA.out, fanB.in)
connect(fanB.out, duct.in)
connect(duct.out, exhaust.in)
fanA.out.h = fanA.in.h
fanB.out.h = fanB.in.h
duct.out.h = duct.in.h
Q = fanA.in.mdot / rho
dP_A = fanA.dP
dP_B = fanB.dP
f = duct.f
{ CHECK Q 1.3991930072929215 1.4e-06 }
{ CHECK dP_A 306.33883925138855 0.00031 }
{ CHECK dP_B 344.11297897899095 0.00034 }
{ CHECK f 0.017488733236735065 1.7e-08 }`,
  },
  {
    id: 'fan-ventilation-duct',
    title: 'Ventilation fan on a roof duct',
    description: 'Solve. A Fan with a quadratic curve meets a 60 m duct; its losses warm the air by dP/(rho cp eta).',
    category: 'HVAC & Refrigeration',
    text: `{ Ventilation fan on a roof duct. A fan with a quadratic curve (800 Pa
  shut-off, 1.2 m^3/s free delivery, 60 % efficient) draws 20 C room air and
  discharges it through 60 m of 0.3 m galvanised duct to atmosphere. The Fan
  evaluates air density at its inlet and heats the air by its losses,
  dT = dP / (rho cp eta). Cross-check (Colebrook iterated by hand at the
  duct's air properties): Q = 0.89455 m^3/s and dP = 355.43 Pa, so
  dT = 355.43 / (1.2046 * 1006 * 0.6) = 0.489 K. }
function [out] = Room(fluid$, P [Pa], T [K])
port(out)
  out.P = P
  out.h = Enthalpy(fluid$, P=P, T=T)
end
P_atm = 1 [atm]
T_room = 20 [C]
Room room(fluid$=Air, P=P_atm, T=T_room)
Fan fan(fluid$=Air, dP0=800 [Pa], Q0=1.2 [m^3/s], eta=0.6)
Pipe duct(fluid$=Air, L=60 [m], D=0.3 [m], rough=1.5e-4 [m])
Sink roof()
connect(room.out, fan.in)
connect(fan.out, duct.in)
connect(duct.out, roof.in)
duct.out.P = P_atm
Q = fan.Q
dP = fan.dP
T_out = Temperature(Air, P=fan.out.P, h=fan.out.h)
dT = T_out - T_room
{ CHECK Q 0.8945518805485461 8.9e-07 }
{ CHECK dP 355.4316294483665 0.00036 }
{ CHECK dT 0.48960989424011814 4.9e-07 }`,
  },
  {
    id: 'compressor-map-discharge',
    title: 'Air compressor on an efficiency map',
    description: 'Solve. A CompressorMap reads its isentropic efficiency from a map against pressure ratio; compared with the cold-air standard.',
    category: 'Thermodynamics',
    text: `{ Air compressor on an efficiency map. 2 kg/s of air at 100 kPa and 300 K is
  compressed to a pressure ratio of 6 by a CompressorMap, whose isentropic
  efficiency is read linearly from a four-point map against pressure ratio
  (0.81 at PR 6). It compresses along the real air entropy line. Cross-check
  with the cold-air standard (cp 1.005 kJ/kg-K, k = 1.4):
  T_2s = 300 * 6^(0.4/1.4) = 500.55 K, so T_2 = 547.6 K and W = 497.7 kW.
  The model gives 544.2 K and 497.2 kW: real air's cp rises with
  temperature, so the same work raises it 3.4 K less. }
P_1 = 100 [kPa]
T_1 = 300 [K]
mdot = 2 [kg/s]
PR = 6
TABLE etamap(PR [-]) [-]
  2   0.86
  4   0.84
  6   0.81
  8   0.77
END
Source inlet(fluid$=Air, mdot=mdot, P=P_1, T=T_1)
CompressorMap comp(fluid$=Air, map_eta$=etamap)
Sink outlet()
connect(inlet.out, comp.in)
connect(comp.out, outlet.in)
comp.out.P = PR * P_1
eta = comp.eta
T_2 = Temperature(Air, P=comp.out.P, h=comp.out.h)
W = comp.W
{ CHECK eta 0.81 8.1e-07 }
{ CHECK T_2 544.1687956189999 0.00054 }
{ CHECK W 497233.3105829011 0.5 }`,
  },
  {
    id: 'pressure-reducing-valve-sizing',
    title: 'Sizing a pressure-reducing valve',
    description: 'Solve. An ExpansionValve with the downstream pressure pinned returns the flow area a 6-to-3 bar reduction needs.',
    category: 'Fluids & Fluid Power',
    text: `{ Sizing a pressure-reducing valve. A building takes 4 L/s of 15 C water
  from a 6 bar main and needs 3 bar. The ExpansionValve is a square-law
  orifice, mdot |mdot| = CdA^2 2 rho dP; with the downstream pressure
  pinned, the solve returns the flow area it needs. Cross-check:
  CdA = mdot / sqrt(2 rho dP) = 3.9973 / sqrt(2 * 999.34 * 3e5)
  = 1.632e-4 m^2, an equivalent round port of 14.4 mm. }
P_main = 6 [bar]
P_set = 3 [bar]
Vdot = 4 [L/s]
T = 15 [C]
rho = Density(Water, T=T, P=P_main)
Source main(fluid$=Water, mdot=rho * Vdot, P=P_main, T=T)
ExpansionValve prv(CdA=CdA, rho_in=rho)
Sink building()
connect(main.out, prv.in)
connect(prv.out, building.in)
prv.out.P = P_set
d_eq = sqrt(4 * CdA / pi#)
{ CHECK CdA 0.00016324503735589907 1.6e-10 }
{ CHECK d_eq 0.014417005134330068 1.4e-08 }`,
  },
  {
    id: 'heated-duct-outlet',
    title: 'Air heated in a duct',
    description: 'Solve. A HeatedDuct picks up heat from an 80 C wall by the single-stream epsilon-NTU law.',
    category: 'Heat Transfer',
    text: `{ Air heated in a duct. 0.5 kg/s of air at 15 C passes a heating coil whose
  wall stays at 80 C, with UA = 400 W/K. The HeatedDuct is the
  single-stream epsilon-NTU limit, Q = (1 - e^(-UA/(mdot cp))) mdot cp
  (T_wall - T_in), with cp at the inlet. Cross-check: with cp = 1006 J/kg-K,
  NTU = 0.7952 and Q = 17.934 kW, which the model reproduces; the closed form
  T_out = T_wall - (T_wall - T_in) e^(-NTU) gives 50.65 C at constant cp,
  and the model's outlet, from air's real enthalpy, is 50.63 C. }
mdot = 0.5 [kg/s]
T_in = 15 [C]
T_wall = 80 [C]
UA = 400 [W/K]
Source supply(fluid$=Air, mdot=mdot, P=1 [atm], T=T_in)
HeatedDuct heater(fluid$=Air, UA=UA)
ThermalSource coil(T=T_wall)
Sink diffuser()
connect(supply.out, heater.in)
connect(heater.out, diffuser.in)
connect(heater.wall, coil.port)
Q = heater.Q
T_out = Temperature(Air, P=1 [atm], h=heater.out.h)
cp = Cp(Air, T=T_in, P=1 [atm])
T_out_closed = T_wall - (T_wall - T_in) * exp(-UA / (mdot * cp))
{ CHECK Q 17933.92496487991 0.018 }
{ CHECK T_out 323.7809999054555 0.00032 }
{ CHECK T_out_closed 323.8039364033945 0.00032 }`,
  },
  {
    id: 'gas-turbine-core-altitude',
    title: 'Gas-turbine core at 3000 m',
    description: 'Solve. An AtmosphereSource at ISA 3000 m feeds a compressor and a Combustor; turbine inlet temperature follows.',
    category: 'Aerospace & Compressible Flow',
    text: `{ Gas-turbine core at 3000 m. An engine flying at 3000 m (ISA) swallows
  20 kg/s of air, compresses it to a pressure ratio of 12 at 85 %
  isentropic efficiency, and burns 0.36 kg/s of kerosene (LHV 43 MJ/kg,
  99 % combustion efficiency) with a 4 % pressure loss. The
  AtmosphereSource gives the ISA 1976 state; the Combustor adds the fuel's
  mass and its heat release eta_b mdot_f LHV. The products are treated as
  air. Cross-checks: the ISA table at 3000 m (geopotential) lists 268.65 K
  and 70.109 kPa. The cold-air standard puts the compressor exit at
  595.4 K; the model gives 590.1 K because air's cp rises with
  temperature. }
alt = 3000 [m]
mdot = 20 [kg/s]
PR = 12
LHV = 43 [MJ/kg]
mdot_f = 0.36 [kg/s]
AtmosphereSource ambient(alt=alt, mdot=mdot)
Compressor compressor(eta=0.85, fluid$=Air)
Combustor burner(mdot_f=mdot_f, LHV=LHV, eta_b=0.99, dP=0.04 * PR * P_amb)
Sink turbine_inlet()
connect(ambient.out, compressor.in)
connect(compressor.out, burner.in)
connect(burner.out, turbine_inlet.in)
compressor.out.P = PR * compressor.in.P
P_amb = compressor.in.P
T_amb = Temperature(Air, P=P_amb, h=compressor.in.h)
T_2 = Temperature(Air, P=compressor.out.P, h=compressor.out.h)
T_3 = Temperature(Air, P=burner.out.P, h=burner.out.h)
W_c = mdot * (compressor.out.h - compressor.in.h)
FAR = mdot_f / mdot
{ CHECK P_amb 70108.98792883137 0.07 }
{ CHECK T_amb 268.6499999999936 0.00027 }
{ CHECK T_2 590.1219939953658 0.00059 }
{ CHECK T_3 1249.3377370725748 0.0012 }
{ CHECK W_c 6561599.264757517 6.6 }`,
  },
  {
    id: 'methane-combustor-products',
    title: 'Products of a methane combustor',
    description: 'Solve. CombustorSpecies burns methane in 16 % excess air and carries the product mass fractions.',
    category: 'Thermodynamics',
    text: `{ Products of a methane combustor. 0.1 kg/s of methane burns completely in
  2.0 kg/s of air (23.2 % O2, 76.8 % N2 by mass). CombustorSpecies applies
  the stoichiometry CH4 + 2 O2 -> CO2 + 2 H2O per kilogram of fuel and
  carries the products' mass fractions on the gas ports. Cross-check by
  hand: 0.1 kg/s of CH4 makes 0.275 kg/s of CO2 and 0.225 kg/s of H2O and
  uses 0.4 kg/s of O2, leaving 0.064 kg/s; over 2.1 kg/s of products that is
  y_CO2 = 0.13095, y_H2O = 0.10714, y_O2 = 0.03048, y_N2 = 0.73143. The
  stoichiometric air-fuel ratio is 17.24, so the air is 16 % in excess. }
mdot_air = 2.0 [kg/s]
mdot_f = 0.1 [kg/s]
CombustorSpecies burner(a1, a2, mdot_f=mdot_f, LHV=50 [MJ/kg], eta_b=0.99, dP=5 [kPa], xC=1, yH=4)
a1.P = 1000 [kPa]
a1.h = 650 [kJ/kg]
a1.mdot = mdot_air
a1.yo2 = 0.232
a1.yco2 = 0
a1.yh2o = 0
a1.yn2 = 0.768
y_CO2 = a2.yco2
y_H2O = a2.yh2o
y_O2 = a2.yo2
y_N2 = a2.yn2
AFR_st = 0.232^(-1) * 2 * 32 / 16
excess_air = mdot_air / (AFR_st * mdot_f) - 1
h_out = a2.h
{ CHECK y_CO2 0.13095238095238096 1.3e-07 }
{ CHECK y_H2O 0.10714285714285714 1.1e-07 }
{ CHECK y_O2 0.030476190476190473 3e-08 }
{ CHECK y_N2 0.7314285714285714 7.3e-07 }
{ CHECK excess_air 0.16000000000000014 1.6e-07 }`,
  },
  {
    id: 'propeller-thrust',
    title: 'Thrust of a propeller in flight',
    description: 'Solve. A Propeller reads thrust and power coefficients from advance-ratio maps at 50 m/s and 2400 rpm.',
    category: 'Aerospace & Compressible Flow',
    text: `{ Thrust of a propeller in flight. A 1.8 m propeller turns at 2400 rpm on
  an aircraft flying at 50 m/s through air at 1.112 kg/m^3 (ISA, 1000 m).
  The Propeller reads its thrust and power coefficients from maps against
  the advance ratio J = v/(nD), linear between points:
  T = Ct rho n^2 D^4 and P = Cp rho n^3 D^5. Cross-check by hand:
  J = 50 / (40 * 1.8) = 0.6944, Ct = 0.07292, Cp = 0.06358, so
  T = 1361.9 N, P = 85.50 kW and the propulsive efficiency
  J Ct / Cp = 0.796. }
D = 1.8 [m]
N = 2400 [rpm]
v = 50 [m/s]
rho = 1.112 [kg/m^3]
TABLE ctmap(J [-]) [-]
  0.0   0.110
  0.4   0.095
  0.8   0.065
  1.0   0.045
END
TABLE cpmap(J [-]) [-]
  0.0   0.065
  0.4   0.068
  0.8   0.062
  1.0   0.052
END
Propeller prop(Dp=D, rhoA=rho, ct$=ctmap, cpw$=cpmap, epsn=1e-9 [m/s])
prop.shaft.w = N
prop.veh.vel = v
J = prop.J
thrust = -prop.veh.f
P_shaft = prop.shaft.tau * prop.shaft.w
eta_p = thrust * v / P_shaft
{ CHECK J 0.6944444444347994 6.9e-07 }
{ CHECK thrust 1361.8886400135111 0.0014 }
{ CHECK P_shaft 85504.81637395457 0.086 }
{ CHECK eta_p 0.7963812436350387 8e-07 }`,
  },
  {
    id: 'turbocharger-boost',
    title: 'Boost from a turbocharger',
    description: 'Solve. A Turbocharger balances turbine and compressor work; the boost pressure ratio follows in closed form.',
    category: 'Electrical & Powertrain',
    text: `{ Boost from a turbocharger. Exhaust at 900 K and 220 kPa (0.105 kg/s)
  expands to 105 kPa through the turbine (78 %), which drives the compressor
  (75 %) on 0.1 kg/s of 298 K air at 100 kPa. The Turbocharger takes one cp
  (1005 J/kg-K) and k (1.4) for both wheels, so this is an air-standard
  estimate, and the shaft balances turbine and compressor work. Cross-check
  in closed form: the turbine exit is 766.27 K, so W = 14.112 kW; the
  compressor air rises 140.41 K to 438.41 K, which at 75 % needs a pressure
  ratio of (1 + 0.75 * 140.41 / 298)^3.5 = 2.884. }
Turbocharger tc(t1, t2, c1, c2, cp=1005 [J/kg-K], eta_t=0.78, eta_c=0.75, gam=1.4)
t1.T = 900 [K]
t1.P = 220 [kPa]
t1.mdot = 0.105 [kg/s]
t2.P = 105 [kPa]
c1.T = 298 [K]
c1.P = 100 [kPa]
c1.mdot = 0.1 [kg/s]
PR_c = c2.P / c1.P
T_boost = c2.T
W = tc.Wc
{ CHECK PR_c 2.8839185616530476 2.9e-06 }
{ CHECK T_boost 438.41455390827355 0.00044 }
{ CHECK W 14111.662667781491 0.014 }`,
  },
  {
    id: 'two-phase-line-friedel',
    title: 'Two-phase line: Friedel pressure drop',
    description: 'Solve. A TwoPhaseFlowRes sets the flow of a quality-0.3 R-134a line from its 20 kPa drop; the saturation temperature glides with the pressure.',
    category: 'Fluids & Fluid Power',
    text: `{ Pressure drop in a two-phase refrigerant line. R-134a at 400 kPa and
  quality 0.3 flows from a reservoir through 5 m of 10 mm smooth tube to a
  380 kPa suction header. The TwoPhaseFlowRes applies the Friedel
  multiplier to the liquid-only friction drop, so the 20 kPa drop sets the
  flow. Inside the dome the temperature follows the pressure: the line
  glides 1.5 K colder and flashes to a higher quality. Cross-check: at the
  solved flow, an independent evaluation of the Friedel groups from the
  phase properties the line reports gives G = 447.9 kg/m^2-s,
  Re_lo = 18,817, f_lo = 0.02627 (Colebrook), dP_lo = 1042.0 Pa and
  phi_lo^2 = 19.193, whose product is 20,000 Pa. }
P_1 = 400 [kPa]
P_2 = 380 [kPa]
TwoPhasePressureSource feed(fluid$=R134a, P=P_1, x=0.3)
TwoPhaseFlowRes line(fluid$=R134a, L=5 [m], D=0.01 [m])
TwoPhaseSensor exit(fluid$=R134a)
TwoPhasePressureSink suction(P=P_2)
connect(feed.out, line.in)
connect(line.out, exit.in)
connect(exit.out, suction.in)
mdot = line.in.mdot
GUESS mdot = 0.02
phi2 = line.phi2
x_2 = exit.x
dT_glide = T_sat(R134a, P=P_1) - exit.T
{ CHECK mdot 0.03517898088125955 3.5e-08 }
{ CHECK phi2 19.19306149328873 1.9e-05 }
{ CHECK x_2 0.3088383008336481 3.1e-07 }
{ CHECK dT_glide 1.5136195813150266 1.5e-06 }`,
  },
  {
    id: 'boiler-riser-lockhart-martinelli',
    title: 'Boiler riser: Lockhart-Martinelli friction',
    description: 'Solve. A TwoPhasePipe multiplies the liquid-alone drop of a steam-water riser by the Chisholm factor; checked by hand.',
    category: 'Fluids & Fluid Power',
    text: `{ Friction in a boiler riser. A steam-water mixture of quality 0.2 rises at
  0.5 kg/s through 12 m of 50 mm commercial-steel tube (roughness 0.045 mm)
  from a 1 MPa header. The TwoPhasePipe takes the phase properties as
  inputs (saturated water at 1 MPa: rho_l = 887.1, rho_g = 5.145 kg/m^3;
  mu_l = 1.5e-4, mu_g = 1.5e-5 Pa-s) and multiplies the liquid-alone drop
  by the Lockhart-Martinelli-Chisholm factor 1 + 20/X + 1/X^2. Cross-check
  by hand: V_l = 0.2296 m/s, Re_l = 67,906, f = 0.02280 (Colebrook),
  dP_l = 127.98 Pa; X_tt = 4^0.9 (5.145/887.1)^0.5 10^0.1 = 0.33386, so
  phi_l^2 = 69.878 and dP = 8943.1 Pa. }
h_1 = Enthalpy(Water, P=1 [MPa], x=0.2)
TwoPhaseSourcePH header(mdot=0.5 [kg/s], P=1 [MPa], h=h_1)
TwoPhasePipe riser(fluid$=Water, L=12 [m], D=0.05 [m], rough=4.5e-5 [m], x=0.2, rho_l=887.1 [kg/m^3], rho_g=5.145 [kg/m^3], mu_l=1.5e-4 [Pa-s], mu_g=1.5e-5 [Pa-s])
TwoPhaseSink drum()
connect(header.out, riser.in)
connect(riser.out, drum.in)
dP = header.out.P - drum.P
X_tt = riser.X_tt
phi2 = riser.phi2
{ CHECK dP 8943.112052054843 0.0089 }
{ CHECK X_tt 0.33385692741440204 3.3e-07 }
{ CHECK phi2 69.87769327364919 7e-05 }`,
  },
  {
    id: 'short-tube-capillary-choke',
    title: 'Short tube and capillary choke on flashing',
    description: 'Solve. Two short tubes pass the same flow to different evaporator pressures; a capillary tube rides on the same flashing limit.',
    category: 'HVAC & Refrigeration',
    text: `{ Fixed expansion devices choke on flashing. Liquid R-134a at 1.4 MPa and
  45 C (subcooled 7.4 K) feeds three devices: two identical short tubes
  (CdA = 1.5e-6 m^2) discharging to 300 and 400 kPa, and a capillary rated
  m = C dP^0.5 (C = 2e-5 kg/s) discharging to 300 kPa. Once the outlet is
  below the liquid's saturation pressure P_sat(45 C) = 1.160 MPa, the
  throat flashes and the flow depends on P_1 - P_sat alone, so both short
  tubes pass the same flow. Cross-check in closed form: with
  rho = 1127.3 kg/m^3 and P_1 - P_sat = 240.08 kPa, the short tube passes
  1.5e-6 sqrt(2 rho dP) = 34.90 g/s and the capillary
  2e-5 sqrt(240076) = 9.80 g/s. }
P_1 = 1.4 [MPa]
h_1 = Enthalpy(R134a, P=P_1, T=45 [C])
TwoPhaseSourcePH lineA(mdot=m_A, P=P_1, h=h_1)
TwoPhaseShortTube tubeA(fluid$=R134a, CdA=1.5e-6 [m^2])
TwoPhasePressureSink evapA(P=300 [kPa])
connect(lineA.out, tubeA.in)
connect(tubeA.out, evapA.in)
TwoPhaseSourcePH lineB(mdot=m_B, P=P_1, h=h_1)
TwoPhaseShortTube tubeB(fluid$=R134a, CdA=1.5e-6 [m^2])
TwoPhasePressureSink evapB(P=400 [kPa])
connect(lineB.out, tubeB.in)
connect(tubeB.out, evapB.in)
TwoPhaseSourcePH lineC(mdot=m_C, P=P_1, h=h_1)
CapillaryTube cap(fluid$=R134a, C=2e-5 [kg/s], n=0.5)
TwoPhasePressureSink evapC(P=300 [kPa])
connect(lineC.out, cap.in)
connect(cap.out, evapC.in)
P_f = tubeA.Pf
rho_1 = tubeA.rho_in
{ CHECK m_A 0.03489826779412465 3.5e-08 }
{ CHECK m_B 0.03489826779412465 3.5e-08 }
{ CHECK m_C 0.009799505327467423 9.8e-09 }
{ CHECK P_f 1159924.238342344 1.2 }`,
  },
  {
    id: 'txv-evaporator-balance',
    title: 'TXV and evaporator balance point',
    description: 'Solve. A TXV with its bulb on the coil outlet and a UA evaporator settle on one flow and one evaporating pressure.',
    category: 'HVAC & Refrigeration',
    text: `{ A thermostatic expansion valve and its evaporator find their balance
  point. Saturated R-134a liquid at 1 MPa feeds a TXV (gain 4 g/s per
  kelvin above its 4 K static superheat) whose bulb sits on the evaporator
  outlet. The coil (UA = 250 W/K, no pressure drop) cools a 12 C load and
  leaves at 6 K superheat. The evaporating pressure floats until the flow
  the valve passes equals the flow the coil can boil. Cross-check in
  closed form: with no coil pressure drop the bulb reads the coil's 6 K,
  so the valve passes 0.004 (6 - 4) = 8 g/s; the duty is
  8 g/s x (408.24 - 255.50) kJ/kg = 1222.0 W, and the evaporating
  temperature is 12 C - 1222.0/250 = 7.11 C. }
P_c = 1.0 [MPa]
h_3 = Enthalpy(R134a, P=P_c, x=0)
TwoPhaseSourcePH liquid(mdot=mdot, P=P_c, h=h_3)
TXVSuperheat txv(fluid$=R134a, Kv=0.004 [kg/s-K], SH_set=4 [K])
TwoPhaseEvaporatorUA coil(fluid$=R134a, UA=250 [W/K], dP=0 [Pa], SH=6 [K])
TwoPhaseSink suction()
connect(liquid.out, txv.in)
connect(txv.out, coil.in)
connect(coil.out, suction.in)
coil.frac = 1
coil.wall.T = 12 [C]
txv.bulb.T = Temperature(R134a, P=coil.out.P, h=coil.out.h)
P_e = coil.in.P
GUESS P_e = 250000
T_e = coil.Tevap
Q = coil.Q
{ CHECK mdot 0.007999999999998484 8e-09 }
{ CHECK P_e 376065.9854158051 0.38 }
{ CHECK T_e 280.26212449164376 0.00028 }
{ CHECK Q 1221.9688770890543 0.0012 }`,
  },
  {
    id: 'oil-separator-floating-head',
    title: 'Oil separator and floating-head condenser',
    description: 'Solve. An OilSeparator bleeds 1 % of the discharge; the floating-head condenser finds its own pressure from UA and ambient.',
    category: 'HVAC & Refrigeration',
    text: `{ Oil separator ahead of an air-cooled condenser. Compressor discharge
  (R-134a, 50 g/s, 430 kJ/kg) passes an OilSeparator that bleeds 1 % of
  the flow back to the sump as saturated liquid, then a condenser with
  UA = 600 W/K to 30 C air. The floating-head condenser has no pressure
  set: its pressure rises until UA (T_c - T_amb) equals the heat the
  stream must give up to leave as saturated liquid. Cross-check by energy
  balance: the bleed carries h_f, so the main stream leaves at
  (0.05 x 430,000 - 0.0005 h_f)/0.0495 = 431.69 kJ/kg; then
  0.0495 (431.69 - 262.38) kJ/kg = 8381 W = 600 (43.97 - 30) W. }
TwoPhaseEnthalpySource discharge(mdot=0.05 [kg/s], h=430 [kJ/kg])
OilSeparator sep(fluid$=R134a, f=0.01)
TwoPhaseCondenserFloat cond(fluid$=R134a, UA=600 [W/K], T_amb=30 [C])
TwoPhaseSensor exit(fluid$=R134a)
TwoPhaseSink liquid()
TwoPhaseSink sump()
connect(discharge.out, sep.in)
connect(sep.out, cond.in)
connect(cond.out, exit.in)
connect(exit.out, liquid.in)
connect(sep.bleed, sump.in)
P_c = cond.in.P
GUESS P_c = 1.0e6
T_c = cond.Tcond
Q = cond.Q
h_main = sep.out.h
x_exit = exit.x
{ CHECK P_c 1129188.4412380902 1.1 }
{ CHECK T_c 317.118552879384 0.00032 }
{ CHECK Q 8381.13172763043 0.0084 }
{ CHECK h_main 431693.1579247738 0.43 }
{ CHECK x_exit 0.0 1e-09 }`,
  },
  {
    id: 'receiver-liquid-level',
    title: 'Receiver liquid level',
    description: 'Solve. A TwoPhaseReceiver after a floating-head condenser holds 3.2 kg of R-134a; its liquid level follows from the charge balance.',
    category: 'HVAC & Refrigeration',
    text: `{ How full is the receiver? A floating-head condenser (UA = 500 W/K to
  32 C air) condenses 40 g/s of R-134a discharge at 425 kJ/kg to
  saturated liquid; a 4 L receiver downstream holds 3.2 kg of the charge.
  The condenser fixes the pressure, and the receiver's charge balance
  m = V (LL rho_l + (1 - LL) rho_g) fixes its liquid level. Cross-check in
  closed form: at the solved 1.157 MPa, rho_l = 1125.51 and
  rho_g = 57.49 kg/m^3, so LL = (3.2/0.004 - 57.49)/(1125.51 - 57.49)
  = 0.6952. }
TwoPhaseEnthalpySource discharge(mdot=0.04 [kg/s], h=425 [kJ/kg])
TwoPhaseCondenserFloat cond(fluid$=R134a, UA=500 [W/K], T_amb=32 [C])
TwoPhaseReceiver rec(fluid$=R134a, V=4 [L])
TwoPhaseSink liquid()
connect(discharge.out, cond.in)
connect(cond.out, rec.in)
connect(rec.out, liquid.in)
rec.m = 3.2 [kg]
P_c = cond.in.P
GUESS P_c = 1.0e6
LL = rec.LL
Q = cond.Q
{ CHECK P_c 1156829.6395473601 1.2 }
{ CHECK LL 0.6952202485400915 7e-07 }
{ CHECK Q 6448.542339036076 0.0064 }`,
  },
  {
    id: 'charge-sets-head-pressure',
    title: 'Charge sets the head pressure',
    description: 'Solve. With no receiver, a TwoPhaseCondenserUA and a TwoPhaseInventory share 1.8 kg of charge, which fixes the condensing pressure and subcooling.',
    category: 'HVAC & Refrigeration',
    text: `{ Refrigerant charge sets the head pressure. With no receiver, the 1.8 kg
  of R-134a on the high side must fit in a 1.5 L condenser and a 0.8 L
  liquid line. The condenser (UA = 500 W/K to 32 C air) rejects
  UA (T_c - T_amb) from 40 g/s of 425 kJ/kg discharge, so for any
  condensing pressure its outlet enthalpy follows; the charge balance
  picks the pressure. More charge means more liquid backed up in the
  condenser, a higher pressure, and more subcooling. Cross-check: the
  condenser holds 1.5 L x (57.06 + 1144.79)/2 = 0.9014 kg and the line
  0.8 L x 1123.27 = 0.8986 kg, which sum to 1.8 kg; and
  0.04 (425.00 - 257.47) kJ/kg = 6701 W = 500 (45.40 - 32) W. }
TwoPhaseEnthalpySource discharge(mdot=0.04 [kg/s], h=425 [kJ/kg])
TwoPhaseCondenserUA cond(fluid$=R134a, UA=500 [W/K], T_amb=32 [C], V=1.5 [L])
TwoPhaseInventory line(fluid$=R134a, V=0.8 [L])
TwoPhaseSink liquid()
connect(discharge.out, cond.in)
connect(cond.out, line.in)
connect(line.out, liquid.in)
cond.m + line.m = 1.8 [kg]
P_c = cond.in.P
GUESS P_c = 1.1e6
GUESS cond.out.h = 250000
SC = cond.SC
Q = cond.Q
m_cond = cond.m
m_line = line.m
{ CHECK P_c 1172074.733586867 1.2 }
{ CHECK SC 4.671770273027391 4.7e-06 }
{ CHECK Q 6701.050686880191 0.0067 }
{ CHECK m_cond 0.9013870877923834 9e-07 }
{ CHECK m_line 0.8986129122075962 9e-07 }`,
  },
  {
    id: 'moving-boundary-coils',
    title: 'Moving-boundary evaporator and condenser',
    description: 'Solve. Moving-boundary coils solve where the refrigerant finishes boiling and condensing, then superheat and subcool the rest of the tube by e-NTU.',
    category: 'Heat Transfer',
    text: `{ Where the refrigerant finishes boiling and condensing. A 12 m, 10 mm
  evaporator tube takes 20 g/s of R-134a at 300 kPa and quality 0.25
  against a 15 C wall (U = 2500 W/m^2-K boiling, 200 superheating); an
  8 m condenser tube takes 20 g/s of saturated vapor at 1 MPa against a
  30 C wall (U = 2000 condensing, 300 subcooling). Each moving-boundary
  model solves the length of its two-phase zone, and the rest of the tube
  superheats or subcools by e-NTU, approaching the wall but never passing
  it. Cross-check in closed form: the boiling zone needs
  0.02 (399.00 - 250.43) kJ/kg / (2500 pi 0.01 x 14.33 K) = 2.640 m and
  the condensing zone 0.02 (419.16 - 255.50) kJ/kg
  / (2000 pi 0.01 x 9.39 K) = 5.549 m. The 9.36 m superheat zone has
  NTU = 200 pi 0.01 x 9.36/(0.02 x 900.3) = 3.266, so the vapor leaves at
  399.00 + (1 - e^-3.266)(411.79 - 399.00) = 411.30 kJ/kg, 14.45 C, with
  h = 411.79 kJ/kg the vapor at the wall temperature. The 2.45 m subcool
  zone has NTU = 0.773, so the liquid leaves at
  255.50 - (1 - e^-0.773)(255.50 - 241.72) = 248.08 kJ/kg, 4.38 K above
  its wall. }
TwoPhaseSource feedE(fluid$=R134a, mdot=0.02 [kg/s], P=300 [kPa], x=0.25)
MovingBoundaryEvaporator evap(fluid$=R134a, U_tp=2500 [W/m^2-K], U_sh=200 [W/m^2-K], D=0.01 [m], L=12 [m], eps_zone=0.01 [m])
TwoPhaseSink suction()
connect(feedE.out, evap.in)
connect(evap.out, suction.in)
evap.wall.T = 15 [C]
TwoPhaseSource feedC(fluid$=R134a, mdot=0.02 [kg/s], P=1 [MPa], x=1)
MovingBoundaryCondenser cond(fluid$=R134a, U_cond=2000 [W/m^2-K], U_sc=300 [W/m^2-K], D=0.01 [m], L=8 [m], eps_zone=0.01 [m])
TwoPhaseSink liquid()
connect(feedC.out, cond.in)
connect(cond.out, liquid.in)
cond.wall.T = 30 [C]
L_boil = evap.L_tp
SH = evap.SH
Q_evap = evap.Q
L_cond = cond.L_cond
SC = cond.SC
Q_cond = cond.Q
T_margin_E = evap.wall.T - evap.T_out
T_margin_C = cond.T_out - cond.wall.T
{ CHECK L_boil 2.6404836489704806 2.6e-06 }
{ CHECK SH 13.77926864832392 1.4e-05 }
{ CHECK Q_evap 3217.411802409193 0.0032 }
{ CHECK L_cond 5.549471538082024 5.5e-06 }
{ CHECK SC 5.010925420211095 5e-06 }
{ CHECK Q_cond 3421.625218014702 0.0034 }
{ CHECK T_margin_E 0.5486676138732491 5.5e-07 }
{ CHECK T_margin_C 4.376705920824406 4.4e-06 }`,
  },
  {
    id: 'reversing-valve-heating',
    title: 'Reversing valve in heating mode',
    description: 'Solve. A ReversingValve at mode = 1 sends compressor discharge to the indoor coil and the outdoor return to suction.',
    category: 'HVAC & Refrigeration',
    text: `{ A heat pump's reversing valve in heating mode. Compressor discharge
  (R-134a, 30 g/s, 1.6 MPa, 440 kJ/kg) enters port d; the outdoor coil's
  return (350 kPa, 400 kJ/kg) enters port o. With mode = 1 the valve sends
  the discharge to the indoor coil i, which condenses it to 5 K
  subcooling, and the outdoor return to suction s. Cross-check: the
  routing is exact, so the indoor coil sees 1.6 MPa and 440 kJ/kg
  (T_sat = 57.9 C) and suction sees 350 kPa and 400 kJ/kg; the heating
  duty is 0.03 (440.00 - 276.07) kJ/kg = 4918 W. In cooling (mode = 0)
  the valve ties d to the outdoor coil and the indoor coil to suction,
  so the second source would move from port o to port i. }
TwoPhaseSourcePH discharge(mdot=0.03 [kg/s], P=1.6 [MPa], h=440 [kJ/kg])
TwoPhaseSourcePH outdoor(mdot=0.03 [kg/s], P=350 [kPa], h=400 [kJ/kg])
ReversingValve rv(mode=1)
TwoPhaseCondenser indoor(fluid$=R134a, SC_set=5 [K], dP=0 [Pa])
TwoPhaseSink coil()
TwoPhaseSink suction()
connect(discharge.out, rv.d)
connect(outdoor.out, rv.o)
connect(rv.i, indoor.in)
connect(indoor.out, coil.in)
connect(rv.s, suction.in)
P_indoor = rv.i.P
P_suction = rv.s.P
h_suction = rv.s.h
Q_heat = indoor.Q
{ CHECK P_indoor 1600000.0 1.6 }
{ CHECK P_suction 350000.0 0.35 }
{ CHECK h_suction 400000.0 0.4 }
{ CHECK Q_heat 4917.95336951741 0.0049 }`,
  },
  {
    id: 'ejector-lift-two-ratings',
    title: 'Ejector lift: rated ratio and momentum balance',
    description: 'Solve. The same motive and suction streams through a lumped TwoPhaseEjector and an EjectorMomentum; the momentum lift is checked by hand.',
    category: 'HVAC & Refrigeration',
    text: `{ Two ways to rate an ejector. Saturated R-134a vapor at 1.2 MPa
  (30 g/s) drives 12 g/s of 5 C suction vapor at 300 kPa. The lumped
  TwoPhaseEjector takes a rated pressure-lift ratio (1.25 here, from test
  data); EjectorMomentum computes the lift from a nozzle efficiency of 0.8
  and a mixing efficiency of 0.85. Both mix mass and energy exactly.
  Cross-check by hand: the mixed enthalpy is
  (0.03 x 422.04 + 0.012 x 402.88)/0.042 = 416.57 kJ/kg and the lumped
  outlet 1.25 x 300 = 375 kPa. The motive jet leaves the nozzle at
  sqrt(2 x 0.8 x (422.04 - 394.07) kJ/kg) = 211.55 m/s, the mixed stream
  moves at 0.85 x 0.03 x 211.55/0.042 = 128.44 m/s, and its velocity head
  at rho = 14.02 kg/m^3 recovers 14.02 x 128.44^2/2 = 115.7 kPa. }
h_m = Enthalpy(R134a, P=1.2 [MPa], x=1)
h_s = Enthalpy(R134a, P=300 [kPa], T=5 [C])
TwoPhaseSourcePH motA(mdot=0.03 [kg/s], P=1.2 [MPa], h=h_m)
TwoPhaseSourcePH sucA(mdot=0.012 [kg/s], P=300 [kPa], h=h_s)
TwoPhaseEjector ej(PLR=1.25)
TwoPhaseSink outA()
connect(motA.out, ej.m)
connect(sucA.out, ej.s)
connect(ej.out, outA.in)
TwoPhaseSourcePH motB(mdot=0.03 [kg/s], P=1.2 [MPa], h=h_m)
TwoPhaseSourcePH sucB(mdot=0.012 [kg/s], P=300 [kPa], h=h_s)
EjectorMomentum em(fluid$=R134a, eta_n=0.8, eta_m=0.85)
TwoPhaseSink outB()
connect(motB.out, em.mot_in)
connect(sucB.out, em.suc_in)
connect(em.out, outB.in)
P_lumped = outA.P
h_lumped = outA.h
P_momentum = outB.P
h_mi = em.h_mi
v_m = em.v_m
v_mix = em.v_mix
rho_mix = em.rho_mix
{ CHECK P_lumped 375000.0 0.38 }
{ CHECK h_lumped 416565.4553205589 0.42 }
{ CHECK P_momentum 415681.873233627 0.42 }
{ CHECK v_m 211.5496450192795 0.00021 }
{ CHECK v_mix 128.44085590456257 0.00013 }`,
  },
  {
    id: 'co2-gas-cooler-back-pressure',
    title: 'CO2 gas cooler and back-pressure valve',
    description: 'Solve. A transcritical R-744 high side: a GasCooler against 35 C air and a commanded TranscriticalBackPressureValve set the flow.',
    category: 'HVAC & Refrigeration',
    text: `{ The high side of a transcritical CO2 cycle. Compressor discharge at
  10 MPa and 120 C passes a gas cooler (UA = 400 W/K, 50 kPa drop) against
  35 C air, then a back-pressure valve (CdA_max = 2e-6 m^2) held 60 % open
  by a constant command, to a 3.5 MPa evaporator. Above the critical point
  nothing condenses, so the gas cooler has no saturation clamp, and the
  valve and the high-side pressure together set the flow. Cross-check in
  closed form: the valve passes 0.6 x 2e-6 x sqrt(2 x 651.60 x 6.45 MPa)
  = 0.11002 kg/s; with cp = 1367.2 J/kg-K at the inlet the effectiveness
  is 1 - exp(-400/(0.11002 x 1367.2)) = 0.9300, and the duty is that
  fraction of the enthalpy drop to the air temperature. }
P_hi = 10 [MPa]
h_2 = Enthalpy(R744, P=P_hi, T=120 [C])
TwoPhaseSourcePH discharge(mdot=mdot, P=P_hi, h=h_2)
GasCooler gc(fluid$=R744, UA=400 [W/K], dP=50 [kPa])
TranscriticalBackPressureValve bpv(fluid$=R744, CdA_max=2e-6 [m^2])
SigConstant cmd(k=0.6)
TwoPhasePressureSink evap(P=3.5 [MPa])
connect(discharge.out, gc.in)
connect(gc.out, bpv.in)
connect(cmd.out, bpv.u)
connect(bpv.out, evap.in)
gc.wall.T = 35 [C]
GUESS mdot = 0.05
Q = -gc.wall.Qdot
T_out = Temperature(R744, P=gc.out.P, h=gc.out.h)
eps = gc.epsg
{ CHECK mdot 0.1100190390645645 1.1e-07 }
{ CHECK Q 24898.16697156528 0.025 }
{ CHECK T_out 311.82437390703916 0.00031 }
{ CHECK eps 0.9299929416547943 9.3e-07 }`,
  },
  {
    id: 'blend-glide-mixing',
    title: 'Zeotropic blend: mixing and glide',
    description: 'Solve. Two R-407C streams meet in a BlendMixer that conserves the composition rider; a BlendSensor reads the quality and glide.',
    category: 'HVAC & Refrigeration',
    text: `{ Mixing two streams of a zeotropic blend. At 400 kPa, 20 g/s of R-407C
  at quality 0.1 and composition rider z = 0.25 meets 30 g/s at quality
  0.9 and z = 0.21 (z is a circulating-composition marker, here the mass
  fraction of one component after fractionation). The BlendMixer conserves
  mass, energy and z; the BlendSensor reports the quality and the glide
  from bubble to dew point at the charged composition. Cross-check by hand:
  z = (0.02 x 0.25 + 0.03 x 0.21)/0.05 = 0.226, and since enthalpy is
  linear in quality at one pressure, x = (0.02 x 0.1 + 0.03 x 0.9)/0.05
  = 0.58. The glide is 6.36 K. }
BlendSource liquid(fluid$=R407C, mdot=0.02 [kg/s], P=400 [kPa], x=0.1, z=0.25)
BlendSource vapor(fluid$=R407C, mdot=0.03 [kg/s], P=400 [kPa], x=0.9, z=0.21)
BlendMixer mix()
BlendSensor s(fluid$=R407C)
BlendSink header()
connect(liquid.out, mix.in1)
connect(vapor.out, mix.in2)
connect(mix.out, s.in)
connect(s.out, header.in)
glide = s.glide
x_mix = s.x
z_mix = header.z
T_bubble = s.bubble
T_dew = s.dew
{ CHECK z_mix 0.22599999999999998 2.3e-07 }
{ CHECK x_mix 0.5800000000000002 5.8e-07 }
{ CHECK glide 6.358132697866381 6.4e-06 }
{ CHECK T_bubble 262.81974477641427 0.00026 }
{ CHECK T_dew 269.17787747428065 0.00027 }`,
  },
  {
    id: 'oil-circulation-degradation',
    title: 'Oil circulation degrades an evaporator',
    description: 'Solve. A TwoPhaseOilRider puts 4 % oil on the stream and scales the UA of the evaporator downstream.',
    category: 'HVAC & Refrigeration',
    text: `{ Oil in circulation degrades an evaporator. R-134a at 300 kPa and
  quality 0.25 carries 4 % oil (oil circulation ratio 0.04). The
  TwoPhaseOilRider puts the ratio on the stream and reports the heat
  transfer factor 1 - k_deg OCR, which scales the evaporator's 400 W/K
  (k_deg = 2.5). The coil cools a 15 C load at 5 K superheat and sizes its
  own flow. Cross-check in closed form: f_deg = 1 - 2.5 x 0.04 = 0.9, so
  Q = 0.9 x 400 x (15 - 0.67) K = 5158 W, against 5731 W for oil-free
  refrigerant, and the flow is 5158/(403.48 - 250.43) kJ/kg = 33.70 g/s. }
TwoPhasePressureSource feedA(fluid$=R134a, P=300 [kPa], x=0.25)
TwoPhaseOilRider oil(oc_set=0.04, k_deg=2.5)
TwoPhaseEvaporatorUA coil(fluid$=R134a, UA=400 [W/K] * oil.f_deg, dP=0 [Pa], SH=5 [K])
TwoPhaseSink suc()
connect(feedA.out, oil.in)
connect(oil.out, coil.in)
connect(coil.out, suc.in)
coil.frac = 1
coil.wall.T = 15 [C]
f_deg = oil.f_deg
Q = coil.Q
mdot = coil.in.mdot
{ CHECK f_deg 0.9 9e-07 }
{ CHECK Q 5158.057054390982 0.0052 }
{ CHECK mdot 0.03370169350663147 3.4e-08 }`,
  },
  {
    id: 'microturbine-recuperator',
    title: 'Microturbine recuperator',
    description: 'Solve. A ThreeZoneHX preheats compressed air with exhaust; the counterflow e-NTU formula on the total UA cross-checks it.',
    category: 'Heat Transfer',
    text: `{ A microturbine recuperator. 0.5 kg/s of 900 K exhaust at 105 kPa
  preheats 0.49 kg/s of 450 K compressed air at 400 kPa through a
  three-zone counterflow exchanger (UA = 2000 W/K, split evenly over three
  HeatExchanger zones, each on its local cp). Cross-check: counterflow
  units in series form one counterflow exchanger, so the e-NTU formula on
  the total UA applies with the mean capacity rates. Iterating it by hand
  with Cengel's ideal-gas cp polynomial for air (Table A-2c) gives
  e = 0.8049, Q = 188.59 kW and 812.22 K to the combustor, against 0.8055,
  188.34 kW and 812.50 K here (the zones see cp change along the
  exchanger). }
Source exhaust(fluid$=Air, mdot=0.5 [kg/s], P=105 [kPa], T=900 [K])
Source charge(fluid$=Air, mdot=0.49 [kg/s], P=400 [kPa], T=450 [K])
ThreeZoneHX rec(UA=2000 [W/K], hot$=Air, cold$=Air, arr$=counter)
Sink stack()
Sink combustor()
connect(exhaust.out, rec.hot_in)
connect(rec.hot_out, stack.in)
connect(charge.out, rec.cold_in)
connect(rec.cold_out, combustor.in)
T_hot_out = Temperature(Air, P=105 [kPa], h=stack.h)
T_cold_out = Temperature(Air, P=400 [kPa], h=combustor.h)
Q = 0.49 [kg/s] * (combustor.h - charge.out.h)
eff = (T_cold_out - 450 [K]) / (900 [K] - 450 [K])
{ CHECK T_cold_out 812.4968796841343 0.00081 }
{ CHECK T_hot_out 551.5296825648438 0.00055 }
{ CHECK Q 188338.48993507613 0.19 }
{ CHECK eff 0.8055486215202985 8.1e-07 }`,
  },
  {
    id: 'pressure-cooker-relief',
    title: 'Pressure cooker: time to pressure',
    description: 'Solve (DYNAMIC). A BoilingVessel heats 1 kg of water at fixed volume until a ProportionalReliefValve lifts; checked against the steam tables.',
    category: 'Thermodynamics',
    text: `{ A pressure cooker comes up to pressure. A rigid 6 L pot holds 1 kg of
  water at 20 C (and its own vapor, no air) on a 1500 W burner. Its relief
  weight lifts at 200 kPa and passes 2e-7 kg/s per pascal of overpressure.
  The BoilingVessel integrates mass and internal energy at fixed volume
  and flashes (rho, u) to the pressure, from heating through boiling with
  no switch. Cross-check from the steam tables (Cengel, Table A-5): at
  v = 0.006 m^3/kg and 200 kPa, x = (0.006 - 0.001061)/(0.88578 - 0.001061)
  = 0.00558 and u = 504.50 + 0.00558 x 2024.6 = 515.80 kJ/kg; from
  u_f(20 C) = 83.91 kJ/kg the pot needs 431.89 kJ, or 287.9 s at 1500 W.
  Once venting, the steady flow is Q/h_fg = 1500/2200.1 kJ/kg = 0.682 g/s,
  which holds the pressure 3.3 kPa above the crack. }
BoilingVessel pot(fluid$=Water, V=6 [L], m0=1 [kg], T0=20 [C])
ProportionalReliefValve valve(fluid$=Water, Pcrack=200 [kPa], grad=2e-7 [kg/s-Pa], eps=1 [kPa])
TwoPhasePressureSink room(P=101.3 [kPa])
connect(pot.vent, valve.in)
connect(valve.out, room.in)
pot.wall.Qdot = 1500 [W]
DYNAMIC cook(method=radau5, time=0..900, points=451)
END
t_crack = TimeAt('pot.vent.p', 200000) * 1 [s]
P_end = FinalValue('pot.vent.p') * 1 [Pa]
m_end = FinalValue('pot.mass') * 1 [kg]
vent_end = FinalValue('pot.vent.mdot') * 1 [kg/s]
{ CHECK t_crack 288.35507018703265 0.00029 }
{ CHECK P_end 203331.42232889484 0.2 }
{ CHECK m_end 0.5842735696163454 5.8e-07 }
{ CHECK vent_end 0.0006809694131595016 1e-09 }`,
  },
  {
    id: 'steam-relief-valve-capacity',
    title: 'Steam relief valve capacity',
    description: 'Solve. A SteamReliefValve vents saturated steam at choked flow; checked in closed form and against the Napier rule.',
    category: 'Thermodynamics',
    text: `{ Capacity of a steam relief valve. Saturated steam at 1 MPa lifts a valve
  set at 0.8 MPa (effective area 1 cm^2, Cd = 0.9) venting to atmosphere.
  The pressure ratio is far below critical, so the flow chokes and
  depends only on the upstream state, with k = 1.135 and
  R = 461.5 J/kg-K for steam. Cross-check in closed form:
  0.9 x 1e-4 x 1e6 x sqrt(1.135/(461.5 x 453.03)) x
  (2/2.135)^(2.135/0.27) = 0.12511 kg/s. Napier's empirical rule for
  saturated steam, m [lb/s] = P [psia] A [in^2]/70, gives
  0.9 x 145.04 x 0.155/70 = 0.289 lb/s = 0.131 kg/s, 4.8 % more. }
TwoPhasePressureSource boiler(fluid$=Water, P=1 [MPa], x=1)
SteamReliefValve rv(fluid$=Water, A=1e-4 [m^2], Pset=0.8 [MPa], Cd=0.9, kgas=1.135, Rgas=461.5 [J/kg-K], eps=10 [kPa])
TwoPhasePressureSink atm(P=101.3 [kPa])
connect(boiler.out, rv.in)
connect(rv.out, atm.in)
mdot = rv.in.mdot
opening = rv.opening
{ CHECK mdot 0.1251052823992152 1.3e-07 }
{ CHECK opening 1.0 1e-06 }`,
  },
  {
    id: 'suction-accumulator-carryover',
    title: 'Suction accumulator traps carry-over',
    description: 'Solve (DYNAMIC). A SuctionAccumulator stores the liquid in a wet inlet and passes saturated vapor; the liquid grows linearly.',
    category: 'HVAC & Refrigeration',
    text: `{ A suction accumulator traps liquid carry-over. Wet R-134a at 250 kPa
  and quality 0.9 arrives at 20 g/s; the accumulator already holds
  0.1 kg of liquid and sends saturated vapor on to the compressor. Its
  energy balance with the liquid stored at h_f makes the vapor flow
  x_in times the inlet flow. Cross-check in closed form: 0.9 x 20 =
  18 g/s leaves, so the liquid grows at 2 g/s to 0.1 + 0.002 x 300 =
  0.7 kg after five minutes. }
TwoPhaseSource wet(fluid$=R134a, mdot=0.02 [kg/s], P=250 [kPa], x=0.9)
SuctionAccumulator acc(fluid$=R134a, m0=0.1 [kg])
TwoPhaseSink comp()
connect(wet.out, acc.in)
connect(acc.out, comp.in)
DYNAMIC fill(method=radau5, time=0..300, points=31)
END
m_end = FinalValue('acc.m') * 1 [kg]
mdot_out = FinalValue('acc.out.mdot') * 1 [kg/s]
{ CHECK m_end 0.7000000000000005 7e-07 }
{ CHECK mdot_out 0.018000000000000002 1.8e-08 }`,
  },
  {
    id: 'two-phase-volume-charging',
    title: 'Charging a closed two-phase volume',
    description: 'Solve (DYNAMIC). A TwoPhaseVolume behind a TwoPhaseCap charges at a constant rate; its pressure rises as the closed form says.',
    category: 'Fluids & Fluid Power',
    text: `{ Charging a closed two-phase volume. A 2 L vessel of R-134a with its
  outlet capped (TwoPhaseCap) starts at 300 kPa; 5 g/s of two-phase
  refrigerant flows in at a fixed enthalpy, and the vessel's compliance
  C = dm/dP is 2e-7 kg/Pa. Cross-check in closed form: P rises at
  0.005/2e-7 = 25 kPa/s, to 300 + 250 = 550 kPa after 10 s. The vessel
  also reports the charge it holds, V times the Zivi void-weighted
  density. }
h_f = Enthalpy(R134a, P=300 [kPa], x=0.2)
TwoPhaseEnthalpySource feed(mdot=0.005 [kg/s], h=h_f)
TwoPhaseVolume tank(fluid$=R134a, V=2 [L], C=2e-7 [kg/Pa], P0=300 [kPa])
TwoPhaseCap valve()
connect(feed.out, tank.in)
connect(tank.out, valve.in)
DYNAMIC charge(method=radau5, time=0..10, points=11)
END
P_end = FinalValue('tank.in.p') * 1 [Pa]
m_end = FinalValue('tank.m') * 1 [kg]
{ CHECK P_end 550000.0000000005 0.55 }
{ CHECK m_end 1.1844123349689726 1.2e-06 }`,
  },
  {
    id: 'two-phase-chamber-warm-up',
    title: 'Two-phase chamber warms toward its wall',
    description: 'Solve (DYNAMIC). A TwoPhaseChamber with pressure and enthalpy states settles against a wall and an outlet valve.',
    category: 'Heat Transfer',
    text: `{ A two-phase chamber warms toward its wall. 10 g/s of R-134a at quality
  0.3 enters a 1 L chamber (UA = 60 W/K to a 10 C wall) and leaves through
  a valve (Cv = 4e-6 m^2) to 300 kPa. Pressure and enthalpy are both
  states, so the heat the wall adds and the flow the valve passes settle
  together. Cross-check at the final state, two minutes in: the heat in,
  60 (283.15 - 279.95) = 191.78 W, equals
  0.01 (288.77 - 269.59) kJ/kg, and the valve passes
  4e-6 sqrt(2 x 43.33 x 72.12 kPa) = 10.00 g/s. }
h_in = Enthalpy(R134a, P=400 [kPa], x=0.3)
TwoPhaseEnthalpySource feed(mdot=0.01 [kg/s], h=h_in)
TwoPhaseChamber coil(fluid$=R134a, V=1 [L], C=1e-7 [kg/Pa], UA=60 [W/K], P0=400 [kPa], h0=h_in)
TwoPhaseExpansionValve exitv(fluid$=R134a, Cv=4e-6 [m^2])
TwoPhasePressureSink suc(P=300 [kPa])
connect(feed.out, coil.in)
connect(coil.out, exitv.in)
connect(exitv.out, suc.in)
coil.wall.T = 10 [C]
DYNAMIC warm(method=radau5, time=0..120, points=25)
END
P_end = FinalValue('coil.in.p') * 1 [Pa]
h_end = FinalValue('coil.hcv') * 1 [J/kg]
T_end = FinalValue('coil.tcv') * 1 [K]
Q_end = FinalValue('coil.q') * 1 [W]
{ CHECK P_end 372117.6159676672 0.37 }
{ CHECK h_end 288771.451811941 0.29 }
{ CHECK T_end 279.953691321692 0.00028 }
{ CHECK Q_end 191.77852069847745 0.00019 }`,
  },
  {
    id: 'few-cell-coils',
    title: 'Three-cell evaporator and condenser',
    description: 'Solve (DYNAMIC). FewCellEvaporator and FewCellCondenser run to steady state; four equal conductances give the flow in closed form.',
    category: 'Heat Transfer',
    text: `{ Three-cell evaporator and condenser coils. Each coil is three well-mixed
  cells with their own pressure and enthalpy states, joined by linear
  conductances Kv = 1e-6 kg/s-Pa, with a 40 W/K wall on every cell. The
  evaporator runs from 320 to 300 kPa against 15 C walls; the condenser
  from 1.02 to 1 MPa against 30 C walls. Cross-check in closed form at
  steady state: four equal conductances in series pass
  1e-6 x 20,000/4 = 5 g/s, with the cells 5 kPa apart; the wall heat
  equals the enthalpy change, 0.005 (411.10 - 252.51) kJ/kg = 792.9 W into
  the evaporator and 0.005 (419.48 - 244.81) kJ/kg = 873.4 W out of the
  condenser. }
h_0 = Enthalpy(R134a, P=300 [kPa], x=0.25)
TwoPhasePressureSource feedE(fluid$=R134a, P=320 [kPa], x=0.25)
FewCellEvaporator evap(fluid$=R134a, V=0.2 [L], Cc=1e-8 [kg/Pa], UA=40 [W/K], Kv=1e-6 [kg/s-Pa], P0=310 [kPa], h0=h_0)
TwoPhasePressureSink suc(P=300 [kPa])
connect(feedE.out, evap.in)
connect(evap.out, suc.in)
evap.w1.T = 15 [C]
evap.w2.T = 15 [C]
evap.w3.T = 15 [C]
h_sat = Enthalpy(R134a, P=1 [MPa], x=1)
TwoPhasePressureSource feedC(fluid$=R134a, P=1.02 [MPa], x=1)
FewCellCondenser cond(fluid$=R134a, V=0.2 [L], Cc=1e-8 [kg/Pa], UA=40 [W/K], Kv=1e-6 [kg/s-Pa], P0=1.01 [MPa], h0=h_sat)
TwoPhasePressureSink liq(P=1 [MPa])
connect(feedC.out, cond.in)
connect(cond.out, liq.in)
cond.w1.T = 30 [C]
cond.w2.T = 30 [C]
cond.w3.T = 30 [C]
DYNAMIC run(method=radau5, time=0..600, points=31)
END
mdot_E = FinalValue('evap.in.mdot') * 1 [kg/s]
mdot_C = FinalValue('cond.in.mdot') * 1 [kg/s]
h_E = FinalValue('evap.out.h') * 1 [J/kg]
h_C = FinalValue('cond.out.h') * 1 [J/kg]
Q_E = (FinalValue('evap.q1') + FinalValue('evap.q2') + FinalValue('evap.q3')) * 1 [W]
Q_C = (FinalValue('cond.q1') + FinalValue('cond.q2') + FinalValue('cond.q3')) * 1 [W]
{ CHECK mdot_E 0.005 5e-09 }
{ CHECK mdot_C 0.005 5e-09 }
{ CHECK h_E 411100.5762699324 0.41 }
{ CHECK h_C 244808.43030763575 0.24 }
{ CHECK Q_E 792.9407836922951 0.00079 }
{ CHECK Q_C -873.3709061010791 0.00087 }`,
  },
  {
    id: 'lesson-thermal-mass',
    title: 'Lesson — a cooling thermal mass',
    description: 'Predict, change one input, observe: doubling h halves τ = C/(hA). The same exponential as RC charging, in heat.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — a lumped thermal mass. Pairs with the RC-charging lesson.

  A block of heat capacity C = m·c at 400 K loses heat by convection
  (h·A) to surroundings at 300 K. With a uniform temperature (Bi < 0.1) it
  cools as T − T∞ = (T0 − T∞)·exp(−t/τ) with τ = C/(h·A): after one time
  constant 63.2 % of the excess temperature is gone.

  Source: F. P. Incropera, D. P. DeWitt, T. L. Bergman and A. S. Lavine,
  Fundamentals of Heat and Mass Transfer, 7th ed., Wiley, 2011, §5.1–5.2
  (the lumped capacitance method). }

C_th = 5000 [J/K]        { heat capacity m·c }
h_c  = 20 [W/m^2-K]      { convection coefficient: the lesson's slider }
A_s  = 1 [m^2]           { exposed area }

ThermalMass   M(C=C_th, T0=400 [K])
ThermalSource amb(T=300 [K])
Convection    film(htc=h_c, area=A_s)
connect(M.port, film.a)
connect(film.b, amb.port)

DYNAMIC cool (method = ida, time = 0 .. 2000, points = 201)
END

tau    = C_th / (h_c * A_s)                       { time constant }
T_250  = ODEValue('m.port.t', 250) * 1 [K]        { block temperature at 250 s }
share  = (400 [K] - T_250) / (400 [K] - 300 [K])  { fraction of the excess lost }

{ CHECK tau 250 1e-9 }
{ CHECK T_250 336.787944117144 1e-3 }
{ CHECK share 0.632120558828558 1e-5 }
PLOT 'Block temperature'
  kind = xy
  x = time
  y = 'M.port.T'
END`,
  },
  {
    id: 'lesson-rlc-ringing',
    title: 'Lesson — a ringing RLC circuit',
    description: 'Predict, change one input, observe: doubling R doubles ζ and cuts the overshoot from 53 % to 25 %. Pairs with the mass-spring-damper lesson.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — a series RLC circuit rings. Pairs with the mass-spring-damper lesson.

  A 1 V step drives L, R and C in series. The capacitor voltage obeys
  L·C·v'' + R·C·v' + v = E, a second-order system with natural frequency
  ω_n = 1/sqrt(L·C) and damping ratio ζ = (R/2)·sqrt(C/L). Below ζ = 1 it
  overshoots E by exp(−π·ζ/sqrt(1 − ζ²)) before settling.

  Source: J. W. Nilsson and S. A. Riedel, Electric Circuits, 11th ed.,
  Pearson, 2019, §8.4 (the step response of a series RLC circuit). }

R_s = 4 [ohm]
L_s = 0.001 [H]
C_s = 1e-5 [farad]
E_s = 1 [V]
VoltageSource VS(E=E_s)
Inductor      L1(L=L_s, I0=0 [A])
Resistor      R(R=R_s)
Capacitor     CAP(C=C_s, V0=0 [V])
Ground        G()
connect(VS.p, L1.p)
connect(L1.n, R.a)
connect(R.b, CAP.p)
connect(CAP.n, VS.n, G.port)
DYNAMIC ring (method = ode45, time = 0 .. 0.005, points = 2001, rtol = 1e-9)
END
zeta      = R_s / 2 * sqrt(C_s / L_s)
omega_n   = 1 / sqrt(L_s * C_s)
overshoot = MaxValue('cap.vc') * 1 [V] / E_s - 1
OS_theory = exp(-pi# * zeta / sqrt(1 - zeta^2))

{ CHECK zeta 0.2 1e-12 }
{ CHECK omega_n 10000 1e-6 }
{ CHECK OS_theory 0.526620599330303 1e-9 }
{ CHECK overshoot 0.52661 2e-5 }
PLOT 'Capacitor voltage'
  kind = xy
  x = time
  y = 'cap.vc'
END`,
  },
  {
    id: 'lesson-mass-spring-damper',
    title: 'Lesson — a mass on a spring and damper',
    description: 'Predict, change one input, observe: doubling c doubles ζ and cuts the overshoot from 53 % to 25 %. The same equation as the ringing RLC circuit.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — a mass on a spring and damper. Pairs with the RLC lesson.

  A 10 N step force pushes a 1 kg mass held by a spring k and a damper c.
  Its displacement obeys m·x'' + c·x' + k·x = F: the RLC equation with m in
  place of L, c in place of R and 1/k in place of C. So ω_n = sqrt(k/m),
  ζ = c/(2·sqrt(k·m)), and the overshoot past F/k is exp(−π·ζ/sqrt(1 − ζ²)).

  Source: K. Ogata, System Dynamics, 4th ed., Pearson, 2004 (the transient
  response of second-order mechanical systems). }

c_d = 4 [N-s/m]
k_s = 100 [N/m]
m_b = 1 [kg]
F_s = 10 [N]
ForceSource FS(F=F_s)
TransMass   M(m=m_b, v0=0 [m/s])
TransSpring SP(k=k_s, x0=0 [m])
TransDamper D(c=c_d)
TransGround G1()
TransGround G2()
TransGround G3()
connect(FS.a, M.port, SP.a, D.a)
connect(FS.b, G1.port)
connect(SP.b, G2.port)
connect(D.b, G3.port)
DYNAMIC ring (method = ode45, time = 0 .. 5, points = 2001, rtol = 1e-9)
END
zeta      = c_d / (2 * sqrt(k_s * m_b))
x_static  = F_s / k_s
overshoot = MaxValue('sp.x') * 1 [m] / x_static - 1
OS_theory = exp(-pi# * zeta / sqrt(1 - zeta^2))

{ CHECK zeta 0.2 1e-12 }
{ CHECK x_static 0.1 1e-12 }
{ CHECK OS_theory 0.526620599330303 1e-9 }
{ CHECK overshoot 0.52661 2e-5 }
PLOT 'Spring displacement'
  kind = xy
  x = time
  y = 'sp.x'
END`,
  },
  {
    id: 'lesson-diode',
    title: 'Lesson — a diode lets current one way',
    description: 'Predict, change one input, observe: reversing the source stops the current. Pairs with the check-valve lesson.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — a diode conducts one way. Pairs with the check-valve lesson.

  A 5 V source drives a diode and a 1 Ω resistor. Forward-biased, the diode
  conducts like a small resistance (1/Gon = 0.1 Ω here): I = E/(R + 0.1 Ω).
  Reverse the source and the diode blocks: the current is zero, not
  negative, whatever the voltage.

  Source: A. S. Sedra and K. C. Smith, Microelectronic Circuits, 7th ed.,
  Oxford University Press, 2015, Ch. 4 (diodes). }

E_s = 5 [V]
R_s = 1 [ohm]
VoltageSource VS(E=E_s)
Diode         D(Gon=10 [siemens], eps=0.001 [V])
Resistor      R(R=R_s)
Ground        G()
connect(VS.p, D.p)
connect(D.n, R.a)
connect(R.b, VS.n, G.port)
I_d = D.p.i

{ CHECK I_d 4.54545454545455 1e-9 }
`,
  },
  {
    id: 'lesson-check-valve',
    title: 'Lesson — a check valve lets flow one way',
    description: 'Predict, change one input, observe: dropping the inlet below the outlet pressure stops the flow. The same one-way rule as a diode.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — a check valve passes flow one way. Pairs with the diode lesson.

  Water at 3 bar flows through a check valve to 1 bar. Open, the valve is a
  square-law orifice: ṁ = CdA·sqrt(2·ρ·ΔP). Drop the inlet below the outlet
  and it closes: the flow is zero, not reversed. Pressure difference plays
  the part of voltage and mass flow the part of current.

  Source: F. M. White, Fluid Mechanics, 7th ed., McGraw-Hill, 2011, §6.9
  (minor losses: valves and fittings). }

function [out] = PressureInlet(fluid$, P, T, domain$ = liquid)
port(out)
  out.P = P
  out.h = Enthalpy(fluid$, P=P, T=T)
end
function [in] = PressureOutlet(P, domain$ = liquid)
port(in)
  in.P = P
end
P_up   = 300000 [Pa]
P_down = 100000 [Pa]
PressureInlet    up(fluid$=Water, P=P_up, T=300 [K])
LiquidCheckValve CV(CdA=1e-5 [m^2], rho=997 [kg/m^3], eps=100 [Pa])
PressureOutlet   down(P=P_down)
connect(up.out, CV.in)
connect(CV.out, down.in)
mdot   = CV.in.mdot

{ CHECK mdot 0.199699774661866 1e-9 }
`,
  },
  {
    id: 'lesson-capacitor-sharing',
    title: 'Lesson — two capacitors share their charge',
    description: 'Predict, change one input, observe: a larger second capacitor lowers the shared voltage. Pairs with the gas-receivers lesson.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — two capacitors share a charge. Pairs with the gas-receivers lesson.

  C1 holds 10 V; C2 is empty. Joined through R, current flows until both
  read the same voltage. Charge is conserved, so the end voltage is
  V = C1·V1/(C1 + C2), whatever R is: R only sets how fast.

  Source: J. W. Nilsson and S. A. Riedel, Electric Circuits, 11th ed.,
  Pearson, 2019, Ch. 6 (capacitance and stored charge). }

C_1 = 1e-5 [farad]
C_2 = 1e-5 [farad]
V_1 = 10 [V]
R_s = 1000 [ohm]
Capacitor C1(C=C_1, V0=V_1)
Resistor  R(R=R_s)
Capacitor C2(C=C_2, V0=0 [V])
Ground    G()
connect(C1.p, R.a)
connect(R.b, C2.p)
connect(C1.n, C2.n, G.port)
DYNAMIC share (method = ode45, time = 0 .. 0.1, points = 201, rtol = 1e-9)
END
V_final = FinalValue('c2.vc') * 1 [V]
V_theory = C_1 * V_1 / (C_1 + C_2)

{ CHECK V_theory 5 1e-12 }
{ CHECK V_final 5 1e-6 }
PLOT 'Second capacitor voltage'
  kind = xy
  x = time
  y = 'c2.vc'
END`,
  },
  {
    id: 'lesson-gas-receivers',
    title: 'Lesson — two air receivers equalize',
    description: 'Predict, change one input, observe: a larger second receiver lowers the shared pressure. The same conservation as two capacitors.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — two air receivers equalize. Pairs with the capacitor-sharing lesson.

  A 20 L receiver at 10 barA empties through an orifice into a second at
  1 barA, all at 293.15 K. At one temperature P·V is the gas held (m·R·T),
  so mass conservation fixes the end pressure: P = ΣP·V / ΣV. Volume plays
  the part of capacitance and pressure the part of voltage.

  Source: Y. A. Cengel and M. A. Boles, Thermodynamics: An Engineering
  Approach, 9th ed., McGraw-Hill, 2019, Ch. 5 (conservation of mass). }

function [port] = ClosedEnd(T [K], domain$ = gas)
port(port)
  port.mdot = 0
  port.h    = Enthalpy(Air, P=port.P, T=T)
end
function [port] = GasCap(domain$ = gas)
port(port)
  port.mdot = 0
end
V_1 = 0.02 [m^3]
V_2 = 0.02 [m^3]
P_1 = 1000000 [Pa]
ClosedEnd        head(T=293.15 [K])
PneumaticVolume  tank1(V=V_1, T=293.15 [K], R=287 [J/kg-K], P0=P_1)
PneumaticOrifice pipe(fluid$=Air, C=1e-7 [m^3/s-Pa], b=0.5)
PneumaticVolume  tank2(V=V_2, T=293.15 [K], R=287 [J/kg-K], P0=100000 [Pa])
GasCap           tail()
connect(head.port, tank1.in)
connect(tank1.out, pipe.in)
connect(pipe.out, tank2.in)
connect(tank2.out, tail.port)
DYNAMIC equalize (method = ode23s, time = 0 .. 300, points = 301)
END
P_final  = FinalValue('tank2.in.P') * 1 [Pa]
P_theory = (P_1 * V_1 + 100000 [Pa] * V_2) / (V_1 + V_2)

{ CHECK P_theory 550000 1e-6 }
{ CHECK P_final 550000 1 }
PLOT 'Second receiver pressure'
  kind = xy
  x = time
  y = 'tank2.in.P'
END`,
  },
  {
    id: 'lesson-throttling',
    title: 'Lesson — throttling on the P-h chart',
    description: 'Predict, change one input, observe: a higher evaporator pressure flashes less liquid to vapour.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — throttling a refrigerant, on the P-h chart.

  Saturated liquid R-134a at 0.8 MPa is throttled to the evaporator
  pressure. A throttle does no work and exchanges no heat, so h2 = h1: the
  state drops straight down the P-h chart into the dome, and the exit
  quality is x2 = (h1 − hf)/(hg − hf) at the low pressure.

  Source: Y. A. Cengel and M. A. Boles, Thermodynamics: An Engineering
  Approach, 9th ed., McGraw-Hill, 2019, §5-4 and Example 5-8. }

P_1 = 0.8 [MPa]
P_2 = 0.12 [MPa]
TwoPhaseSource inlet(fluid$=R134a, mdot=1 [kg/s], P=P_1, x=0)
TwoPhaseExpansionValve tube(fluid$=R134a, Cv=Cv)
TwoPhaseSensor exit(fluid$=R134a)
TwoPhasePressureSink evap(P=P_2)
connect(inlet.out, tube.in)
connect(tube.out, exit.in)
connect(exit.out, evap.in)
x_2 = exit.x
T_2 = exit.T
h_1 = Enthalpy(R134a, P=P_1, x=0)
h_f2 = Enthalpy(R134a, P=P_2, x=0)
h_g2 = Enthalpy(R134a, P=P_2, x=1)
x_theory = (h_1 - h_f2) / (h_g2 - h_f2)

{ CHECK x_2 0.340343737221829 3e-7 }
{ CHECK x_theory 0.340343737221829 3e-7 }
PLOT 'Throttling on P-h'
  kind = property
  fluid = R134a
  diagram = 'P-h'
  overlaystates = true
  connectstates = true
END`,
  },
  {
    id: 'lesson-air-mixing',
    title: 'Lesson — mixing two air streams',
    description: 'Predict, change one input, observe: more cool air pulls the mix down its straight line on the psychrometric chart.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — adiabatic mixing on the psychrometric chart.

  1.0 m3/s of warm air (38 °C DB, 24 °C WB) mixes with cool air (16 °C DB,
  10 °C WB). Dry air, water and enthalpy are conserved, so the mixed state
  lies on the straight line between the two, at the dry-air mass-weighted
  point: W3 = (m1·W1 + m2·W2)/(m1 + m2).

  Source: Y. A. Cengel and M. A. Boles, Thermodynamics: An Engineering
  Approach, 9th ed., McGraw-Hill, 2019, §14-7 (adiabatic mixing of
  airstreams). }

P = 101325 [Pa]
Vdot_1 = 1.000 [m^3/s]
T_1 = 38 [C]
Twb_1 = 24 [C]
Vdot_2 = 0.500 [m^3/s]
T_2 = 16 [C]
Twb_2 = 10 [C]
W_1 = HumRat(AirH2O, T=T_1, P=P, B=Twb_1)
W_2 = HumRat(AirH2O, T=T_2, P=P, B=Twb_2)
v_1 = Volume(AirH2O, T=T_1, P=P, W=W_1)
v_2 = Volume(AirH2O, T=T_2, P=P, W=W_2)
MoistAirSource hot(P=P, T=T_1, W=W_1, mdot=Vdot_1 / v_1)
MoistAirSource cool(P=P, T=T_2, W=W_2, mdot=Vdot_2 / v_2)
MixingBox      box()
MoistAirSink   supply()
connect(hot.out, box.in1)
connect(cool.out, box.in2)
connect(box.out, supply.in)
W_3 = box.out.W
h_3 = box.out.h
T_3 = Temperature(AirH2O, H=h_3, P=P, W=W_3)
m_1 = Vdot_1 / v_1
m_2 = Vdot_2 / v_2
W_lever = (m_1 * W_1 + m_2 * W_2) / (m_1 + m_2)

{ CHECK W_3 0.0102845692818076 1e-8 }
{ CHECK W_lever 0.0102845692818076 1e-8 }
{ CHECK T_3 303.464657436987 1e-4 }
PLOT 'Mixing on the psychrometric chart'
  kind = psychro
  overlaystates = true
  connectstates = true
END`,
  },
  {
    id: 'lesson-cooling-coil',
    title: 'Lesson — a coil that cools and dries air',
    description: 'Predict, change one input, observe: a colder supply condenses more water.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — cooling with dehumidification on the psychrometric chart.

  1.5 kg/s of room air at 28 °C / 50 % leaves a cooling coil at 90 %
  relative humidity. Below the inlet dew point the coil condenses water;
  the condensate is ṁ·(W_in − W_out), and a colder leaving temperature
  holds less water at the same relative humidity.

  Source: Y. A. Cengel and M. A. Boles, Thermodynamics: An Engineering
  Approach, 9th ed., McGraw-Hill, 2019, §14-7 (cooling with
  dehumidification). }

P = 101325 [Pa]
mdot = 1.5 [kg/s]
T_in = 28 [C]
RH_in = 0.50
T_out = 13 [C]
RH_out = 0.90
W_in = HumRat(AirH2O, T=T_in, P=P, R=RH_in)
MoistAirSource        room(P=P, T=T_in, W=W_in, mdot=mdot)
ApparatusDewPointCoil coil(T_adp=T_adp, BF=BF)
MoistAirSink          supply()
connect(room.out, coil.in)
connect(coil.out, supply.in)
coil.T_out = T_out
RelHum(AirH2O, T=T_out, P=P, W=coil.out.W) = RH_out
GUESS T_adp = 283.6
GUESS BF = 0.1
condensate = coil.mdot_w
W_out = coil.out.W
check_w = mdot * (W_in - W_out)

{ CHECK condensate 0.00519166771651502 1e-8 }
{ CHECK check_w 0.00519166771651502 1e-8 }
{ CHECK T_adp 283.396143144343 1e-4 }
PLOT 'Coil on the psychrometric chart'
  kind = psychro
  overlaystates = true
  connectstates = true
END`,
  },
  {
    id: 'lesson-sensor-lag',
    title: 'Lesson — a slow sensor in a speed loop',
    description: 'Predict, change one input, observe: a slower speed sensor makes the cruise controller overshoot.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lesson — from sensor to controller: a slow sensor in a speed loop.

  A PI controller drives a 1000 kg car to 20 m/s, but it sees the speed only
  through a sensor with a first-order lag τ_s. The lag delays what the
  controller knows, so it keeps pushing after the car has reached the set
  speed: the slower the sensor, the larger the overshoot.

  Source: K. J. Åström and R. M. Murray, Feedback Systems, 2nd ed.,
  Princeton University Press, 2021 (the cruise-control example). }

m_car  = 1000 [kg]
c_drag = 50 [N-s/m]
Kp     = 800 [N-s/m]
Ki     = 40 [N/m]
v_set  = 20 [m/s]
tau_s  = 0.5 [s]
DYNAMIC cruise (method = ode45, time = 0 .. 60, points = 1201, rtol = 1e-9)
  F = Kp * (v_set - v_m) + Ki * z
  der(v)   = (F - c_drag * v) / m_car
  der(v_m) = (v - v_m) / tau_s
  der(z)   = v_set - v_m
  v(0)   = 0 [m/s]
  v_m(0) = 0 [m/s]
  z(0)   = 0 [m]
END
overshoot = MaxValue('v') * 1 [m/s] / v_set - 1
v_end     = FinalValue('v') * 1 [m/s]

{ CHECK overshoot 0.0256527818045122 1e-6 }
{ CHECK v_end 20 1e-6 }
PLOT 'Speed and measured speed'
  kind = xy
  x = time
  y = v
  y = v_m
END`,
  },
  {
    id: 'lab-thermostat',
    title: 'Lab — a thermostat limit cycle',
    description: 'A graded live lab: an on-off heater holds a room inside a band; widen the band live and the cycle slows. Run it live from the lesson panel.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lab — a thermostat limit cycle.

  An on-off heater Q_h warms a room of heat capacity C_th that loses heat
  through UA to the outdoors at T_a. The thermostat switches the heater off
  when the room reaches T_set + dT_band/2 and on again when it falls to
  T_set - dT_band/2. The room never settles: it cycles between the two
  switching temperatures, a limit cycle.

  Hysteresis stand-in: the relay is a heater state u (0 or 1) that two
  EVENTs set where T crosses each switching temperature. That is exact for
  a relay with hysteresis; frees has no general hysteresis or state-machine
  contract yet.

  Between switchings the room is a first-order lag with tau = C_th/UA,
  heating toward T_on = T_a + Q_h/UA and cooling toward T_a, so each half
  of the cycle is a logarithm:
    t_heat = tau*ln((T_on - T_lo)/(T_on - T_hi))
    t_cool = tau*ln((T_hi - T_a)/(T_lo - T_a))

  Sources: F. P. Incropera et al., Fundamentals of Heat and Mass Transfer,
  7th ed., Wiley, 2011, §5.2 (lumped capacitance); K. J. Åström and
  R. M. Murray, Feedback Systems, 2nd ed., Princeton University Press, 2021,
  ch. 1 (on-off control). }

Q_h     = 2000 [W]      { heater power }
UA      = 50 [W/K]      { room loss conductance }
C_th    = 50000 [J/K]   { room heat capacity }
T_a     = 10 [C]        { outdoor temperature }
T_set   = 20 [C]        { set point }
dT_band = 2 [K]         { hysteresis width: the lab's slider }

DYNAMIC room (method = ida, time = 0 .. 6000, points = 2001)
  der(T) = (u*Q_h - UA*(T - T_a))/C_th
  der(u) = 0
  T(0) = 15 [C]
  u(0) = 1
  EVENT off: T = T_set + dT_band/2 | rising -> set u = 0
  EVENT on: T = T_set - dT_band/2 | falling -> set u = 1
END

tau     = C_th/UA                                                         { time constant }
T_on    = T_a + Q_h/UA                                                    { where the heater alone would hold the room }
t_heat  = tau*ln((T_on - (T_set - dT_band/2))/(T_on - (T_set + dT_band/2)))
t_cool  = tau*ln((T_set + dT_band/2 - T_a)/(T_set - dT_band/2 - T_a))
P_cycle = t_heat + t_cool                                                 { the limit cycle's period }
duty    = t_heat/P_cycle                                                  { the heater's on fraction }

{ CHECK P_cycle 267.362069960823 1e-6 }
{ CHECK duty 0.249442168473802 1e-9 }
PLOT 'Room temperature and heater state'
  kind = xy
  x = time
  y = T
END`,
  },
  {
    id: 'lab-accumulator',
    title: 'Lab — charging a hydraulic accumulator',
    description: 'A graded live lab: a gas-charged accumulator fills through a line restriction; step the supply pressure live and time the response. Run it live from the lesson panel.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lab — charging a hydraulic accumulator.

  A bladder accumulator, precharged with gas to p_0 in a volume V_0, is
  filled with oil from a supply at p_s through a line with a laminar
  resistance R_line, so the oil flow is (p_s - p)/R_line. The gas is
  compressed isothermally, p*V_g = p_0*V_0: the stiffer the gas becomes as
  it is squeezed, the less oil each bar of pressure admits, so the
  response is not a plain exponential.

  With a = p_0*V_0 and u = a*(p_s/p - 1), the time to go from p_1 to p_2 is
    t = (R_line/p_s^2)*((u_1 - u_2) + a*ln(u_1/u_2))
  which the lab's grades use as their reference.

  Source: J. Watton, Fundamentals of Fluid Power Control, Cambridge
  University Press, 2009 (accumulators). }

p_s    = 100 [bar]        { supply pressure: the lab's slider }
p_0    = 50 [bar]         { gas precharge }
V_0    = 10 [L]           { gas volume at precharge }
R_line = 5e9 [Pa-s/m^3]   { laminar line resistance }

DYNAMIC charge (method = ida, time = 0 .. 60, points = 601)
  der(V_g) = -(p_s - p)/R_line
  p = p_0*V_0/V_g
  V_g(0) = V_0
END

V_oil = V_0 - p_0*V_0/p_s   { oil stored once the accumulator reaches p_s }

{ CHECK V_oil 0.005 1e-12 }
PLOT 'Accumulator pressure'
  kind = xy
  x = time
  y = p
END`,
  },
  {
    id: 'lab-quarter-car',
    title: 'Lab — quarter-car resonance',
    description: 'A graded live lab: a quarter car rides a sinusoidal road; move the road frequency live onto the body resonance and watch the body amplitude grow on an X-Y plot. Run it live from the lesson panel.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lab — quarter-car resonance.

  A quarter car: the body m_s sits on the suspension k_s, c_s over the
  wheel m_u, which rides the road through the tyre stiffness k_t. The road
  is a sine of amplitude A_road at f_road. Its phase phi is a state, so a
  live change of frequency keeps the road continuous.

  In the steady state the body moves at the road frequency with amplitude
  H_body*A_road, where with s = j*omega
    H_body = |k_t*(k_s + c_s*s)| / |(m_s*s^2 + c_s*s + k_s)*(m_u*s^2 + c_s*s + k_s + k_t) - (c_s*s + k_s)^2|
  written out below in real arithmetic. The body resonance is near
  1.18 Hz; the wheel hop is near 10.6 Hz.

  Source: T. D. Gillespie, Fundamentals of Vehicle Dynamics, SAE, 1992,
  ch. 5 (ride). }

m_s    = 250 [kg]        { sprung (body) mass }
m_u    = 40 [kg]         { unsprung (wheel) mass }
k_s    = 16000 [N/m]     { suspension stiffness }
c_s    = 1000 [N-s/m]    { damper }
k_t    = 160000 [N/m]    { tyre stiffness }
A_road = 0.02 [m]        { road amplitude }
f_road = 0.5 [Hz]        { road frequency: the lab's slider }

DYNAMIC ride (method = ode45, time = 0 .. 24, points = 1201)
  der(phi) = 2*pi#*f_road
  y_r = A_road*sin(phi)
  der(z_s) = v_s
  der(z_u) = v_u
  m_s*der(v_s) = -k_s*(z_s - z_u) - c_s*(v_s - v_u)
  m_u*der(v_u) = k_s*(z_s - z_u) + c_s*(v_s - v_u) - k_t*(z_u - y_r)
  phi(0) = 0
  z_s(0) = 0
  z_u(0) = 0
  v_s(0) = 0
  v_u(0) = 0
END

omega  = 2*pi#*f_road
a_h    = k_s - m_s*omega^2
b_h    = omega*c_s
c_h    = k_s + k_t - m_u*omega^2
H_body = k_t*sqrt(k_s^2 + b_h^2)/sqrt((a_h*c_h - k_s^2)^2 + b_h^2*(a_h + c_h - 2*k_s)^2)   { body transmissibility }
X_body = H_body*A_road                                                                  { steady body amplitude }

{ CHECK H_body 1.19832696263027 1e-9 }
{ CHECK X_body 0.0239665392526055 1e-11 }
PLOT 'Body against road'
  kind = xy
  x = y_r
  y = z_s
END`,
  },
  {
    id: 'lab-refrigeration',
    title: 'Lab — refrigeration start-up on P-h',
    description: 'A graded live lab: an R134a unit pulls a cold room down while its states trace paths on the P-h chart; halve the compressor live and watch the room settle warmer. Run it live from the lesson panel.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lab — refrigeration start-up on P-h.

  A cold room of heat capacity C_room, with a conductance UA to the
  ambient, is pulled down from the ambient temperature by an R134a
  vapour-compression unit. The evaporator runs dT_e below the room and the
  condenser at T_c. The compressor moves a fixed volume V_dot of the
  saturated vapour it draws, so as the room cools the suction density
  falls, the mass flow falls with it, and the cooling capacity
  Q_e = m_dot*(h_1 - h_4) shrinks. The states trace their paths on the
  P-h chart as the evaporating pressure drops.

  The room settles where the capacity meets the heat gain,
    UA*(T_amb - T_ss) = V_dot*rho_1(T_ss - dT_e)*(h_1 - h_4),
  which the steady equations after the DYNAMIC block solve as the
  lab's reference.

  Source: Y. A. Cengel and M. A. Boles, Thermodynamics: An Engineering
  Approach, McGraw-Hill (the vapour-compression refrigeration cycle). }

T_amb  = 303.15 [K]        { ambient around the room }
T_c    = 313.15 [K]        { condensing temperature }
dT_e   = 10 [K]            { evaporator approach below the room }
eta_c  = 0.75              { isentropic efficiency of the compressor }
V_dot  = 0.004 [m^3/s]     { compressor displacement: the lab's slider }
UA     = 150 [W/K]         { room envelope conductance }
C_room = 2e5 [J/K]         { heat capacity of the room and its contents }

DYNAMIC pulldown (method = ida, time = 0 .. 10000, points = 1001)
  T_e   = T_room - dT_e
  P_e   = P_sat(R134a, T=T_e)
  P_c   = P_sat(R134a, T=T_c)
  h_1   = Enthalpy(R134a, T=T_e, x=1)    { saturated vapour leaving the evaporator }
  s_1   = Entropy(R134a, T=T_e, x=1)
  rho_1 = Density(R134a, T=T_e, x=1)
  h_2   = h_1 + (Enthalpy(R134a, P=P_c, s=s_1) - h_1)/eta_c
  h_3   = Enthalpy(R134a, T=T_c, x=0)    { saturated liquid leaving the condenser }
  h_4   = h_3                            { throttling }
  m_dot = V_dot*rho_1
  Q_e   = m_dot*(h_1 - h_4)
  C_room*der(T_room) = UA*(T_amb - T_room) - Q_e
  T_room(0) = T_amb
END

{ The steady room: capacity equals the envelope gain. }
T_ess   = T_ss - dT_e
h_1ss   = Enthalpy(R134a, T=T_ess, x=1)
rho_1ss = Density(R134a, T=T_ess, x=1)
h_3ss   = Enthalpy(R134a, T=T_c, x=0)
UA*(T_amb - T_ss) = V_dot*rho_1ss*(h_1ss - h_3ss)

{ CHECK T_ss 270.521849526338 1e-6 }
PLOT 'Start-up on P-h'
  kind = property
  fluid = R134a
  diagram = 'P-h'
  overlaystates = false
  x = h_1, h_2, h_3, h_4     { paired in order with y: one path per state }
  y = P_e, P_c, P_c, P_e
END`,
  },
  {
    id: 'lab-battery-windup',
    title: 'Lab — battery load step and PID anti-windup',
    description: 'A graded live lab: a PI-controlled chiller holds a battery pack until a load step saturates the valve; back-calculation stops the integrator winding up. Run it live from the lesson panel.',
    category: 'Lessons & Labs',
    text: `// frees-language: 2
{ Lab — a battery load step and PID anti-windup.

  A battery pack of heat capacity C_pack makes Q_load of heat and loses a
  little to the ambient through UA_amb. A chiller loop cools it: water
  at T_in flows at u*m_max through a plate exchanger of effectiveness
  eps, so it removes Q_c = u*m_max*cp_c*eps*(T_pack - T_in). A PI
  controller sets the valve u between 0 and 1 to hold T_set.

  When the load steps beyond what the chiller can remove, the valve
  saturates fully open and the pack climbs toward
    Q_peak = m_max*cp_c*eps*(T_hot - T_in) + UA_amb*(T_hot - T_amb).
  A plain integrator keeps integrating the error all that while (windup),
  so when the load drops it holds the valve open long after the pack is
  back at T_set and undercools it. Back-calculation feeds (u - v)/T_t
  into the integrator, which stops the windup: the smaller the tracking
  time T_t, the sooner the integrator follows the saturated valve.

  Source: K. J. Astrom and T. Hagglund, Advanced PID Control, ISA, 2006
  (integrator windup and back-calculation). }

C_pack = 20000 [J/K]       { pack heat capacity }
UA_amb = 5 [W/K]           { pack to ambient }
T_amb  = 298.15 [K]
T_in   = 288.15 [K]        { chilled water supply }
m_max  = 0.05 [kg/s]       { chilled water flow, valve fully open }
eps    = 0.6               { exchanger effectiveness }
cp_c   = Cp(Water, T=T_in, P=200000 [Pa])
Q_load = 1500 [W]          { pack heat: the lab steps it }
Q_peak = 4000 [W]          { the step the lab applies }
T_set  = 308.15 [K]        { set point }
K_p    = 2 [1/K]           { proportional gain }
T_i    = 100 [s]           { integral time }
T_t    = 20 [s]            { tracking time: the lab's slider }

{ The valve opening that holds T_set at Q_load: where the run starts. }
u_0 = (Q_load + UA_amb*(T_amb - T_set))/(m_max*cp_c*eps*(T_set - T_in))

DYNAMIC load (method = ida, time = 0 .. 2400, points = 2401)
  e   = T_pack - T_set
  v   = K_p*e + z                        { unsaturated PI output }
  u   = min(max(v, 0), 1)                { the valve }
  der(z) = K_p*e/T_i + (u - v)/T_t       { integrator with back-calculation }
  Q_c = u*m_max*cp_c*eps*(T_pack - T_in)
  C_pack*der(T_pack) = Q_load - Q_c + UA_amb*(T_amb - T_pack)
  T_pack(0) = T_set
  z(0) = u_0
END

{ The pack with the valve fully open under Q_peak. }
Q_peak = m_max*cp_c*eps*(T_hot - T_in) + UA_amb*(T_hot - T_amb)

{ CHECK u_0 0.577028520203865 1e-9 }
{ CHECK T_hot 319.15034603893 1e-6 }
PLOT 'Pack temperature'
  kind = xy
  x = time
  y = T_pack
END`,
  },
  {
    id: 'ideal-rankine',
    title: 'Ideal Rankine Steam Power Cycle',
    description: 'Analyses an ideal Rankine cycle, computing state enthalpies, work, and efficiency.',
    category: 'Thermodynamics',
    text: `{ Ideal Rankine Steam Power Cycle }
{ No source is cited. Hand check from steam-table values (8 MPa, 500 C: h =
  3399.5 kJ/kg, s = 6.7266 kJ/kg-K; 10 kPa saturated liquid: h_f = 191.81
  kJ/kg, v_f = 0.00101 m^3/kg, s_f = 0.6492 and s_fg = 7.4996 kJ/kg-K) gives
  h2 = 2320.8 kJ/kg, h4 = 200.78 kJ/kg, eta_th = 33.44 % and m_dot = 9.35
  kg/s. The turbine and pump are 85 % and 90 % efficient, so despite its
  title the cycle is not ideal. }
P_high = 8000 [kPa]
P_low = 10 [kPa]
T_boiler = 500 [C]
eta_turb = 0.85
eta_pump = 0.90
W_dot_net = 10000 [kW]

h1 = Enthalpy(Water, P=P_high, T=T_boiler)
s1 = Entropy(Water, P=P_high, T=T_boiler)
s_2s = s1
h_2s = Enthalpy(Water, P=P_low, s=s_2s)
h2 = h1 - eta_turb * (h1 - h_2s)
h3 = Enthalpy(Water, P=P_low, x=0)
v3 = Volume(Water, P=P_low, x=0)
h_4s = Enthalpy(Water, P=P_high, s=Entropy(Water, P=P_low, x=0))
h4 = h3 + (h_4s - h3) / eta_pump

w_turb = h1 - h2
w_pump = h4 - h3
q_boiler = h1 - h4
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100
W_dot_net = m_dot * w_net
{ CHECK h2 2320617.6602863567 3 }
{ CHECK h4 200759.7214069614 3e-1 }
{ CHECK eta_th 33.448261305976395 4e-5 }
{ CHECK m_dot 9.346491321944612 1e-5 }`,
  },
  {
    id: 'reheat-rankine',
    title: 'Reheat Rankine Cycle with Moisture Limit',
    description: 'A reheat Rankine cycle where the condenser pressure is itself an unknown, fixed by the requirement that turbine-exit moisture not exceed 5%. frees finds it implicitly from the quality constraint.',
    category: 'Thermodynamics',
    text: `{ Reheat Rankine Cycle with Moisture Limit }
{ Verified against the textbook: condenser pressure 9.73 kPa, net power 10.2
  MW, thermal efficiency 36.9%. }
{ Find the condenser pressure that limits turbine-exit moisture to 5%,
  then the net power output and thermal efficiency. }
m_dot = 7.7 [kg/s]
P[3] = 12500 [kPa]   { HP turbine inlet }
T[3] = 550 [C]
P[4] = 2000 [kPa]    { Reheat pressure }
T[5] = 450 [C]       { Reheat temperature }
P[5] = P[4]
eta_turb = 0.85
eta_pump = 0.90
x[6] = 0.95          { Max 5% moisture at LP turbine exit }

{ State 3: HP turbine inlet }
h[3] = Enthalpy(Water, P=P[3], T=T[3])
s[3] = Entropy(Water, P=P[3], T=T[3])

{ State 4: HP turbine exit }
h_4s = Enthalpy(Water, P=P[4], s=s[3])
h[4] = h[3] - eta_turb * (h[3] - h_4s)

{ State 5: reheater exit }
h[5] = Enthalpy(Water, P=P[5], T=T[5])
s[5] = Entropy(Water, P=P[5], T=T[5])

{ State 6: LP turbine exit; the quality constraint fixes P[6] }
h_6s = Enthalpy(Water, P=P[6], s=s[5])
h[6] = h[5] - eta_turb * (h[5] - h_6s)
h[6] = Enthalpy(Water, P=P[6], x=x[6])

{ State 1: condenser exit (saturated liquid) }
P[1] = P[6]                  { condenser pressure, so state 1 plots on the diagram }
h[1] = Enthalpy(Water, P=P[6], x=0)
v[1] = Volume(Water, P=P[6], x=0)

{ State 2: pump exit }
P[2] = P[3]                  { pump discharges to boiler pressure }
w_pump = v[1] * (P[3] - P[6]) / eta_pump
h[2] = h[1] + w_pump

{ Energy balances }
q_in = (h[3] - h[2]) + (h[5] - h[4])
w_turb = (h[3] - h[4]) + (h[5] - h[6])
w_net = w_turb - w_pump
W_dot_net = m_dot * w_net
eta_th = w_net / q_in * 100

{ Plot the cycle on a temperature-entropy diagram (see "Plots in Code"). }
PLOT 'Reheat Rankine T-s'
  kind = property
  fluid = Water
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END

{ T-s diagram of the reheat Rankine cycle appears in the Plots window }
{ CHECK P[6] 9730.596178746808 1e-2 }
{ CHECK W_dot_net 10242150.49138011 20 }
{ CHECK eta_th 36.909459276375095 4e-5 }`,
  },
  {
    id: 'reheat-regen-rankine',
    title: 'Ideal Reheat-Regenerative Rankine Cycle, English Units',
    description: 'One reheater and two open feedwater heaters with extractions at 250 and 40 psia. All inputs are in English units (psia, F, Btu/s); frees converts them to SI automatically and solves the two feedwater-heater mass balances simultaneously.',
    category: 'Thermodynamics',
    text: `{ Ideal Reheat-Regenerative Rankine Cycle, English Units }
{ With 4e5 Btu/s of boiler heat input the cycle delivers about 200 MW at
  47.4% thermal efficiency. }
{ One reheater and two open feedwater heaters; everything isentropic.
  English-unit inputs are converted to SI automatically. Find the boiler
  flow rate, net power and thermal efficiency. }
P[7] = 1500 [psia]   { HP turbine inlet }
T[7] = 1100 [F]
P[8] = 250 [psia]    { Extraction to FWH II }
P[9] = 140 [psia]    { HP exit / reheater }
T[10] = 1000 [F]     { Reheat temperature }
P[11] = 40 [psia]    { Extraction to FWH I }
P[12] = 1 [psia]     { Condenser }
Q_dot_in = 400000 [Btu/s]

{ HP turbine: 7 -> 8 (extraction) -> 9 (to reheater), isentropic }
h[7] = Enthalpy(Water, P=P[7], T=T[7])
s[7] = Entropy(Water, P=P[7], T=T[7])
h[8] = Enthalpy(Water, P=P[8], s=s[7])
h[9] = Enthalpy(Water, P=P[9], s=s[7])

{ Reheater and LP turbine: 10 -> 11 (extraction) -> 12, isentropic }
h[10] = Enthalpy(Water, P=P[9], T=T[10])
s[10] = Entropy(Water, P=P[9], T=T[10])
h[11] = Enthalpy(Water, P=P[11], s=s[10])
h[12] = Enthalpy(Water, P=P[12], s=s[10])

{ Condensate and feedwater path: saturated liquid out of each FWH }
h[1] = Enthalpy(Water, P=P[12], x=0)
v[1] = Volume(Water, P=P[12], x=0)
h[2] = h[1] + v[1] * (P[11] - P[12])
h[3] = Enthalpy(Water, P=P[11], x=0)
v[3] = Volume(Water, P=P[11], x=0)
h[4] = h[3] + v[3] * (P[8] - P[11])
h[5] = Enthalpy(Water, P=P[8], x=0)
v[5] = Volume(Water, P=P[8], x=0)
h[6] = h[5] + v[5] * (P[7] - P[8])

{ Feedwater heater balances (per kg of boiler flow):
  y extracted at 250 psia, z at 40 psia }
y * h[8] + (1 - y) * h[4] = h[5]
z * h[11] + (1 - y - z) * h[2] = (1 - y) * h[3]

{ Boiler heat input fixes the mass flow rate }
q_in = (h[7] - h[6]) + (1 - y) * (h[10] - h[9])
Q_dot_in = m_dot * q_in

{ Net power and efficiency }
w_turb = (h[7] - h[8]) + (1 - y) * (h[8] - h[9]) + (1 - y) * (h[10] - h[11]) + (1 - y - z) * (h[11] - h[12])
w_pumps = (1 - y - z) * (h[2] - h[1]) + (1 - y) * (h[4] - h[3]) + (h[6] - h[5])
w_net = w_turb - w_pumps
W_dot_net = m_dot * w_net
eta_th = w_net / q_in * 100
{ CHECK m_dot 128.15098942601617 2e-4 }
{ CHECK W_dot_net 200120912.86763355 300 }
{ CHECK eta_th 47.41950683716818 5e-5 }`,
  },
  {
    id: 'cogeneration-plant',
    title: 'Cogeneration Plant with Regeneration',
    description: '35% of the turbine flow is extracted at 1.6 MPa; one part feeds an open feedwater heater, the rest a process heater. The open-FWH energy balance determines the split.',
    category: 'Thermodynamics',
    text: `{ Cogeneration Plant with Regeneration }
{ Verified against the textbook: boiler mass flow rate 29.1 kg/s for 25 MW
  of net power. }
{ 35% of the turbine flow is extracted at 1.6 MPa; part heats the open
  feedwater heater, the rest serves the process heater. Isentropic
  turbine and pumps. Find the boiler flow rate for 25 MW net power. }
P[6] = 9000 [kPa]
T[6] = 400 [C]
P[7] = 1600 [kPa]    { Extraction pressure }
P[8] = 10 [kPa]      { Condenser pressure }
f_ext = 0.35         { Extracted fraction of the boiler flow }
W_dot_net = 25000 [kW]

{ State 6: turbine inlet }
h[6] = Enthalpy(Water, P=P[6], T=T[6])
s[6] = Entropy(Water, P=P[6], T=T[6])

{ States 7 and 8: isentropic expansion }
h[7] = Enthalpy(Water, P=P[7], s=s[6])
h[8] = Enthalpy(Water, P=P[8], s=s[6])

{ State 1: condenser exit; pump I to extraction pressure }
h[1] = Enthalpy(Water, P=P[8], x=0)
v[1] = Volume(Water, P=P[8], x=0)
w_pI = v[1] * (P[7] - P[8])
h[2] = h[1] + w_pI

{ States 3 and 9: FWH and process heater both yield sat. liquid at 1.6 MPa }
h[3] = Enthalpy(Water, P=P[7], x=0)
v[3] = Volume(Water, P=P[7], x=0)

{ Open FWH balance: y of the boiler flow condenses the feedwater stream }
(1 - f_ext) * h[2] + y * h[7] = (1 - f_ext + y) * h[3]

{ Mixing of FWH exit and process-heater drain is at the same state,
  then pump II raises it to boiler pressure }
w_pII = v[3] * (P[6] - P[7])
h[5] = h[3] + w_pII

{ Specific work per kg of boiler flow }
w_turb = (h[6] - h[7]) + (1 - f_ext) * (h[7] - h[8])
w_pumps = (1 - f_ext) * w_pI + w_pII
w_net = w_turb - w_pumps
W_dot_net = m_dot * w_net

{ Process heat delivered }
Q_dot_process = m_dot * (f_ext - y) * (h[7] - h[3])
{ CHECK m_dot 29.068347495404108 3e-5 }
{ CHECK Q_dot_process 6475691.737409691 7 }`,
  },
  {
    id: 'binary-geothermal',
    title: 'Binary Geothermal Plant with Isobutane',
    description: 'A binary-cycle plant where geothermal brine at 160 C drives a Rankine cycle on isobutane. The problem supplies the isobutane properties directly, so this is a pure energy-balance system.',
    category: 'Thermodynamics',
    text: `{ Binary Geothermal Power Plant with Isobutane }
{ Results: turbine isentropic efficiency 78.8%, net power 22.6 MW, thermal
  efficiency 13.7%. }
{ Property values are given in the problem statement. Find the turbine
  isentropic efficiency, net power and thermal efficiency. }
m_dot_geo = 555.9 [kg/s]
T_geo_in = 160 [C]
T_geo_out = 90 [C]
cp_geo = 4.258 [kJ/kg-K]
P[2] = 3250 [kPa]    { Turbine inlet pressure (pump exit) }
P[1] = 410 [kPa]     { Condenser pressure }
eta_pump = 0.90

{ Given isobutane properties }
h[1] = 273.01 [kJ/kg]    { Condenser exit, saturated liquid }
v[1] = 0.001842 [m^3/kg]
h[3] = 761.54 [kJ/kg]    { Turbine inlet }
h[4] = 689.74 [kJ/kg]    { Turbine exit, actual }
h_4s = 670.40 [kJ/kg]    { Turbine exit, isentropic }

{ (a) Turbine isentropic efficiency }
eta_turb = (h[3] - h[4]) / (h[3] - h_4s)

{ Pump work and heat-exchanger inlet state }
w_pump = v[1] * (P[2] - P[1]) / eta_pump
h[2] = h[1] + w_pump

{ Heat picked up from the geothermal brine }
Q_dot_in = m_dot_geo * cp_geo * (T_geo_in - T_geo_out)
Q_dot_in = m_dot_iso * (h[3] - h[2])

{ (b) Net power and (c) thermal efficiency }
W_dot_turb = m_dot_iso * (h[3] - h[4])
W_dot_pump = m_dot_iso * w_pump
W_dot_net = W_dot_turb - W_dot_pump
eta_th = W_dot_net / Q_dot_in * 100
{ CHECK eta_turb 0.7877989905639675 8e-7 }
{ CHECK W_dot_net 22650031.64692445 30 }
{ CHECK eta_th 13.669997715710034 2e-5 }`,
  },
  {
    id: 'brayton-irreversible',
    title: 'Simple Brayton Cycle with Irreversibilities',
    description: 'A gas-turbine plant between 100 and 1600 kPa with compressor and turbine efficiencies of 85% and 88%. The turbine inlet temperature is unknown and recovered from the known exhaust temperature.',
    category: 'Thermodynamics',
    text: `{ Simple Brayton Cycle with Irreversibilities }
{ Verified against the textbook: net power 6488 kW, back work ratio 0.511,
  thermal efficiency 37.8%. The model gives 6484 kW; the book's 6488 kW
  carries its rounded intermediates. }
{ Air enters the compressor at 40 C and 850 m^3/min; the turbine exhausts
  at 650 C. Find net power, back work ratio and thermal efficiency. }
P[1] = 100 [kPa]
P[2] = 1600 [kPa]
T[1] = 40 [C]
T[4] = 650 [C]       { Turbine exit temperature }
V_dot = 850 [m^3/min]
eta_C = 0.85
eta_T = 0.88
cp = 1.108 [kJ/kg-K]
cv = 0.821 [kJ/kg-K]
k = 1.35

{ Mass flow rate from ideal gas at compressor inlet }
R = cp - cv
rho[1] = P[1] / (R * T[1])
m_dot = rho[1] * V_dot

{ Compressor }
T_2s = T[1] * (P[2] / P[1])^((k - 1) / k)
w_C = cp * (T_2s - T[1]) / eta_C
T[2] = T[1] + w_C / cp

{ Turbine: exit temperature known, inlet T[3] unknown }
T_4s = T[3] * (P[1] / P[2])^((k - 1) / k)
T[3] - T[4] = eta_T * (T[3] - T_4s)
w_T = cp * (T[3] - T[4])

{ Performance }
w_net = w_T - w_C
W_dot_net = m_dot * w_net
bwr = w_C / w_T
    q_in = cp * (T[3] - T[2])
    eta_th = w_net / q_in * 100
{ CHECK W_dot_net 6484035.50249186 7 }
{ CHECK bwr 0.510751801409789 6e-7 }
{ CHECK eta_th 37.83470895073085 4e-5 }`,
  },
  {
    id: 'brayton-cold-air-standard',
    title: 'Simple Brayton Cycle, Cold-Air-Standard',
    description: 'An air-standard Brayton cycle with a pressure ratio of 8, compressor and turbine isentropic efficiencies of 80% and 85%, and a turbine inlet of 1300 K. The actual compressor and turbine exit temperatures (T2a, T4a) are recovered implicitly from the efficiency definitions rather than being computed by hand.',
    category: 'Thermodynamics',
    text: `{ Simple Brayton Cycle, Cold-Air-Standard }
{ Verified against the textbook: T2a = 604.3 K, T4a = 805.0 K, net work
  191.7 kJ/kg, back work ratio 0.615, thermal efficiency 27.4%, heat rate 12
  450 Btu/kWh. }
{ Air enters the compressor at 300 K and 100 kPa, is compressed to 8 times
  that pressure, then heated to 1300 K before expanding back to the inlet
  pressure. Compressor and turbine isentropic efficiencies are 80% and 85%.
  Find the state temperatures, works, back work ratio, thermal efficiency
  and heat rate. Cold-air-standard: constant cp and k. }
T1 = 300 [K]
P1 = 100 [kPa]
rp = 8
T3 = 1300 [K]
etaC = 0.80
etaT = 0.85
k = 1.4
cp = 1.005 [kJ/kg-K]

{ Pressures through the cycle }
P2 = rp * P1
P3 = P2
P4 = P1

{ Isentropic compressor exit and actual exit (T2a is the unknown) }
T2s = T1 * rp^((k - 1) / k)
etaC = (T2s - T1) / (T2a - T1)

{ Isentropic turbine exit and actual exit (T4a is the unknown) }
T4s = T3 / rp^((k - 1) / k)
etaT = (T3 - T4a) / (T3 - T4s)

{ Work and heat transfers }
w_comp = cp * (T2a - T1)
w_turb = cp * (T3 - T4a)
w_net = w_turb - w_comp
q_in = cp * (T3 - T2a)

{ Performance metrics }
r_bw = w_comp / w_turb
eta_th = w_net / q_in * 100
heat_rate = 3412 / (eta_th / 100)
{ CHECK T2a 604.2927481979299 7e-4 }
{ CHECK T4a 805.0094563047815 9e-4 }
{ CHECK w_net 191651.28447477508 2e-1 }
{ CHECK r_bw 0.614744568504914 7e-7 }
{ CHECK eta_th 27.410637880132732 3e-5 }
{ CHECK heat_rate 12447.721993631612 2e-2 }`,
  },
  {
    id: 'auto-gas-turbine',
    title: 'Automotive Gas Turbine with Regenerator',
    description: 'An isentropic Brayton cycle with a regenerator whose cold stream leaves 10 C cooler than the turbine exhaust entering it. Find the heat addition and rejection rates for 115 kW of net power.',
    category: 'Thermodynamics',
    text: `{ Automotive Gas Turbine with Regenerator }
{ Verified against the textbook: heat addition 240 kW, heat rejection 125
  kW. }
{ Isentropic compressor and turbine; the cold stream leaves the
  regenerator 10 C cooler than the turbine exhaust entering it. }
P[1] = 100 [kPa]
T[1] = 30 [C]
r_p = 8
T[4] = 800 [C]       { Maximum cycle temperature (turbine inlet) }
W_dot_net = 115 [kW]
cp = 1.005 [kJ/kg-K]
k = 1.4

{ Compressor (isentropic) }
T[2] = T[1] * r_p^((k - 1) / k)

{ Turbine (isentropic) }
T[5] = T[4] * (1 / r_p)^((k - 1) / k)

{ Regenerator: cold-side exit 10 C below the hot-side inlet }
T[3] = T[5] - 10

{ Work and heat rates }
w_net = cp * (T[4] - T[5]) - cp * (T[2] - T[1])
W_dot_net = m_dot * w_net
Q_dot_in = m_dot * cp * (T[4] - T[3])
Q_dot_out = Q_dot_in - W_dot_net
{ CHECK Q_dot_in 240414.36747691248 3e-1 }
{ CHECK Q_dot_out 125414.36747691248 2e-1 }`,
  },
  {
    id: 'brayton-regen-variable-cp',
    title: 'Brayton Cycle with Regeneration and Variable Specific Heats',
    description: 'Instead of assuming constant specific heats, this model uses real-gas air properties (Enthalpy/Entropy of Air) for the compressor, turbine and regenerator, exactly like the air-table solution in the book.',
    category: 'Thermodynamics',
    text: `{ Brayton Cycle with Regeneration, Variable Specific Heats }
{ Verified against the textbook: turbine exit temperature 783 K, net work
  108 kJ/kg, thermal efficiency 22.5%. }
{ Real-gas air properties replace the constant-cp assumption. Find the
  turbine exit temperature, net work and thermal efficiency. }
P[1] = 100 [kPa]
T[1] = 310 [K]
r_p = 7
P[2] = P[1] * r_p
T[3] = 1150 [K]
eta_C = 0.75
eta_T = 0.82
epsilon = 0.65       { Regenerator effectiveness }

{ Compressor }
h[1] = Enthalpy(Air, T=T[1], P=P[1])
s[1] = Entropy(Air, T=T[1], P=P[1])
h_2s = Enthalpy(Air, P=P[2], s=s[1])
w_C = (h_2s - h[1]) / eta_C
h[2] = h[1] + w_C
T[2] = Temperature(Air, P=P[2], h=h[2])

{ Turbine }
h[3] = Enthalpy(Air, T=T[3], P=P[2])
s[3] = Entropy(Air, T=T[3], P=P[2])
h_4s = Enthalpy(Air, P=P[1], s=s[3])
w_T = eta_T * (h[3] - h_4s)
h[4] = h[3] - w_T
P[4] = P[1]                  { turbine exits to inlet pressure }
T[4] = Temperature(Air, P=P[1], h=h[4])

{ Regenerator }
P[5] = P[2]                  { regenerator cold side at compressor-discharge pressure }
h[5] = h[2] + epsilon * (h[4] - h[2])

{ Performance }
q_in = h[3] - h[5]
w_net = w_T - w_C
eta_th = w_net / q_in * 100

{ Plot the cycle on a temperature-entropy diagram (see "Plots in Code"). }
PLOT 'Brayton T-s'
  kind = property
  fluid = Air
  diagram = 'T-s'
  overlaystates = true
  connectstates = true
END

{ T-s diagram of the regenerative Brayton cycle appears in the Plots window }
{ CHECK T[4] 782.7286641026278 8e-4 }
{ CHECK w_net 108138.54048526031 2e-1 }
{ CHECK eta_th 22.471020244581286 3e-5 }`,
  },
]

/** What an "Open in Editor" handoff from Help loads: the example it names,
 *  so a lesson or lab opens with its panel, or else a documentation snippet.
 *  `null` for a malformed or stale (> 5 min) handoff, a leftover rather than
 *  intent. A named example must still carry its own text. */
export function exampleFromHandoff(raw: string, now: number): Example | null {
  try {
    const snip = JSON.parse(raw)
    if (typeof snip?.text !== 'string' || !snip.text.trim()) return null
    if (typeof snip.ts !== 'number' || now - snip.ts > 5 * 60_000) return null
    return EXAMPLES.find((e) => e.id === snip.example && e.text === snip.text) ?? {
      id: 'doc-snippet',
      title: String(snip.title || 'Documentation example'),
      description: 'Loaded from the documentation',
      category: 'Documentation',
      text: snip.text,
    }
  } catch {
    return null
  }
}

/** The document new/blank workspaces start from. */
