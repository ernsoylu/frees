// Curated, ready-to-solve example documents surfaced to new users (the File
// menu "Open Example", the command palette, and the empty Solution-panel
// shortcuts). Each `text` has been verified against the backend with zero unit
// warnings. Algebraic and ODE (Integral) examples solve directly with Solve
// (F2); the PARAMETRIC time-sweep examples are intentionally underspecified by
// the swept column and are run from the Tables tab via "Solve Table" — each
// example's own header comment says which.
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
    id: 'pump-sizing',
    title: 'Pump Sizing',
    description: 'Hydraulic and shaft power from flow rate, head, and efficiency.',
    category: 'Mechanical',
    featured: true,
    text: `# Pump Sizing
{ A worked example — edit any value and press Solve (F2).
  Equations may be written in any order; frees figures out
  the calculation order for you. }

rho = 1000 [kg/m^3]      { water density }
g = 9.81 [m/s^2]
Q_flow = 0.02 [m^3/s]    { volumetric flow rate }
H = 25 [m]               { pump head }
eta = 0.7                { pump efficiency }

P_hydraulic = rho * g * Q_flow * H   { hydraulic power, in watts }
P_shaft = P_hydraulic / eta          { required shaft power }`,
  },
  {
    id: 'projectile-motion',
    title: 'Projectile Motion',
    description: 'Range, flight time, and peak height of a launched projectile.',
    category: 'Mechanics',
    featured: true,
    text: `# Projectile Motion
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
h_max = vy^2 / (2 * g)   { peak height }`,
  },
  {
    id: 'heat-conduction',
    title: 'Heat Conduction',
    description: "Steady 1-D conduction through a wall (Fourier's law).",
    category: 'Heat Transfer',
    featured: true,
    text: `# Heat Conduction Through a Wall
{ Steady 1-D conduction (Fourier's law). }
k = 0.8 [W/m-K]        { thermal conductivity }
A = 12 [m^2]           { wall area }
L = 0.25 [m]           { wall thickness }
T_in = 21 [C]
T_out = -5 [C]
Q = k * A * (T_in - T_out) / L   { heat loss rate, watts }`,
  },
  {
    id: 'ideal-gas',
    title: 'Ideal Gas Law',
    description: 'Mass of air in a rigid tank — note the implicit equation.',
    category: 'Thermodynamics',
    featured: true,
    text: `# Ideal Gas Law
{ Mass of air in a rigid tank. Note the implicit equation:
  you do not have to write "m = ...". }
P = 500 [kPa]
Vol = 0.05 [m^3]
T = 25 [C]
R = 0.287 [kJ/kg-K]    { gas constant for air }
P * Vol = m * R * T    { ideal gas equation }`,
  },
  {
    id: 'dc-circuit',
    title: 'DC Circuit',
    description: 'Current and power dissipation from Ohm’s law.',
    category: 'Electrical',
    featured: true,
    text: `# DC Circuit — Power Dissipation
V = 12 [V]
R = 220 [ohm]
I = V / R       { current }
P = V * I       { power dissipated }`,
  },
  {
    id: 'rankine-cycle',
    title: 'Rankine Cycle',
    description: 'Ideal steam power cycle efficiency using CoolProp properties.',
    category: 'Thermodynamics',
    featured: true,
    text: `# Rankine Cycle (Steam)
{ Ideal steam Rankine cycle using CoolProp water properties. }
P_boiler = 8000 [kPa]
P_cond = 10 [kPa]

{ State 1: saturated liquid leaving the condenser }
h1 = Enthalpy(Water, P=P_cond, x=0)
v1 = Volume(Water, P=P_cond, x=0)

{ Pump (state 1 -> 2) }
w_pump = v1 * (P_boiler - P_cond)
h2 = h1 + w_pump

{ State 3: boiler exit (superheated) }
h3 = Enthalpy(Water, P=P_boiler, T=480 [C])
s3 = Entropy(Water, P=P_boiler, T=480 [C])

{ State 4: turbine exit (isentropic, s4 = s3) }
h4 = Enthalpy(Water, P=P_cond, s=s3)

{ Performance }
q_in = h3 - h2
w_turb = h3 - h4
eta_th = (w_turb - w_pump) / q_in`,
  },
  {
    id: 'cengel-thermodynamics',
    title: 'Çengel Thermodynamics Compliance',
    description: ' Nelson-Obert compressibility and diffuser stagnation properties from Çengel.',
    category: 'Thermodynamics',
    text: `# Çengel Thermodynamics Compliance
{ Verification problems from Çengel's Thermodynamics: An Engineering Approach.
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
P0_air = StagnationPres(P_air, T_air, T0_air, k_air)`,
  },
  {
    id: 'state-tables-multifluid',
    title: 'Multi-Fluid State Tables',
    description: 'Two fluid circuits grouped with explicit, fluid-aware STATE TABLE blocks.',
    category: 'Thermodynamics',
    text: `# Multi-Fluid State Tables
{ Two circuits in one model: a steam loop and an R134a loop. Each
  STATE TABLE groups its own state points and declares its FLUID, so
  the Fluid States window shows one fluid-aware table per circuit and
  property look-ups never mix fluids — a Water state 1 and an R134a
  state 1 stay separate. Press Solve (F2), then click
  "Fill Missing Values" in the Fluid States window to complete each
  state (s, v, x, ...) from CoolProp using the right fluid. }

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
END`,
  },
  {
    id: 'tank-draining',
    title: 'Tank Draining (ODE)',
    description: 'First-order ODE via Integral — Torricelli draining of a tank.',
    category: 'Fluids',
    featured: true,
    text: `# Tank Draining (Torricelli) — first-order ODE
{ Water height h in a tank emptying through a small orifice obeys
  dh/dt = -(a/A)*sqrt(2*g*h).  Press Solve (F2).

  How the ODE is written: frees integrates an ODE only when the
  integrand references the integral's OWN result, and that result
  starts at 0. So we integrate the DROP from the initial level and
  rebuild h = h0 - drop. Integration limits must be plain numbers
  (here 0 to 60 seconds). }
g = 9.81 [m/s^2]
A_tank = 1.0 [m^2]        { tank cross-section }
a_orifice = 0.0015 [m^2]  { orifice area }
h0 = 2.0 [m]              { initial water height }

drop = Integral((a_orifice/A_tank)*sqrt(2*g*(h0 - drop)), tau, 0, 60)
h = h0 - drop            { water height after 60 s }`,
  },
  {
    id: 'newton-cooling',
    title: "Newton's Cooling (ODE)",
    description: 'First-order ODE via Integral — a hot body cooling to ambient.',
    category: 'Heat Transfer',
    text: `# Newton's Law of Cooling — first-order ODE
{ A hot object relaxing toward ambient obeys
  dT/dt = -k*(T - T_inf).  Press Solve (F2).

  The Integral ODE feedback only works when the integrand
  references its own result (which starts at 0), so we integrate
  the temperature DROP and rebuild T = T0 - drop. Limits must be
  plain numbers (0 to 30 seconds). }
k = 0.05 [1/s]           { cooling constant }
T_inf = 20 [C]           { ambient temperature }
T0 = 90 [C]              { initial temperature }

drop = Integral(k*(T0 - drop - T_inf), tau, 0, 30)
T = T0 - drop            { temperature after 30 s }`,
  },
  {
    id: 'projectile-trajectory',
    title: 'Projectile Trajectory (table)',
    description: 'Parametric time sweep — full flight path sampled over time.',
    category: 'Mechanics',
    featured: true,
    text: `# Projectile Trajectory (parametric time sweep)
{ The whole flight path, sampled in time. This uses a PARAMETRIC
  table, so do NOT use the main Solve — open the Tables tab and
  click "Solve Table". The base system is underspecified by one on
  purpose: t is the swept column the table fills in.

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
END`,
  },
  {
    id: 'damped-oscillator',
    title: 'Damped Oscillator (table)',
    description: 'Parametric time sweep — free vibration of a mass-spring-damper.',
    category: 'Mechanics',
    text: `# Damped Harmonic Oscillator (parametric time sweep)
{ Free vibration of a mass-spring-damper, released from x0 at rest,
  sampled in time. PARAMETRIC table: open the Tables tab and click
  "Solve Table" (not the main Solve). Then chart x vs time, adding
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
END`,
  },
  {
    id: 'karman-rocket',
    title: 'Sounding Rocket to the Kármán Line',
    description: 'Sizes a CH4/LOX rocket to loft a 10 kg payload to 100 km — combustion, Isp, and an implicit mass/Δv solve.',
    category: 'Aerospace',
    text: `# Sounding Rocket to the Kármán Line
{ A single-stage methane / liquid-oxygen rocket sized to carry a 10 kg
  payload to the Karman line (100 km), then release it at apogee.

  This shows off frees end to end: built-in constants (g#, R#), the
  chemistry functions (MolarMass, HeatingValue), units throughout, and an
  *implicit* solve — the propellant mass is whatever makes the apogee come
  out to 100 km, and Newton's method finds it. Edit any input and Solve (F2). }

## Mission
g0 = g#                  { standard gravity }
h_target = 100 [km]      { Karman line — the closing condition below }
m_payload = 10 [kg]      { released at apogee }

## Propellant: methane (CH4) + liquid oxygen (O2)
MM_fuel = MolarMass(CH4)            { kg/mol }
MM_ox = MolarMass(O2)
OF_stoich = 2 * MM_ox / MM_fuel     { CH4 + 2 O2 -> CO2 + 2 H2O, so O/F = 4.0 }
OF = 3.4                            { run slightly fuel-rich, as real engines do }
f_fuel = 1 / (1 + OF)               { fuel fraction of the propellant mass }

## Combustion -> chamber temperature
LHV = HeatingValue(CH4, 'LHV')      { lower heating value of the fuel [J/kg] }
eta_comb = 0.90                     { combustion efficiency (dissociation, losses) }
cp_gas = 3000 [J/kg-K]              { mean specific heat of the hot products }
T_ref = 298 [K]
T_c = T_ref + eta_comb * LHV * f_fuel / cp_gas    { adiabatic-ish chamber temp }

## Exhaust and specific impulse (ideal nozzle)
MM_exhaust = (MolarMass(CO2) + 2 * MolarMass('H2O')) / 3   { mean product molar mass }
R_gas = R# / MM_exhaust             { specific gas constant of the exhaust }
gamma = 1.20
P_c = 70 [bar]                      { chamber pressure }
P_e = 0.5 [bar]                     { nozzle exit pressure }
v_e = sqrt( 2*gamma/(gamma - 1) * R_gas * T_c * (1 - (P_e/P_c)^((gamma - 1)/gamma)) )
Isp = v_e / g0                      { specific impulse [s] }

## Vehicle mass (m_prop is solved from the apogee condition)
f_struct = 0.12                     { tank + structure, as a fraction of propellant }
m_struct = f_struct * m_prop
m0 = m_payload + m_struct + m_prop  { lift-off mass }
m_burnout = m_payload + m_struct    { mass at burnout (payload still aboard) }
MR = m0 / m_burnout                 { mass ratio }

## Thrust and lift-off
TWR = 2.0                           { thrust-to-weight at lift-off (> 1 to fly) }
F_thrust = TWR * m0 * g0
mdot = F_thrust / v_e               { propellant mass flow }
t_burn = m_prop / mdot

## Powered ascent (gravity + drag losses, decreasing mass)
{ Integrating v(t) = v_e ln(m0/m(t)) - g0 t over the burn gives, in closed form: }
dv_losses = 500 [m/s]               { lumped aerodynamic drag + steering losses }
v_burnout = v_e * ln(MR) - g0 * t_burn - dv_losses
h_powered = v_e * t_burn - (v_e * m_burnout / mdot) * ln(MR) - 0.5 * g0 * t_burn^2

## Coast to apogee and close the loop
h_coast = v_burnout^2 / (2 * g0)    { ballistic coast after burnout }
h_apogee = h_powered + h_coast
h_apogee = h_target                 { <-- the equation that sizes the rocket }

## Propellant split (load this much into the tanks)
m_fuel = f_fuel * m_prop
m_oxidizer = OF * m_fuel`,
  },
  {
    id: 'newton-cooling-transient',
    title: 'Newton Cooling (Transient)',
    description: 'A DYNAMIC ODE block integrates a cooling curve and reports peak/final temperature.',
    category: 'Heat Transfer',
    text: `# Newton Cooling — Transient (DYNAMIC)
{ A first-order ODE solved over time. The DYNAMIC ... END block is a parallel
  path to the analytic solver: a variable is a STATE when a der(X) appears, with
  one der(X) = ... and one initial condition X(0) = ...  The block produces an
  ODE Table (see the Tables window) you can plot (Plots window: x = time, y = T).

  Note: temperature is named T, which is case-insensitively the same as a time
  variable t — so this block names time "time" in the header. }

k     = 0.012     { cooling rate constant [1/s] }
T_inf = 22        { ambient temperature }

DYNAMIC cooling (method = ode45, time = 0 .. 300, points = 200, rtol = 1e-8)
  der(T) = -k * (T - T_inf)      { Newton's law of cooling }
  T(0)   = 90                    { initial temperature }
  rate   = -der(T)               { algebraic auxiliary -> an output column }
END

## Read transient results back into the analytic solution
T_final = FinalValue('T')        { temperature at the end of the run }
T_peak  = MaxValue('T')          { hottest point (here, the start) }
t_half  = TimeAt('T', 56)        { time to reach 56 degrees }`,
  },
  {
    id: 'transient-heat-rod',
    title: 'Transient Heat Rod (method of lines)',
    description: 'A 1-D heat-conduction PDE discretized into N nodes, integrated as a stiff ODE system.',
    category: 'Heat Transfer',
    text: `# Transient 1-D Heat Conduction (method of lines)
{ The heat equation dT/dt = alpha d2T/dx2 is discretized into N nodes; the FOR
  loop generates one der(T[i]) per interior node and the array / FOR machinery
  expands it into a coupled stiff ODE system. Use the stiff solver ode23s. The
  ODE Table holds every node vs time — plot t[2], t[3], … against time to watch
  the rod heat up toward the linear steady profile. }

N = 6
L = 1
dx = L / (N - 1)
alpha = 0.05       { thermal diffusivity }
T_left  = 100      { boundary node 1 }
T_right = 0        { boundary node N }
T_init  = 0        { interior starts cold }

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

## Steady-state check (linear profile T[i] = 100 (N-i)/(N-1))
T_mid_final = FinalValue('t[4]')`,
  },
  {
    id: 'damped-oscillator-ode',
    title: 'Damped Oscillator (2-state)',
    description: 'A true two-state ODE (position + velocity) sharing one step cursor.',
    category: 'Mechanics',
    text: `# Damped Harmonic Oscillator (DYNAMIC)
{ A mass-spring-damper as a coupled two-state ODE:
    x' = v ,  v' = -(c/m) v - (k/m) x
  Both states advance on one shared step cursor — the multi-state capability the
  single-state Integral() lacks. Plot x vs time, or v vs x (phase portrait),
  from the ODE Table in the Plots window. }

m = 1.0       { mass }
k = 20.0      { spring constant }
c = 0.5       { damping coefficient }

DYNAMIC oscillator (method = ode45, t = 0 .. 20, points = 400, rtol = 1e-9)
  der(x) = v
  der(v) = -(c/m) * v - (k/m) * x
  energy = 0.5 * m * v*v + 0.5 * k * x*x   { total mechanical energy (decays) }
  x(0) = 1.0
  v(0) = 0.0
END

## Transient read-backs
x_settled = FinalValue('x')        { residual displacement at t = 20 }
E0        = ODEValue('energy', 0)  { initial energy }`,
  },
  {
    id: 'sounding-rocket-trajectory',
    title: 'Sounding Rocket Trajectory (loss-accurate)',
    description: 'Coupled h/v/m ODE with drag, burnout and an apogee event; apogee read back via an accessor.',
    category: 'Aerospace',
    text: `# Loss-Accurate Sounding-Rocket Trajectory (DYNAMIC)
{ The coupled multi-state system der(h)=v, der(v)=(F - D - m g)/m, der(m)=-mdot,
  with aerodynamic drag against an exponential atmosphere computed every step as
  an algebraic auxiliary, thrust gated off at burnout via If(), and an apogee
  EVENT (v = 0, falling) that stops the integration. The ODE Table (Tables
  window) plots altitude / velocity / mass vs time, or mass vs altitude.

  The apogee altitude is read back into the analytic solution with MaxValue('h').
  Change t_burn and re-solve to trade burn time for apogee — or, to SIZE the
  rocket, open Variable Information, give t_burn a guess near 27 and bounds
  [5, 55], add the equation  MaxValue('h') = h_target  and let frees solve for
  the burn time that reaches 100 km. }

g0     = 9.81
m0     = 600        { lift-off mass }
mdot   = 9          { propellant mass flow during burn }
F0     = 28000      { motor thrust }
Cd     = 0.3        { drag coefficient }
A      = 0.03       { reference area }
rho0   = 1.225      { sea-level air density }
Hscale = 8000       { atmospheric scale height }
t_burn = 27         { motor burn time }

DYNAMIC ascent (method = ode45, time = 0 .. 600, points = 500, rtol = 1e-7, atol = 1e-3)
  thrust = If(time, t_burn, F0, F0, 0)         { thrust on until burnout }
  mflow  = If(time, t_burn, mdot, mdot, 0)     { mass flow on until burnout }
  rho    = rho0 * exp(-h / Hscale)             { exponential atmosphere }
  drag   = 0.5 * rho * v * v * Cd * A          { aerodynamic drag }
  der(h) = v
  der(v) = (thrust - drag - m * g0) / m
  der(m) = -mflow
  h(0) = 0
  v(0) = 0
  m(0) = m0
  EVENT apogee: v = 0 | falling -> stop        { stop at the top of the arc }
END

## Read the trajectory back into the analytic solution
apogee_km = MaxValue('h') / 1000     { peak altitude reached }
v_burnout = ODEValue('v', t_burn)    { speed at burnout }
m_final   = FinalValue('m')          { burnout / coasting mass }`,
  },
  {
    id: 'partial-fractions',
    title: 'Partial Fractions (Laplace)',
    description: 'Decompose a transfer function and read the residues A, B as solved variables.',
    category: 'Control Systems',
    text: `# Partial Fractions (Laplace)
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
y_initial = A + B        { y(0) }`,
  },
  {
    id: 'cruise-control',
    title: 'Cruise Control System Design',
    description: 'Models a 1000 kg car with drag, tunes a PI controller, and performs frequency & stability analysis.',
    category: 'Control Systems',
    featured: true,
    text: `# Car Dynamics & Cruise Control
{ This example models a 1000 kg car under viscous drag, converts the state-space model to a transfer function, designs a proportional-integral (PI) controller for a feedback loop, and performs frequency & stability analysis.

  Press Solve (F2). }

m = 1000 [kg]           { car mass }
c = 50 [N-s/m]          { viscous drag coefficient }

{ State Space Model: states are [position; velocity], input is traction force. }
A[1,1] = 0; A[1,2] = 1
A[2,1] = 0; A[2,2] = -c/m
B[1] = 0
B[2] = 1/m
C[1] = 0; C[2] = 1      { output is velocity }
D = 0.0

{ 1. Convert State Space to Transfer Function }
CALL ss2tf(A[1:2,1:2], B[1:2], C[1:2], D : num_car[1:3], den_car[1:3])

{ 2. Design PI Controller: C(s) = Kp + Ki/s = (Kp*s + Ki)/s }
Kp = 800 [N-s/m]
Ki = 40 [N/m]
num_pi = [0.0, Kp, Ki]
den_pi = [0.0, 1.0, 0.0]

{ 3. Open-Loop System: L(s) = C(s) * G(s) }
CALL series(num_pi[1:3], den_pi[1:3], num_car[1:3], den_car[1:3] : num_ol[1:5], den_ol[1:5])

{ 4. Closed-Loop System: T(s) = L(s) / (1 + L(s)) }
num_h = [0.0, 0.0, 0.0, 0.0, 1.0]
den_h = [0.0, 0.0, 0.0, 0.0, 1.0]
CALL feedback(num_ol[1:5], den_ol[1:5], num_h[1:5], den_h[1:5] : num_cl[1:5], den_cl[1:5])

{ 5. Stability & Frequency Margin Analysis }
CALL margin(num_ol[1:5], den_ol[1:5] : gm, pm, w_cg, w_cp)

{ 6. Closed-Loop Poles and Zeros }
CALL pole(num_cl[1:5], den_cl[1:5] : cl_pr[1:4], cl_pi[1:4])
CALL zero(num_cl[1:5], den_cl[1:5] : cl_zr[1:4], cl_zi[1:4])

{ 7. Frequency sweeps for Bode and Nyquist plots }
omega = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0, 10.0]
CALL bode(num_ol[1:5], den_ol[1:5], omega[1:9] : mag_ol[1:9], phase_ol[1:9])
CALL nyquist(num_ol[1:5], den_ol[1:5], omega[1:9] : real_ol[1:9], imag_ol[1:9])

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
END`,
  },
  {
    id: 'step-impulse-response',
    title: 'Step & Impulse Response',
    description: 'Time-domain analysis of a second-order system: step response, impulse response, and forced response (lsim).',
    category: 'Control Systems',
    text: `{ Step & Impulse Response Analysis }
{ Second-order system: G(s) = wn^2 / (s^2 + 2*zeta*wn*s + wn^2) }
{ Natural frequency and damping ratio }
wn = 2 [rad/s]
zeta = 0.3

{ Transfer function coefficients (descending powers of s) }
{ num(s) = wn^2,  den(s) = s^2 + 2*zeta*wn*s + wn^2 }
num = [0, 0, wn^2]
den = [1, 2*zeta*wn, wn^2]

{ Time vector: 0 to 10 s in 0.2 s steps -> 51 samples }
t = 0:0.2:10
N = 51

{ 1. Unit Step Response }
CALL step(num[1:3], den[1:3], t[1:N] : y_step[1:N])

{ 2. Impulse Response }
CALL impulse(num[1:3], den[1:3], t[1:N] : y_imp[1:N])

{ 3. Forced Response: ramp input u(t) = t (same grid as t) }
u = 0:0.2:10
CALL lsim(num[1:3], den[1:3], u[1:N], t[1:N] : y_ramp[1:N])

{ 4. Stability check: poles of the system }
CALL pole(num[1:3], den[1:3] : pr[1:2], pi[1:2])

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
END`,
  },
  {
    id: 'controller-design-lqr-pid',
    title: 'Controller Design (LQR & PID)',
    description: 'LQR optimal state-feedback for a double integrator (with closed-loop pole check) and loop-shaping PID auto-tuning of a SISO plant.',
    category: 'Control Systems',
    text: `# Controller Design: LQR + PID

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
CALL lqr(A[1:2,1:2], B[1:2], Q[1:2,1:2], R : K[1:2])

{ Closed-loop matrix Acl = A - B K, then verify the poles are stable }
Acl[1,1] = A[1,1] - B[1]*K[1]
Acl[1,2] = A[1,2] - B[1]*K[2]
Acl[2,1] = A[2,1] - B[2]*K[1]
Acl[2,2] = A[2,2] - B[2]*K[2]
CALL pole(Acl[1:2,1:2] : pcl_r[1:2], pcl_i[1:2])

{ ---- PID auto-tuning for plant G(s) = 1 / (s^2 + s) ---- }
{ Target gain crossover at wc with a 60 deg phase margin }
num = [0, 0, 1]
den = [1, 1, 0]
wc = 1 [rad/s]
CALL pidtune(num[1:3], den[1:3], 'PID', wc : Kp, Ki, Kd)`,
  },
  {
    id: 'control-analysis-report',
    title: 'Control Analysis Report (Formatted)',
    description: 'End-to-end report: poles/zeros, stability margins, Bode, Nyquist, and step response with the plots embedded inline via [Graph] tags. Open the Formatted tab.',
    category: 'Control Systems',
    text: `[document type=report size=a4 margin=(20,20,20,20)]
[page number=on]
# Control System Analysis Report

This report analyzes a second-order plant G(s) end to end: poles and zeros,
gain and phase margins, frequency response (Bode and Nyquist), and the unit
step response. Press Solve (F2), then open the **Formatted** tab to read the
report with the plots embedded inline.

## 1. Plant model

The numerator and denominator coefficients below (descending powers of s) define
G(s) = (s + 2) / (s^2 + 4s + 25) — an underdamped system with a natural
frequency of 5 rad/s, a damping ratio near 0.4, and a single real zero.
num = [0, 1, 2]
den = [1, 4, 25]

[page]
## 2. Poles, zeros and stability margins

CALL pole(num[1:3], den[1:3] : pr[1:2], pi[1:2])
CALL zero(num[1:3], den[1:3] : zr[1:1], zi[1:1])
CALL margin(num[1:3], den[1:3] : gm, pm, w_cg, w_cp)

Both poles sit in the left half-plane, so the system is stable. The s-plane map
below shows the conjugate pole pair and the single real zero.

[Graph="Pole-Zero Map"] Poles (x) and the zero (o) in the s-plane [/Graph]

[page]
## 3. Frequency response

Sweep 50 logarithmically spaced frequencies, then evaluate the Bode and Nyquist
responses.
Nw = 50
omega = 0.1:50:100 | Log
CALL bode(num[1:3], den[1:3], omega[1:Nw] : mag[1:Nw], phase[1:Nw])
CALL nyquist(num[1:3], den[1:3], omega[1:Nw] : re[1:Nw], im[1:Nw])

[Graph="Bode Diagram"] Magnitude (dB) and phase (deg) versus frequency [/Graph]

[Graph="Nyquist Diagram"] Polar plot with the critical point marked at -1 + j0 [/Graph]

[page]
## 4. Time-domain step response

Integrate the unit step response over 4 seconds; the underdamped poles produce
the expected overshoot before settling.
Nt = 81
t = 0:0.05:4
CALL step(num[1:3], den[1:3], t[1:Nt] : y[1:Nt])

[Graph="Step Response"] Unit step response showing the overshoot [/Graph]
[/document]

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
END`,
  },
  {
    id: 'root-locus-analysis',
    title: 'Root Locus Analysis',
    description: 'Calculate and plot root locus trajectories for a closed-loop system, finding crossover points matching Norman Nise examples.',
    category: 'Control Systems',
    text: `{ Root Locus Analysis }
{ Open-loop plant G(s) = K*(s + 3) / (s*(s + 1)*(s + 2)*(s + 4)) }
{ Expanded open-loop denominator coefficients: }
{ s*(s + 1)*(s + 2)*(s + 4) = s^4 + 7*s^3 + 14*s^2 + 8*s }
num_ol = [0, 0, 0, 1, 3]
den_ol = [1, 7, 14, 8, 0]

{ M gain values, system order N = 4 }
M = 200
N_poles = 4

{ Calculate closed-loop root locus trajectories }
CALL rlocus(num_ol[1:5], den_ol[1:5] : K[1:M], cpr[1:M, 1:N_poles], cpi[1:M, 1:N_poles])

{ Extract open-loop poles and zeros for plotting }
CALL pole(num_ol[1:5], den_ol[1:5] : pr[1:N_poles], pi[1:N_poles])
CALL zero(num_ol[1:5], den_ol[1:5] : zr[1:1], zi[1:1])

PLOT 'Root Locus'
  kind = rootlocus
  pr = cpr
  pi = cpi
  zr = zr
  zi = zi
END`,
  },
  {
    id: 'heisler-transient',
    title: 'Transient Conduction (Heisler)',
    description: 'Centre/surface temperature of a thick plate cooling by convection.',
    category: 'Heat Transfer',
    text: `# Transient Conduction (Heisler)
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
Q_ratio = heisler_q(geom$, Bi, Fo)         { fraction of heat removed }`,
  },
  {
    id: 'nichols-chart',
    title: 'Nichols Chart Presentation (Slide)',
    description: 'Open-loop frequency response on the Nichols grid, formatted as a slide presentation.',
    category: 'Control Systems',
    text: `[document type=slide size=(1024,768) margin=(60,60,60,60)]
[page number=on]
# Nichols Chart Presentation

Open-loop magnitude vs phase for G(s) = 1 / ((s+1)(s+2)(s+3)).
Solve (F2), then open the **Formatted** tab to view the slides.

[page]
## System Definition

We define the numerator and denominator for the open-loop plant:
num = [0, 0, 0, 1]
den = [1, 6, 11, 6]      { (s+1)(s+2)(s+3) }
omega = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20]

CALL nichols(num[1:4], den[1:4], omega[1:9] : mag[1:9], phase[1:9])

[page]
## Nichols Chart

The locus is drawn on the standard Nichols grid with the -1 critical point marked.

[Graph="Nichols"] Nichols chart locus [/Graph]
[/document]

PLOT 'Nichols'
  kind = nichols
  mag = mag
  phase = phase
END`,
  },
  {
    id: 'routh-stability',
    title: 'Routh-Hurwitz Stability',
    description: 'Count right-half-plane poles of a characteristic polynomial.',
    category: 'Control Systems',
    text: `# Routh-Hurwitz Stability
{ How many closed-loop poles sit in the right half-plane?
  nRHP = 0 means the system is stable. For s^3 + s^2 + 2s + 8
  the answer is 2 (unstable). }
den = [1, 1, 2, 8]       { s^3 + s^2 + 2s + 8 }

CALL routh(den[1:4] : nRHP, stable)`,
  },
  {
    id: 'inverse-laplace-residue',
    title: 'Inverse Laplace (Residues)',
    description: 'Partial-fraction residues and poles of a transfer function.',
    category: 'Control Systems',
    text: `# Inverse Laplace via Residues
{ Partial-fraction expansion of Y(s) = (s + 3)/(s^2 + 3s + 2).
  residue() returns the residues r and matching poles p, so the
  time response is y(t) = r_r[1] exp(p_r[1] t) + r_r[2] exp(p_r[2] t).
  Here that is 2 exp(-t) - exp(-2 t). }
num = [1, 3]             { s + 3 }
den = [1, 3, 2]          { s^2 + 3s + 2 = (s+1)(s+2) }

CALL residue(num[1:2], den[1:3] : r_r[1:2], r_i[1:2], p_r[1:2], p_i[1:2], k)`,
  },
  {
    id: 'digital-control-c2d',
    title: 'Digital Control: Discretization',
    description: 'Convert a continuous plant to discrete time (Tustin and ZOH).',
    category: 'Control Systems',
    text: `# Digital Control: Discretization
{ Sample a continuous plant G(s) = 2/(s+2) at Ts = 0.1 s using the
  bilinear (Tustin) and zero-order-hold (ZOH) methods. The outputs
  numz/denz are the discrete transfer function in powers of z. }
num = [0, 2]
den = [1, 2]             { 2 / (s + 2) }
Ts = 0.1 [s]

CALL c2d(num[1:2], den[1:2], Ts, 'tustin' : numz_t[1:2], denz_t[1:2])
CALL c2d(num[1:2], den[1:2], Ts, 'zoh'    : numz_z[1:2], denz_z[1:2])`,
  },
  {
    id: 'radiation-view-factors',
    title: 'Radiation View Factors',
    description: 'Closed-form diffuse view factors for standard configurations.',
    category: 'Heat Transfer',
    featured: true,
    text: `# Radiation View Factors
{ Analytic (Howell-catalog) diffuse view factors — no chart lookup
  needed. Each returns the dimensionless fraction of radiation that
  leaves surface 1 and reaches surface 2. }
F_perp = viewfactor_perp(1 [m], 1 [m], 1 [m])       { perpendicular plates sharing an edge }
F_par  = viewfactor_plates(2 [m], 2 [m], 1 [m])     { aligned parallel rectangles }
F_disk = viewfactor_disks(0.5 [m], 1 [m], 0.4 [m])  { coaxial parallel disks }`,
  },
  {
    id: 'material-conduction',
    title: 'Conduction (Material Database)',
    description: 'Fourier conduction using a built-in solid-material property.',
    category: 'Heat Transfer',
    text: `# Conduction Through an Aluminum Plate
{ The thermal conductivity comes from the built-in solid-material
  database via k_(Aluminum) — no need to look it up. }
T_hot = 400 [K]
T_cold = 300 [K]
L = 0.02 [m]             { plate thickness }
A = 0.25 [m^2]           { area }
k = k_(Aluminum)         { ~237 W/m-K from the material DB }

q = k * A * (T_hot - T_cold) / L   { heat rate through the plate }`,
  },
  {
    id: 'engine-map-2d',
    title: 'Engine Map (2-D Interpolation)',
    description: 'Bilinear lookup of a brake-specific-fuel-consumption map.',
    category: 'Powertrain',
    featured: true,
    text: `# Engine Map - 2-D Interpolation
{ A brake-specific fuel consumption map: rows are engine speed,
  columns are load. Call the table with two arguments to bilinearly
  interpolate, bsfc(rpm, load), or use the EES-style Interpolate2D. }
TABLE bsfc(rpm : load = 0.25, 0.5, 1.0)
  1000   320   300   290
  3000   280   260   250
  5000   300   270   255
END

g_per_kWh = bsfc(2500, 0.6)                  { direct curve-family call }
g_check   = Interpolate2D('bsfc', 2500, 0.6) { same value, EES name }`,
  },
  {
    id: 'multi-objective-beam',
    title: 'Multi-Objective Beam Design (Pareto)',
    description: 'Trade off mass against deflection — run via Min/Max > Pareto.',
    category: 'Optimization',
    featured: true,
    text: `# Multi-Objective Cantilever Beam
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
delta = F * L^3 / (3 * E * I)        { objective 2: tip deflection, minimize }`,
  },
  {
    id: 'driving-cycle-energy',
    title: 'Driving-Cycle Energy (Parametric)',
    description: 'Integrate tractive power over a speed profile with IntegralValue.',
    category: 'Powertrain',
    text: `# Driving-Cycle Energy
{ Tractive power over a speed profile, integrated to total energy.
  This uses a PARAMETRIC table, so do NOT use the main Solve — open
  the Tables tab and click "Solve Table". E_total and P_avg are
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
END`,
  },
]

/** The document new/blank workspaces start from. */
export const DEFAULT_EXAMPLE_TEXT = EXAMPLES[0].text
