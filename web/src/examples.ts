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
    description: 'Coupled refrigerant + coolant loops with wide branches and a discretized radiator; every HX UA and the evaporator dP are computed from correlations + geometry and injected. Reports the steady cycle performance — cooling duties, compressor power and COP. Solve (F2).',
    category: 'Systems',
    featured: true,
    text: EV_THERMAL_EXAMPLE_TEXT,
  },
  {
    id: 'pressure-cooker',
    title: 'Pressure Cooker (transient)',
    description: 'Multi-domain boil-off: an electric element heats a steel body and the water; a lifting relief valve holds the cooker at its ~2 atm setpoint. Solve, then open the Plots tab.',
    category: 'Systems',
    featured: true,
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
END`,
  },
  {
    id: 'pump-sizing',
    title: 'Pump Sizing',
    description: 'Hydraulic and shaft power from flow rate, head, and efficiency.',
    category: 'Mechanical',
    featured: true,
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
P_shaft = P_hydraulic / eta          { required shaft power }`,
  },
  {
    id: 'projectile-motion',
    title: 'Projectile Motion',
    description: 'Range, flight time, and peak height of a launched projectile.',
    category: 'Mechanics',
    featured: true,
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
h_max = vy^2 / (2 * g)   { peak height }`,
  },
  {
    id: 'heat-conduction',
    title: 'Heat Conduction',
    description: "Steady 1-D conduction through a wall (Fourier's law).",
    category: 'Heat Transfer',
    featured: true,
    text: `// Heat Conduction Through a Wall
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
    text: `// Ideal Gas Law
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
    text: `// DC Circuit — Power Dissipation
V = 12 [V]
R = 220 [ohm]
I = V / R       { current }
P = V * I       { power dissipated }`,
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
P0_air = StagnationPres(P_air, T_air, T0_air, k_air)`,
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
END`,
  },
  {
    id: 'tank-draining',
    title: 'Tank Draining (ODE)',
    description: 'First-order ODE via Integral — Torricelli draining of a tank.',
    category: 'Fluids',
    featured: true,
    text: `// Tank Draining (Torricelli) — first-order ODE
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
    text: `// Newton's Law of Cooling — first-order ODE
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
    text: `// Projectile Trajectory (parametric time sweep)
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
    text: `// Damped Harmonic Oscillator (parametric time sweep)
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
m_oxidizer = OF * m_fuel`,
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
t_half  = TimeAt('T', 56 [C]) * 1 [s]        { time to reach 56 degrees }`,
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
T_mid_final = FinalValue('t[4]') * 1 [K]`,
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
E0        = ODEValue('energy', 0) * 1 [J]  { initial energy }`,
  },
  {
    id: 'sounding-rocket-trajectory',
    title: 'Sounding Rocket Trajectory (loss-accurate)',
    description: 'Coupled h/v/m ODE with drag, burnout and an apogee event; apogee read back via an accessor.',
    category: 'Aerospace',
    text: `// Loss-Accurate Sounding-Rocket Trajectory (DYNAMIC)
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
m_final   = FinalValue('m') * 1 [kg]          { burnout / coasting mass }`,
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
y_initial = A + B        { y(0) }`,
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
END`,
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
[Ar, Br] = tf2ss(num, den)`,
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
END`,
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
[Kp, Ki, Kd] = pidtune(num, den, 'PID', wc)`,
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
[Ab, Bb, Cb] = balreal(A, B, C)`,
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
END`,
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
END`,
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
Q_ratio = heisler_q(geom$, Bi, Fo)         { fraction of heat removed }`,
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
END`,
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

[nRHP, stable] = routh(den)`,
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

[r_r, r_i, p_r, p_i, k] = residue(num, den)`,
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
[numz_z, denz_z] = c2d(num, den, Ts, 'zoh')`,
  },
  {
    id: 'radiation-view-factors',
    title: 'Radiation View Factors',
    description: 'Closed-form diffuse view factors for standard configurations.',
    category: 'Heat Transfer',
    featured: true,
    text: `// Radiation View Factors
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
    text: `// Conduction Through an Aluminum Plate
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
g_check   = Interpolate2D('bsfc', 2500, 0.6) { same value, classic-solver name }`,
  },
  {
    id: 'multi-objective-beam',
    title: 'Multi-Objective Beam Design (Pareto)',
    description: 'Trade off mass against deflection — run via Min/Max > Pareto.',
    category: 'Optimization',
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
delta = F * L^3 / (3 * E * I)        { objective 2: tip deflection, minimize }`,
  },
  {
    id: 'driving-cycle-energy',
    title: 'Driving-Cycle Energy (Parametric)',
    description: 'Integrate tractive power over a speed profile with IntegralValue.',
    category: 'Powertrain',
    text: `// Driving-Cycle Energy
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
    featured: true,
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
eta_th = w_net / q_in`,
  },
  {
    id: 'brayton-cycle',
    title: 'Brayton Cycle',
    description: 'Gas-turbine cycle, cold air-standard with component efficiencies.',
    category: 'Thermodynamics',
    featured: true,
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
eta_th = w_net / q_in`,
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
eta_ideal = 1 - 1 / r^(k - 1)   { closed-form air-standard efficiency }`,
  },
  {
    id: 'refrigeration-vcr',
    title: 'Refrigeration Cycle',
    description: 'Vapor-compression R134a cycle COP with real-refrigerant properties.',
    category: 'Thermodynamics',
    featured: true,
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
COP = q_L / w_c`,
  },
  {
    id: 'cd-nozzle-shock',
    title: 'Nozzle with a Normal Shock',
    description: 'Compressible flow: supersonic nozzle with a normal shock (gas dynamics).',
    category: 'Aerospace',
    featured: true,
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
P02 = P0 * P02_P01_shock(M1, k)      { stagnation pressure after the loss }`,
  },
  {
    id: 'hx-effectiveness-ntu',
    title: 'Heat Exchanger (Effectiveness-NTU)',
    description: 'Counterflow exchanger duty and outlet temperatures via effectiveness-NTU.',
    category: 'Heat Transfer',
    featured: true,
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
dTlm = LMTD(Th_in - Tc_out, Th_out - Tc_in)`,
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
Psat_300 = eos_psat('co2', 'PR', 300)          { saturation pressure at 300 K }`,
  },
  {
    id: 'engine-cycle-wiebe',
    title: 'Engine Cycle (Wiebe Heat Release)',
    description: 'Crank-angle single-zone SI-engine pressure trace via a DYNAMIC block.',
    category: 'Powertrain',
    featured: true,
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

p_max = MaxValue('p') * 1 [Pa]      { peak cylinder pressure }`,
  },
  {
    id: 'adiabatic-flame-temp',
    title: 'Adiabatic Flame Temperature',
    description: 'Methane-air flame temperature, stoichiometric AFR, and heating value.',
    category: 'Thermodynamics',
    featured: true,
    text: `// Adiabatic Flame Temperature
{ Complete combustion of methane in air (products frozen, no dissociation).
  Edit phi: 1.0 is stoichiometric, < 1.0 is excess air (lower flame temp). }
phi     = 1.0              { equivalence ratio (1 = stoichiometric, <1 = excess air) }
T_react = 298.15 [K]       { reactants enter at 25 C }
T_flame = AdiabaticFlameTemp('CH4', phi, T_react)
AFR_st  = StoichAFR('CH4') { stoichiometric air-fuel ratio (mass basis) }
LHV     = HeatingValue('CH4', 'LHV')`,
  },
  {
    id: 'ev-battery-cooling-pid',
    title: 'EV Battery Cooling with Closed-Loop EXV Control',
    description: 'Five domains in one transient solve: pack discharge (electrical) heats the cell thermal state, a coolant loop carries it to an R134a chiller, and a reverse-acting PID on a signal wire modulates the electronic expansion valve to hold the pack at 303 K. Solve (F2).',
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
q_positive = 0.5 * (1 + tanh(FinalValue('ch.ev.q')))`,
  },
  {
   id: 'pneumatic-spring-actuator',
   "title": "Spring-return pneumatic actuator",
    "description": "Solve (F2). Spring-return pneumatic actuator",
    "category": "Pneumatics",
    "text": "PneumaticSupply supply(fluid$=Air, P=120000 [Pa], T=293.15 [K])\nPneumaticActuator actuator(fluid$=Air, area=0.001774 [m^2], Patm=100000 [Pa])\nTransSpring spring(k=1330 [N/m], x0=0 [m])\nTransGround ground()\nconnect(supply.out, actuator.in)\nconnect(actuator.rod, spring.a)\nconnect(spring.b, ground.port)\nstroke = spring.x\nforce = -actuator.rod.f\n{ CHECK stroke 0.0266766917293233 1e-8 }\n{ CHECK force 35.48 1e-6 }"
  },
{
   id: 'hydraulic-spring-actuator',
   "title": "Hydraulic actuator holding a spring load",
    "description": "Solve (F2). Hydraulic actuator holding a spring load",
    "category": "Hydraulics",
    "text": "HydraulicSupply supply(P=1100000 [Pa])\nHydraulicCylinder cylinder(rho=850 [kg/m^3], beta=1.5e9 [Pa], V0=0.0001 [m^3], area=0.001 [m^2], Patm=100000 [Pa], P0=1100000 [Pa])\nTransSpring spring(k=50000 [N/m], x0=0.02 [m])\nTransGround ground()\nconnect(supply.out, cylinder.in)\nconnect(cylinder.rod, spring.a)\nconnect(spring.b, ground.port)\nload = -cylinder.rod.f\nstroke = spring.x\n{ CHECK load 1000 1e-6 }\n{ CHECK stroke 0.02 1e-8 }"
  },
{
   id: 'hydraulic-metering-restriction',
   "title": "Oil flow through a metering restriction",
    "description": "Solve (F2). Oil flow through a metering restriction",
    "category": "Hydraulics",
    "text": "HydraulicSupply supply(P=1100000 [Pa])\nHydraulicOrifice restriction(CdA=1e-5 [m^2], rho=850 [kg/m^3])\nHydraulicTank tank(P=100000 [Pa])\nconnect(supply.out, restriction.in)\nconnect(restriction.out, tank.port)\nmass_flow = restriction.in.mdot\nvolume_flow = mass_flow / 850 [kg/m^3]\nhydraulic_power = 1000000 [Pa] * volume_flow\nGUESS restriction.in.mdot = 0.4\n{ CHECK mass_flow 0.412310562561766 1e-7 }\n{ CHECK hydraulic_power 485.071250072666 1e-3 }"
  },
{
   id: 'pneumatic-sonic-restriction',
   "title": "Air supply through a sonic restriction",
    "description": "Solve (F2). Air supply through a sonic restriction",
    "category": "Pneumatics",
    "text": "PneumaticSupply supply(fluid$=Air, P=700000 [Pa], T=293.15 [K])\nPneumaticOrifice restriction(fluid$=Air, C=1e-8, b=0.35)\nPneumaticAtmosphere atmosphere(P=100000 [Pa])\nconnect(supply.out, restriction.in)\nconnect(restriction.out, atmosphere.port)\npressure_ratio = restriction.out.P / restriction.in.P\nmass_flow = restriction.in.mdot\n{ CHECK pressure_ratio 0.142857142857143 1e-9 }\n{ CHECK mass_flow 0.008295 1e-7 }"
  },
{
   id: 'damped-actuator-motion',
   "title": "Damped actuator motion",
    "description": "Solve (F2), then inspect the dynamic table. Damped actuator motion",
    "category": "Mechanical",
    "text": "ForceSource drive(F=35.48 [N])\nTransMass moving(m=0.1 [kg], v0=0 [m/s])\nTransSpring spring(k=1330 [N/m], x0=0 [m])\nTransDamper damper(c=23.0651251893416 [N-s/m])\nTransGround ground()\nconnect(drive.a, moving.port, spring.a, damper.a)\nconnect(drive.b, spring.b, damper.b, ground.port)\nDYNAMIC motion(method=ode45, time=0..0.2, points=101)\nEND\nfinal_stroke = FinalValue('spring.x') * 1 [m]\n{ CHECK final_stroke 0.0266766917 1e-6 }"
  },
{
   id: 'reduction-gear-viscous-load',
   "title": "Reduction gear driving a viscous load",
    "description": "Solve (F2). Reduction gear driving a viscous load",
    "category": "Mechanical",
    "text": "TorqueSource drive(T=12 [N-m])\nGear gear(ratio=3)\nRotationalDamper load(c=0.6 [N-m-s])\nMechGround ground()\nconnect(drive.a, gear.in)\nconnect(gear.out, load.a)\nconnect(drive.b, load.b, ground.port)\ninput_speed = gear.in.w\noutput_speed = gear.out.w\nload_power = load.a.tau * load.a.w\n{ CHECK input_speed 180 1e-6 }\n{ CHECK output_speed 60 1e-6 }\n{ CHECK load_power 2160 1e-4 }"
  },
{
   id: 'pi-temperature-regulation',
   "title": "PI temperature regulation of a thermal mass",
    "description": "Solve (F2), then inspect the dynamic table. PI temperature regulation of a thermal mass",
    "category": "Thermal",
    "text": "PIThermostat controller(Kp=100 [W/K], Ki=0.5 [W/K-s], Tref=350 [K])\nThermalMass body(C=5000 [J/K], T0=300 [K])\nConduction wall(k=2 [W/m-K], area=1 [m^2], L=0.1 [m])\nThermalSource ambient(T=300 [K])\nconnect(controller.port, body.port, wall.a)\nconnect(wall.b, ambient.port)\nDYNAMIC heating(method=ode45, time=0..2000, points=201)\nEND\nfinal_temperature = FinalValue('body.port.t') * 1 [K]\nfinal_heat = -FinalValue('controller.port.qdot') * 1 [W]\n{ CHECK final_temperature 350 0.02 }\n{ CHECK final_heat 1000 0.5 }"
  },
{
   id: 'glazed-opening-heat-loss',
   "title": "Heat loss through a glazed opening",
    "description": "Solve (F2). Heat loss through a glazed opening",
    "category": "Thermal",
    "text": "ThermalSource inside(T=293.15 [K])\nConvection inner_film(htc=8 [W/m^2-K], area=0.9 [m^2])\nConduction glass(k=0.81 [W/m-K], area=0.9 [m^2], L=0.003 [m])\nConvection outer_film(htc=25 [W/m^2-K], area=0.9 [m^2])\nThermalSource outside(T=273.15 [K])\nconnect(inside.port, inner_film.a)\nconnect(inner_film.b, glass.a)\nconnect(glass.b, outer_film.a)\nconnect(outer_film.b, outside.port)\nheat_loss = glass.Q\nresistance = 1/(8 [W/m^2-K]*0.9 [m^2]) + 0.003 [m]/(0.81 [W/m-K]*0.9 [m^2]) + 1/(25 [W/m^2-K]*0.9 [m^2])\nexpected_heat = 20 [K]/resistance\nbalance_error = heat_loss - expected_heat\n{ CHECK balance_error 0 1e-7 }"
  },
{
   id: 'sensor-detrend-smooth-window',
   "title": "Remove drift and smooth a sampled sensor trace",
    "description": "Solve (F2). Remove drift and smooth a sampled sensor trace",
    "category": "Signal Processing",
    "text": "trace = [1, 3, 2, 6, 4, 9, 5, 12]\ndetrended = Detrend(trace)\ncentered = Detrend(trace, 'constant')\nsmoothed = Smooth(trace, 3)\ntapered = Window(detrended[1:8], 'hann')\ncentered_mean = sum(centered[1:8])/8\nresidual_mean = sum(detrended[1:8])/8\nleft_edge = smoothed[1]\n{ CHECK centered_mean 0 1e-9 }\n{ CHECK residual_mean 0 1e-9 }\n{ CHECK left_edge 2 1e-9 }\n{ CHECK tapered[1] 0 1e-9 }\n{ CHECK tapered[8] 0 1e-9 }"
  },
{
   id: 'vibration-tone-spectrum',
   "title": "Recover a vibration tone and check spectral power",
    "description": "Solve (F2), then plot the spectrum. Recover a vibration tone and check spectral power",
    "category": "Signal Processing",
    "text": "signal = [0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1,0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1,0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1,0,1,1.4142135623730951,1,0,-1,-1.4142135623730951,-1]\nimaginary = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]\n[spectrum_real, spectrum_imag] = FFT(signal, imaginary)\n[recovered, recovered_imag] = IFFT(spectrum_real[1:32], spectrum_imag[1:32])\n[frequency, psd] = Welch(signal, 32, 16)\npower = sum(psd[1:9])*(frequency[2]-frequency[1])\nreconstruction_error = recovered[3]-signal[3]\ntone_peak = peakindex(1, 0, 0, psd[1:9])\nPLOT 'Vibration power spectrum'\n kind = xy\n x = frequency\n y = psd\n xlabel = 'Frequency [Hz]'\n ylabel = 'Power density [amplitude squared per Hz]'\nEND\n{ CHECK frequency[3] 4 1e-9 }\n{ CHECK tone_peak 3 1e-9 }\n{ CHECK power 1 0.01 }\n{ CHECK reconstruction_error 0 1e-9 }"
  },
{
   id: 'causal-zero-phase-filter',
   "title": "Causal filtering, zero-phase filtering and convolution",
    "description": "Solve (F2). Causal filtering, zero-phase filtering and convolution",
    "category": "Signal Processing",
    "text": "samples = [0, 0, 0, 1, 0, 0, 0]\nb = [0.5, 0.5]\na = [1]\ncausal = Filter(b, a, samples)\nzero_phase = FiltFilt(b, a, samples)\nfull_response = Convolve(samples, b)\nsymmetry_error = zero_phase[3]-zero_phase[5]\n{ CHECK causal[4] 0.5 1e-9 }\n{ CHECK causal[5] 0.5 1e-9 }\n{ CHECK full_response[8] 0 1e-9 }\n{ CHECK symmetry_error 0 1e-9 }"
  },
{
   id: 'transport-delay-peak-detection',
   "title": "Measure transport delay and detect peaks",
    "description": "Solve (F2). Measure transport delay and detect peaks",
    "category": "Signal Processing",
    "text": "late = [0, 0, 1, 2, 1, 0, 0]\nearly = [0, 1, 2, 1, 0, 0, 0]\n[correlation] = XCorr(late, early)\npeak_position = peakindex(1, 0, 0, correlation[1:13])\nlag_samples = peak_position - 7\ndelay_seconds = 0.1 [s]*lag_samples\npulses = [0, 3, 0, 0, 5, 0, 0, 2, 0]\ncount = peakcount(0, 0, pulses)\n{ CHECK lag_samples 1 1e-9 }\n{ CHECK delay_seconds 0.1 1e-9 }\n{ CHECK count 3 1e-9 }"
  },
{
   id: 'correlated-temperature-heat-loss',
   "title": "Correlated temperature measurements in heat-loss estimation",
    "description": "Solve (F2). Correlated temperature measurements in heat-loss estimation",
    "category": "Uncertainty",
    "text": "inside_temp = 293.15 [K]\noutside_temp = 273.15 [K]\nheat_loss = 10 [W/K]*(inside_temp-outside_temp)\nUncertaintyOf(inside_temp) = 0.2\nUncertaintyOf(outside_temp) = 0.3\nCorrelation(inside_temp, outside_temp) = 0.5\nheat_sigma = UncertaintyOf(heat_loss)\n{ CHECK heat_loss 200 1e-8 }\n{ CHECK heat_sigma 2.64575131106459 1e-7 }"
  },
{
   id: 'uniform-area-tolerance',
   "title": "Uniform dimensional tolerance and propagated spread",
    "description": "Solve (F2). Uniform dimensional tolerance and propagated spread",
    "category": "Uncertainty",
    "text": "area = 0.001774 [m^2]\nforce = 20000 [Pa]*area\nDistributionOf(area) = Uniform(0.0015966, 0.0019514)\nforce_sigma = UncertaintyOf(force)\n{ CHECK force 35.48 1e-8 }\n{ CHECK force_sigma 2.048438755 1e-7 }"
  },
  {
   id: 'uncertain-tank-inventory',
   "title": "Tank inventory from uncertain measurements",
    "description": "Solve (F2). Tank inventory from uncertain measurements",
    "category": "Uncertainty",
    "text": "pressure = 934000 [Pa]\nvolume = 0.010 [m^3]\ntemperature = 295.45 [K]\nmass = pressure*volume/(208.1 [J/kg-K]*temperature)\nUncertaintyOf(pressure) = 22000\nUncertaintyOf(volume) = 0.0004\nUncertaintyOf(temperature) = 1.2\nmass_sigma = UncertaintyOf(mass)\n{ CHECK mass 0.151911552344956 1e-9 }\n{ CHECK mass_sigma 0.00707868056268796 1e-8 }"
  }
  ,{
    id: 'rc-step-charging',
    title: 'RC step charging',
    description: 'Solve (F2), then inspect the dynamic table. A 10 V step charges a 1 µF capacitor through 1 kΩ.',
    category: 'Electrical',
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
    description: 'Solve (F2), then inspect the dynamic table for underdamped ringing in a series RLC circuit.',
    category: 'Electrical',
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
    description: 'Solve (F2). Reduce a five-resistor bridge to its equivalent resistance.',
    category: 'Electrical',
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
    category: 'Electrical',
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
    description: 'Solve (F2), then inspect the dynamic table. A spring-loaded diaphragm fills through an orifice until the spring balances 20 kPa.',
    category: 'Pneumatics',
    text: `{ A 1774 mm2 diaphragm on a 1.33 N/mm spring is fed at 20 kPa gauge through an
  ISO 6358 orifice into a 15 cm3 chamber. The stem (0.1 kg) is critically damped:
  the orifice passes forward flow only, so an overshoot would trap a little extra
  pressure in the chamber. At rest the stroke is dP*A/k = 26.68 mm and the
  chamber holds the full 20.0 kPa, the textbook answer. }
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
DYNAMIC fill(method=ode45, time=0..1, points=201)
END
z_final = FinalValue('spring.x') * 1 [m]
dP_final = FinalValue('chamber.in.P') * 1 [Pa] - 100000 [Pa]
z_static = 20000 [Pa] * 0.001774 [m^2] / 1330 [N/m]
{ CHECK z_final 0.0266767055718817 1e-07 }
{ CHECK dP_final 20000.0103451566 0.1 }
{ CHECK z_static 0.0266766917293233 1e-12 }`,
  },
  {
    id: 'pneumatic-cylinder-stall-force',
    title: 'Double-acting cylinder stall force',
    description: 'Solve (F2). Net rod force of a 25 mm bore cylinder at 7 barA, rod side vented.',
    category: 'Pneumatics',
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
    description: 'Solve (F2), then inspect the dynamic table. Three air receivers equalize through a large and a small orifice.',
    category: 'Pneumatics',
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
    description: 'Solve (F2). Oil pressure that holds a 3.2 kg piston against a 150 N spring.',
    category: 'Hydraulics',
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
    description: 'Solve (F2). Oil flow through a 3 mm orifice at 40 bar, reported in L/min.',
    category: 'Hydraulics',
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
    description: 'Solve (F2), then inspect the dynamic table. A 3 m tank drains through a 3 cm orifice.',
    category: 'Fluids',
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
    description: 'Solve (F2), then inspect the dynamic table. A 25:50 gear reflects an output spring to the input shaft.',
    category: 'Mechanical',
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
    description: 'Solve (F2), then inspect the dynamic table. Engine, gearbox, wheels and body; the wheels add equivalent mass.',
    category: 'Powertrain',
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
    description: 'Solve (F2). Capstan equation in US customary units.',
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
    description: 'Solve (F2). Natural frequency, damping, peak time, overshoot and settling time of 121/(s^2+11s+121).',
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
    description: 'Solve (F2). A PI zero at 0.1 on 800/(s^2+101s+100) gives no overshoot and no steady-state error.',
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
    description: 'Solve (F2), then inspect the dynamic table. Time constant of G = 1000/(0.00992 s + 1).',
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
    description: 'Solve (F2). 1000 L/s of warm air mixes with 500 L/s of cool air.',
    category: 'HVAC',
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
    description: 'Solve (F2). Back-solve the apparatus dew point and bypass factor for 28 C/50 % to 13 C/90 %.',
    category: 'HVAC',
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
    description: 'Solve (F2). Winter air heated and humidified to 90 F / 40 %, in US customary units.',
    category: 'HVAC',
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
    description: 'Solve (F2). Effectiveness, duty and outlet temperatures of a cross-flow exchanger, both fluids unmixed.',
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
    description: 'Solve (F2). Bessel-function efficiency of annular fins on a 2.5 cm tube.',
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
{ CHECK eta_f 0.900515768104082 1e-09 }
{ CHECK eta_o 0.924714635322008 1e-09 }
{ CHECK Q_per_m 7524.14866593597 1e-06 }`,
  },
  {
    id: 'shell-tube-lmtd-sizing',
    title: 'Shell-and-tube sizing by LMTD',
    description: 'Solve (F2). Area and tube count for a 150.75 kW exchanger with two shell passes.',
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
    description: 'Solve (F2). Root-sum-square and worst-case uncertainty of a cantilever deflection.',
    category: 'Uncertainty',
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
    id: 'linear-regression-diagnostics',
    title: 'Linear regression with diagnostics',
    description: 'Solve (F2). Slope, intercept, standard error and correlation of seven points.',
    category: 'Statistics',
    text: `{ Least-squares line through seven points, with the standard error of the
  estimate s_y/x = sqrt(S_r / (n - 2)) and the correlation coefficient.
  Data and published answers: Chapra & Canale, Numerical Methods for
  Engineers, Examples 17.1-17.2 (a1 = 0.8392857, a0 = 0.07142857,
  s_y/x = 0.7735, r = 0.932). The original problem's data was not kept. }
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
{ CHECK s_yx 0.773443136703847 1e-10 }`,
  },
  {
    id: 'quadratic-regression',
    title: 'Quadratic regression',
    description: 'Solve (F2). Second-order polynomial fit of six points, with its standard error.',
    category: 'Statistics',
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
    description: 'Solve (F2). Fit y = alpha x^beta by a straight line through log10 data.',
    category: 'Statistics',
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
    description: 'Solve (F2), then inspect the dynamic table. Central-difference dx/db at t = 5 s for k = 1 and k = 50 N/m.',
    category: 'Sensitivity',
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
    description: 'Solve (F2). Normalized sensitivities of cycle traction energy to mass, drag area and rolling resistance.',
    category: 'Sensitivity',
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
    description: 'Solve (F2). Steady-state error and the sensitivity of the closed loop to plant gain.',
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
]

/** The document new/blank workspaces start from. */
