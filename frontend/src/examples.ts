// Curated, ready-to-solve example documents surfaced to new users (the File
// menu "Open Example", the command palette, and the empty Solution-panel
// shortcuts). Each `text` has been verified to solve with zero unit warnings
// against the backend, so a first-time student can load one and press Solve
// (F2) to see a complete result immediately.
export interface Example {
  id: string
  title: string
  /** One-line summary shown under the title in the picker. */
  description: string
  /** Grouping label in the picker. */
  category: string
  /** The full editor document (markdown notes + equations). */
  text: string
}

export const EXAMPLES: Example[] = [
  {
    id: 'pump-sizing',
    title: 'Pump Sizing',
    description: 'Hydraulic and shaft power from flow rate, head, and efficiency.',
    category: 'Mechanical',
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
    text: `# Projectile Motion
{ A ball launched from the ground at an angle.
  Edit v0 or theta_deg and press Solve (F2). }
g = 9.81 [m/s^2]
v0 = 20 [m/s]            { launch speed }
theta_deg = 35          { launch angle in degrees }
theta = theta_deg * pi / 180

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
]

/** The document new/blank workspaces start from. */
export const DEFAULT_EXAMPLE_TEXT = EXAMPLES[0].text
