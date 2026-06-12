import {
  AppShell,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Title,
  Text,
  Container,
  Code,
  List,
  Paper,
  Stack,
  Table,
  Badge,
  Alert,
  Card,
  Accordion,
  Button,
  SimpleGrid,
  ThemeIcon
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';

function CopyButton({ code }: Readonly<{ code: string }>) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button
      size="xs"
      variant="light"
      color={copied ? "green" : "blue"}
      onClick={handleCopy}
      style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
    >
      {copied ? "Copied!" : "Copy Code"}
    </Button>
  );
}

const CENGEL_EXAMPLES = [
  {
    value: "cengel-10-40",
    title: "Power Cycles: Reheat Rankine Cycle with Moisture Limit (Cengel 10-40)",
    description: "A reheat Rankine cycle where the condenser pressure is itself an unknown, fixed by the requirement that turbine-exit moisture not exceed 5%. frEES finds it implicitly from the quality constraint.",
    note: "Verified against the textbook: condenser pressure 9.73 kPa, net power 10.2 MW, thermal efficiency 36.9%.",
    code: `{ Reheat Rankine Cycle - Cengel 10-40 }
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
h[1] = Enthalpy(Water, P=P[6], x=0)
v[1] = Volume(Water, P=P[6], x=0)

{ State 2: pump exit }
w_pump = v[1] * (P[3] - P[6]) / eta_pump
h[2] = h[1] + w_pump

{ Energy balances }
q_in = (h[3] - h[2]) + (h[5] - h[4])
w_turb = (h[3] - h[4]) + (h[5] - h[6])
w_net = w_turb - w_pump
W_dot_net = m_dot * w_net
eta_th = w_net / q_in * 100`,
  },
  {
    value: "cengel-10-62e",
    title: "Power Cycles: Ideal Reheat-Regenerative Rankine Cycle, English Units (Cengel 10-62E)",
    description: "One reheater and two open feedwater heaters with extractions at 250 and 40 psia. All inputs are in English units (psia, F, Btu/s); frEES converts them to SI automatically and solves the two feedwater-heater mass balances simultaneously.",
    note: "With 4e5 Btu/s of boiler heat input the cycle delivers about 200 MW at 47.4% thermal efficiency.",
    code: `{ Ideal Reheat-Regenerative Rankine Cycle - Cengel 10-62E }
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
eta_th = w_net / q_in * 100`,
  },
  {
    value: "cengel-10-78",
    title: "Power Cycles: Cogeneration Plant with Regeneration (Cengel 10-78)",
    description: "35% of the turbine flow is extracted at 1.6 MPa; one part feeds an open feedwater heater, the rest a process heater. The open-FWH energy balance determines the split.",
    note: "Verified against the textbook: boiler mass flow rate 29.1 kg/s for 25 MW of net power.",
    code: `{ Cogeneration Plant with Regeneration - Cengel 10-78 }
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
Q_dot_process = m_dot * (f_ext - y) * (h[7] - h[3])`,
  },
  {
    value: "cengel-10-28",
    title: "Power Cycles: Binary Geothermal Plant with Isobutane (Cengel 10-28)",
    description: "A binary-cycle plant where geothermal brine at 160 C drives a Rankine cycle on isobutane. The problem supplies the isobutane properties directly, so this is a pure energy-balance system.",
    note: "Results: turbine isentropic efficiency 78.8%, net power 22.6 MW, thermal efficiency 13.7%.",
    code: `{ Binary Geothermal Power Plant with Isobutane - Cengel 10-28 }
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
eta_th = W_dot_net / Q_dot_in * 100`,
  },
  {
    value: "cengel-9-95",
    title: "Gas Turbines: Simple Brayton Cycle with Irreversibilities (Cengel 9-95)",
    description: "A gas-turbine plant between 100 and 1600 kPa with compressor and turbine efficiencies of 85% and 88%. The turbine inlet temperature is unknown and recovered from the known exhaust temperature.",
    note: "Verified against the textbook: net power 6488 kW, back work ratio 0.511, thermal efficiency 37.8%.",
    code: `{ Simple Brayton Cycle with Irreversibilities - Cengel 9-95 }
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
eta_th = w_net / q_in * 100`,
  },
  {
    value: "cengel-9-105",
    title: "Gas Turbines: Automotive Gas Turbine with Regenerator (Cengel 9-105)",
    description: "An isentropic Brayton cycle with a regenerator whose cold stream leaves 10 C cooler than the turbine exhaust entering it. Find the heat addition and rejection rates for 115 kW of net power.",
    note: "Verified against the textbook: heat addition 240 kW, heat rejection 125 kW.",
    code: `{ Automotive Gas Turbine with Regenerator - Cengel 9-105 }
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
Q_dot_out = Q_dot_in - W_dot_net`,
  },
  {
    value: "cengel-9-112",
    title: "Gas Turbines: Brayton Cycle with Regeneration and Variable Specific Heats (Cengel 9-112)",
    description: "Instead of assuming constant specific heats, this model uses real-gas air properties (Enthalpy/Entropy of Air) for the compressor, turbine and regenerator, exactly like the air-table solution in the book.",
    note: "Verified against the textbook: turbine exit temperature 783 K, net work 108 kJ/kg, thermal efficiency 22.5%.",
    code: `{ Brayton Cycle with Regeneration, Variable Specific Heats - Cengel 9-112 }
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
T[4] = Temperature(Air, P=P[1], h=h[4])

{ Regenerator }
h[5] = h[2] + epsilon * (h[4] - h[2])

{ Performance }
q_in = h[3] - h[5]
w_net = w_T - w_C
eta_th = w_net / q_in * 100`,
  },
];

const SECTIONS = [
  { id: 'started', label: '1. Getting Started' },
  { id: 'syntax', label: '2. Equation Syntax & Math' },
  { id: 'variables', label: '3. Variables & Bounds' },
  { id: 'units', label: '4. Units & Consistency' },
  { id: 'arrays', label: '5. Arrays & Loops' },
  { id: 'matrices', label: '6. Matrices & Vectors' },
  { id: 'functions', label: '7. Functions & Procedures' },
  { id: 'modules', label: '8. Modular Submodels' },
  { id: 'thermo', label: '9. Fluid Properties (CoolProp)' },
  { id: 'humidair', label: '10. Psychrometrics (AirH2O)' },
  { id: 'calculus', label: '11. Numerical Integration' },
  { id: 'complex', label: '12. Complex Numbers' },
  { id: 'examples', label: '13. Engineering Examples' },
  { id: 'api', label: '14. Solver Reference & API' },
];

export default function HelpPage() {
  const [opened, { toggle }] = useDisclosure();
  const [active, setActive] = useState('started');

  const renderContent = () => {
    switch (active) {
      case 'started':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">1. Getting Started with frEES</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              Welcome to <strong>frEES</strong> (free Engineering Equation Solver). frEES is a declarative, web-based numerical solver designed for engineers, researchers, and students.
            </Text>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              Unlike procedural languages (like Python, MATLAB, or C++), where you must explicitly rearrange equations to solve for unknowns (e.g. writing <code>x = ...</code>), frEES is <strong>declarative</strong>. You input your equations exactly as they are written in physics and engineering textbooks (e.g. <code>P * V = n * R * T</code>), and the solver automatically determines which variables are unknown, groups equations into blocks, and solves them simultaneously.
            </Text>

            <Alert color="blue" title="The Declarative Philosophy" mt="xs">
              In frEES, <code>x + y = 5</code> and <code>y = 5 - x</code> are completely identical. You do not need to isolate variables; the solver uses advanced graph theory (Tarjan's strongly connected components) to group equations and solve them for you.
            </Alert>

            <Title order={3} mt="sm">The frEES Workflow</Title>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Card shadow="sm" padding="md" radius="md" withBorder bg="dark.8">
                <ThemeIcon color="blue" radius="xl" size="lg" mb="sm">1</ThemeIcon>
                <Text fw={600} size="sm">1. Enter Equations</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Write your algebraic equations in the main editor. Order of equations does not matter. Case is ignored.
                </Text>
              </Card>
              <Card shadow="sm" padding="md" radius="md" withBorder bg="dark.8">
                <ThemeIcon color="indigo" radius="xl" size="lg" mb="sm">2</ThemeIcon>
                <Text fw={600} size="sm">2. Check & Bound</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Press <strong>F4</strong> to compile and check degrees of freedom. Set bounds and initial guesses in <strong>Variable Info</strong>.
                </Text>
              </Card>
              <Card shadow="sm" padding="md" radius="md" withBorder bg="dark.8">
                <ThemeIcon color="cyan" radius="xl" size="lg" mb="sm">3</ThemeIcon>
                <Text fw={600} size="sm">3. Solve & Sweeps</Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Press <strong>F2</strong> to solve. View residuals in the Solution Window. Run parameter sweeps in the <strong>Parametric Table</strong>.
                </Text>
              </Card>
            </SimpleGrid>

            <Title order={3} mt="md">Keyboard Shortcuts (Hotkeys)</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '150px' }}>Hotkey</Table.Th>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Description</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>F4</Code></Table.Td>
                  <Table.Td><strong>Check Equations</strong></Table.Td>
                  <Table.Td>Validates syntax, lists active variables, and checks if the number of equations equals variables.</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>F2</Code></Table.Td>
                  <Table.Td><strong>Solve System</strong></Table.Td>
                  <Table.Td>Runs the simultaneous numerical solver and displays the Solution window.</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Ctrl + I</Code></Table.Td>
                  <Table.Td><strong>Variable Info</strong></Table.Td>
                  <Table.Td>Opens the grid where you can set initial guesses, limits, display units, and display formatting.</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Ctrl + T</Code></Table.Td>
                  <Table.Td><strong>Solve Table</strong></Table.Td>
                  <Table.Td>Runs the solver sequentially for all rows configured in the active Parametric Table.</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="md">Hello World Example</Title>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`x + y = 3\ny = x^2 - 1`} />
              <Code block style={{ background: 'transparent' }}>
                {`x + y = 3\ny = x^2 - 1`}
              </Code>
            </Paper>
            <Text size="sm" c="dimmed">
              Paste this in the Editor, click <strong>Check (F4)</strong> to verify (2 variables, 2 equations), and click <strong>Solve (F2)</strong>. The solver will find the root: <code>x = 1.562</code>, <code>y = 1.438</code>.
            </Text>

            <Title order={3} mt="lg">Markdown Reports & Inline Equations</Title>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              frEES allows you to mix standard Markdown and mathematical equations directly in the <strong>Editor</strong>. When you click <strong>Check</strong> or <strong>Solve</strong>, the solver automatically extracts and evaluates all equations, generating a beautifully integrated <strong>Formatted</strong> report.
            </Text>
            <Alert color="blue" title="Prose with Equations" mt="xs">
              You can write inline variables and equations anywhere in your text. Any statement containing an <code>=</code> sign is automatically parsed as an equation, solved, and formatted as a LaTeX/KaTeX formula.
            </Alert>
            <Alert color="blue" title="Embedding Diagrams & Graphs" mt="xs">
              You can embed property diagrams, psychrometric charts, and X-Y parametric plots directly within your Formatted Report. Simply use the tag <code>{`[Graph="Diagram Name"] Caption Text [/Graph]`}</code>. The solver automatically resolves the diagram name and embeds the interactive plot with auto-incrementing figure numbers.
            </Alert>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`# Ideal Rankine Steam Power Cycle

This report analyzes an ideal Rankine steam power cycle with isentropic efficiency constraints.

## Inputs and Parameters
* Boiler Pressure: P_high = 8000 [kPa]
* Condenser Pressure: P_low = 10 [kPa]
* Boiler Temperature: T_boiler = 500 [C]
* Turbine Isentropic Efficiency: eta_turb = 0.85
* Pump Isentropic Efficiency: eta_pump = 0.90
* Target Net Power Output: W_dot_net = 10000 [kW]

## State 1: HP Turbine Inlet (Superheated Steam)
We evaluate enthalpy and entropy at state 1:
h[1] = Enthalpy(Water, P=P_high, T=T_boiler)
s[1] = Entropy(Water, P=P_high, T=T_boiler)
T[1] = T_boiler

## State 2: Actual Turbine Exit
First we compute the isentropic exit enthalpy:
s_2s = s[1]
h_2s = Enthalpy(Water, P=P_low, s=s_2s)

Then actual exit conditions using isentropic efficiency:
h[2] = h[1] - eta_turb * (h[1] - h_2s)
s[2] = Entropy(Water, P=P_low, h=h[2])
T[2] = Temperature(Water, P=P_low, h=h[2])

## State 3: Condenser Exit (Saturated Liquid)
h[3] = Enthalpy(Water, P=P_low, x=0)
v[3] = Volume(Water, P=P_low, x=0)
s[3] = Entropy(Water, P=P_low, x=0)
T[3] = Temperature(Water, P=P_low, x=0)

## State 4: Actual Pump Exit
s_4s = s[3]
h_4s = Enthalpy(Water, P=P_high, s=s_4s)
h[4] = h[3] + (h_4s - h[3]) / eta_pump
s[4] = Entropy(Water, P=P_high, h=h[4])
T[4] = Temperature(Water, P=P_high, h=h[4])

## Performance Analysis
Let's compute the work and heat rates:
w_turb = h[1] - h[2]
w_pump = h[4] - h[3]
q_boiler = h[1] - h[4]
q_cond = h[2] - h[3]

Net work output, thermal efficiency, and mass flow rate:
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100
W_dot_net = m_dot * w_net

## Visualization
Here is the thermodynamic T-s diagram showing the cycle state points:
[Graph="Diagram 1"] Ts Diagram of the Cycle [/Graph]`} />
              <Code block style={{ background: 'transparent' }}>
                {`# Ideal Rankine Steam Power Cycle

This report analyzes an ideal Rankine steam power cycle with isentropic efficiency constraints.

## Inputs and Parameters
* Boiler Pressure: P_high = 8000 [kPa]
* Condenser Pressure: P_low = 10 [kPa]
* Boiler Temperature: T_boiler = 500 [C]
* Turbine Isentropic Efficiency: eta_turb = 0.85
* Pump Isentropic Efficiency: eta_pump = 0.90
* Target Net Power Output: W_dot_net = 10000 [kW]

## State 1: HP Turbine Inlet (Superheated Steam)
We evaluate enthalpy and entropy at state 1:
h[1] = Enthalpy(Water, P=P_high, T=T_boiler)
s[1] = Entropy(Water, P=P_high, T=T_boiler)
T[1] = T_boiler

## State 2: Actual Turbine Exit
First we compute the isentropic exit enthalpy:
s_2s = s[1]
h_2s = Enthalpy(Water, P=P_low, s=s_2s)

Then actual exit conditions using isentropic efficiency:
h[2] = h[1] - eta_turb * (h[1] - h_2s)
s[2] = Entropy(Water, P=P_low, h=h[2])
T[2] = Temperature(Water, P=P_low, h=h[2])

## State 3: Condenser Exit (Saturated Liquid)
h[3] = Enthalpy(Water, P=P_low, x=0)
v[3] = Volume(Water, P=P_low, x=0)
s[3] = Entropy(Water, P=P_low, x=0)
T[3] = Temperature(Water, P=P_low, x=0)

## State 4: Actual Pump Exit
s_4s = s[3]
h_4s = Enthalpy(Water, P=P_high, s=s_4s)
h[4] = h[3] + (h_4s - h[3]) / eta_pump
s[4] = Entropy(Water, P=P_high, h=h[4])
T[4] = Temperature(Water, P=P_high, h=h[4])

## Performance Analysis
Let's compute the work and heat rates:
w_turb = h[1] - h[2]
w_pump = h[4] - h[3]
q_boiler = h[1] - h[4]
q_cond = h[2] - h[3]

Net work output, thermal efficiency, and mass flow rate:
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100
W_dot_net = m_dot * w_net

## Visualization
Here is the thermodynamic T-s diagram showing the cycle state points:
[Graph="Diagram 1"] Ts Diagram of the Cycle [/Graph]`}
              </Code>
            </Paper>
            <Text size="sm" c="dimmed">
              Paste this example in the <strong>Editor</strong> tab, then toggle the control at the top-right to <strong>Formatted</strong> to see the rendered KaTeX equations and the embedded plot.
            </Text>
          </Stack>
        );
      case 'syntax':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">2. Equation Syntax & Math Functions</Title>
            <Text>
              The Editor allows you to enter relationships between variables using standard mathematical notation.
            </Text>
            <Title order={3}>Rules & Syntax</Title>
            <List spacing="xs">
              <List.Item><strong>Equality:</strong> Use a single equal sign <Code>=</Code> for equations. Do not use assignment operators for declarative equations.</List.Item>
              <List.Item><strong>Case Insensitivity:</strong> <Code>T_inlet</Code>, <Code>T_Inlet</Code>, and <Code>t_inlet</Code> refer to the same variable.</List.Item>
              <List.Item><strong>Comments:</strong> Document your equations using curly braces <Code>{`{ comment }`}</Code> or double quotes <Code>"comment"</Code>. These are ignored by the compiler.</List.Item>
              <List.Item><strong>Multiplication:</strong> Implicit multiplication is not supported. You must write <Code>*</Code> explicitly (e.g., write <Code>2 * x</Code>, not <Code>2x</Code>).</List.Item>
              <List.Item><strong>Operators:</strong> Standard arithmetic operators <Code>+</Code>, <Code>-</Code>, <Code>*</Code>, <Code>/</Code>, and <Code>^</Code> (power) are supported.</List.Item>
            </List>

            <Title order={3} mt="sm">Built-in Mathematical Functions</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '200px' }}>Function</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Example</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>abs(x)</Code></Table.Td>
                  <Table.Td>Absolute value of x</Table.Td>
                  <Table.Td><Code>y = abs(-5.2)</Code> (y = 5.2)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sqrt(x)</Code></Table.Td>
                  <Table.Td>Square root of x</Table.Td>
                  <Table.Td><Code>y = sqrt(16)</Code> (y = 4)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>ln(x)</Code></Table.Td>
                  <Table.Td>Natural logarithm (base e)</Table.Td>
                  <Table.Td><Code>y = ln(exp(1))</Code> (y = 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>log10(x)</Code></Table.Td>
                  <Table.Td>Base-10 logarithm</Table.Td>
                  <Table.Td><Code>y = log10(100)</Code> (y = 2)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>exp(x)</Code></Table.Td>
                  <Table.Td>Exponential function (e^x)</Table.Td>
                  <Table.Td><Code>y = exp(0)</Code> (y = 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sin(x), cos(x), tan(x)</Code></Table.Td>
                  <Table.Td>Trigonometric functions (arguments in **radians**)</Table.Td>
                  <Table.Td><Code>y = sin(pi / 2)</Code> (y = 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>arcsin(x), arccos(x), arctan(x)</Code></Table.Td>
                  <Table.Td>Inverse trigonometric functions (returns **radians**)</Table.Td>
                  <Table.Td><Code>theta = arcsin(1)</Code> (theta = 1.5708)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>atan2(y, x)</Code></Table.Td>
                  <Table.Td>Four-quadrant inverse tangent</Table.Td>
                  <Table.Td><Code>theta = atan2(1, -1)</Code> (theta = 2.3562)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>min(a, b, ...), max(a, b, ...)</Code></Table.Td>
                  <Table.Td>Minimum or maximum of a list of expressions</Table.Td>
                  <Table.Td><Code>y = max(2, x, y[1])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sum(a, b, ...), avg(a, b, ...)</Code></Table.Td>
                  <Table.Td>Sum or average of values (useful with array slices)</Table.Td>
                  <Table.Td><Code>y = sum(x[1..5])</Code></Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        );
      case 'variables':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">3. Variables, Guess Values & Bounds</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Because frEES uses numerical iteration (Newton-Raphson) to solve non-linear simultaneous equations, initial guess values and boundary limits are critical for ensuring solver convergence.
            </Text>

            <Title order={3}>Variable Information Grid</Title>
            <Text>
              Clicking <strong>Variable Info</strong> in the top toolbar (or pressing <Code>Ctrl + I</Code>) opens a modal displaying all variables in the system. For each variable, you can configure:
            </Text>
            <List spacing="xs" mb="sm">
              <List.Item><strong>Guess Value:</strong> The starting point for solver iterations. If an equation has multiple solutions (e.g., $x^2 = 4$), the solver will typically find the root closest to the guess value. By default, all guess values are set to 1.0.</List.Item>
              <List.Item><strong>Lower & Upper Bounds:</strong> Restricts the values the solver can assign to a variable. Newton steps will be clamped to these bounds. Bounds are vital to keep variables within their mathematical or physical domains (e.g. avoiding negative values for pressures, volume, absolute temperature, or concentrations).</List.Item>
              <List.Item><strong>Units:</strong> Set display units for variables (e.g. <code>C</code>, <code>kPa</code>, <code>kJ/kg</code>).</List.Item>
            </List>

            <Alert color="indigo" title="Physical Boundaries Tip">
              If your system involves thermodynamic properties (e.g., steam tables), always set physical bounds. For example, absolute temperature in Kelvin should have a lower bound of <code>0</code>, and pressures should have a lower bound of <code>0.001</code>. This prevents the solver from evaluating unphysical states (like negative pressure) and crashing during intermediate solver steps.
            </Alert>

            <Title order={3} mt="sm">How to Set Initial Guesses</Title>
            <Text size="sm">
              1. Enter your equations and click <strong>Check (F4)</strong>. This compiles the equations and populates the variable list.
              <br/>
              2. Open <strong>Variable Info (Ctrl+I)</strong>.
              <br/>
              3. Identify non-linear variables and supply reasonable physical guesses (e.g. if you expect a pressure of 10 bar, change the guess from <code>1.0</code> to <code>1000 [kPa]</code>).
            </Text>
          </Stack>
        );
      case 'units':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">4. Units & Dimensional Consistency</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frEES features a robust unit conversion and verification engine. Internally, all equations are parsed and calculated strictly in **SI base units** (K, Pa, kg, m, s, etc.) to ensure numerical correctness. However, inputs can be annotated in any unit, and outputs are converted back for display.
            </Text>

            <Title order={3}>Unit Annotations</Title>
            <Text>
              You can attach units to numeric constants by placing them in square brackets immediately following the number:
            </Text>
            <Paper withBorder p="sm" bg="dark.8"><Code block>P_inlet = 101.3 [kPa]</Code></Paper>
            <Text size="sm" c="dimmed">
              This converts 101.3 kPa (101,300 Pa) to SI units internally. When viewing results in the Solution window, frEES will display the value as <code>101.3</code> and set its unit to <code>kPa</code>.
            </Text>

            <Title order={3} mt="sm">The Convert() Function</Title>
            <Text>
              Use the built-in <Code>Convert(fromUnit, toUnit)</Code> function to apply scaling factors. The syntax is:
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`Length_m = 5 [m]\nLength_in = Length_m * Convert(m, in)`} />
              <Code block style={{ background: 'transparent' }}>
                {`Length_m = 5 [m]\nLength_in = Length_m * Convert(m, in)`}
              </Code>
            </Paper>
            <Text size="sm">
              This will evaluate <code>Length_in</code> as <code>196.85 [in]</code>.
            </Text>

            <Title order={3} mt="sm">Dimensional Homogeneity Checks</Title>
            <Text style={{ lineHeight: 1.6 }}>
              When you click **Check** or **Solve**, frEES validates unit consistency. If you add variables with incompatible units (e.g., adding a length to a time, like <code>x = 5 [m] + 3 [s]</code>), frEES will compile and solve the math, but it will display a **Unit Warning** in yellow at the bottom of the screen. Clicking the warning reveals exactly which equations violated unit consistency.
            </Text>
          </Stack>
        );
      case 'arrays':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">5. Arrays & Duplicate Loops</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Arrays are highly useful for modeling multi-stage processes (like distillation columns or multi-stage compressors), finite-difference models, and parameter sweeps.
            </Text>

            <Title order={3}>Array Notation</Title>
            <Text>
              Arrays use square brackets to indicate index values. You can define single-dimensional or multi-dimensional arrays:
            </Text>
            <List spacing="xs" mb="sm">
              <List.Item><Code>T[1] = 300</Code>: First element of array T.</List.Item>
              <List.Item><Code>H[2, 3] = 450</Code>: Element at row 2, column 3 of matrix H.</List.Item>
            </List>

            <Title order={3} mt="sm">The DUPLICATE Block</Title>
            <Text>
              To avoid manually typing out repeating equations, use a <Code>DUPLICATE</Code> loop. This is expanded at compile-time by the parser:
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`N = 5\nDUPLICATE i = 1, N\n  X[i] = i * 10\n  Y[i] = X[i]^2\nEND`} />
              <Code block style={{ background: 'transparent' }}>
                {`N = 5\nDUPLICATE i = 1, N\n  X[i] = i * 10\n  Y[i] = X[i]^2\nEND`}
              </Code>
            </Paper>
            <Text size="sm" c="dimmed">
              This expands into 10 separate equations: <code>X[1] = 10</code>, <code>Y[1] = X[1]^2</code>, ..., <code>X[5] = 50</code>, <code>Y[5] = X[5]^2</code>.
            </Text>

            <Title order={3} mt="sm">Array Slices in Aggregate Functions</Title>
            <Text>
              You can pass slices of arrays using the double-dot <Code>..</Code> range notation as arguments to aggregate functions like <Code>sum</Code>, <Code>avg</Code>, <Code>min</Code>, and <Code>max</Code>:
            </Text>
            <Paper withBorder p="sm" bg="dark.8">
              <Code block>{`Total_X = sum(X[1..5])\nAverage_Y = avg(Y[1..5])`}</Code>
            </Paper>
          </Stack>
        );
      case 'matrices':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">6. Matrices & Vectors</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frEES supports robust vector and matrix algebra. Rather than using runtime libraries that bypass equation dependencies, matrix and vector equations are compiled down to scalar constraint equations solved via Newton's method. This allows full differentiability, respects variable bounds, and works seamlessly with the rest of the solver.
            </Text>

            <Title order={3}>Declaring Vectors & Matrices</Title>
            <Text>
              Vectors and matrices are declared using slice notation or duplicate blocks:
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`v[1..3] = [1, 2, 3]\nA[1..3, 1..3] = 0\nDUPLICATE i = 1, 3\n  A[i,i] = 10\nEND`} />
              <Code block style={{ background: 'transparent' }}>
                {`v[1..3] = [1, 2, 3]\nA[1..3, 1..3] = 0\nDUPLICATE i = 1, 3\n  A[i,i] = 10\nEND`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">Matrix & Vector Operations</Title>
            <Text>
              frEES provides built-in functions for algebraic operations:
            </Text>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Function</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Example Syntax</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>transpose(A)</Code></Table.Td>
                  <Table.Td>Matrix transpose</Table.Td>
                  <Table.Td><Code>B[1..3, 1..3] = transpose(A[1..2, 1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>inverse(A)</Code></Table.Td>
                  <Table.Td>Matrix inverse</Table.Td>
                  <Table.Td><Code>A_inv[1..3, 1..3] = inverse(A[1..3, 1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>dot(u, v)</Code></Table.Td>
                  <Table.Td>Vector dot product (scalar outcome)</Table.Td>
                  <Table.Td><Code>d = dot(u[1..3], v[1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>norm(v)</Code></Table.Td>
                  <Table.Td>Vector Euclidean ($L_2$) norm</Table.Td>
                  <Table.Td><Code>mag = norm(v[1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>cross(u, v)</Code></Table.Td>
                  <Table.Td>3D vector cross product</Table.Td>
                  <Table.Td><Code>w[1..3] = cross(u[1..3], v[1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>determinant(A)</Code></Table.Td>
                  <Table.Td>Matrix determinant (scalar outcome)</Table.Td>
                  <Table.Td><Code>det = determinant(A[1..3, 1..3])</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>SolveLinear(A, b)</Code></Table.Td>
                  <Table.Td>Solves the linear system $A \cdot x = b$ for vector $x$</Table.Td>
                  <Table.Td><Code>x[1..3] = SolveLinear(A[1..3, 1..3], b[1..3])</Code></Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="sm">Triangular & Euler Decompositions</Title>
            <Text>
              Procedural submodels are available via the <Code>CALL</Code> statement for matrix factorizations and rotational dynamics:
            </Text>
            <List spacing="xs">
              <List.Item>
                <strong>LU Decomposition:</strong> Factorizes square matrix $A$ into lower triangular $L$ (with unit diagonal) and upper triangular $U$:
                <Code block mt="xs">{`CALL LUDecompose(A[1..3,1..3] : L[1..3,1..3], U[1..3,1..3])`}</Code>
              </List.Item>
              <List.Item>
                <strong>Euler rotation matrix:</strong> Generates a ZXZ rotation matrix $R$ based on Euler angles $\phi, \theta, \psi$ (in radians):
                <Code block mt="xs">{`CALL EulerRotate(phi, theta, psi : R[1..3, 1..3])`}</Code>
              </List.Item>
              <List.Item>
                <strong>Euler decomposition:</strong> Extracts ZXZ Euler angles $\phi, \theta, \psi$ from a 3D rotation matrix $R$:
                <Code block mt="xs">{`CALL EulerDecompose(R[1..3,1..3] : phi, theta, psi)`}</Code>
              </List.Item>
              <List.Item>
                <strong>Eigenvalues:</strong> Computes the eigenvalues of a square matrix $A$, reported in ascending order. The matrix entries may themselves be unknowns — the decomposition runs once they are solved:
                <Code block mt="xs">{`CALL Eigenvalues(A[1..3,1..3] : lambda[1..3])`}</Code>
              </List.Item>
              <List.Item>
                <strong>Eigenvalues & eigenvectors:</strong> Also returns the matrix $V$ whose column $k$ is the unit eigenvector of $\lambda_k$ (largest-magnitude component made positive). Real spectra only — symmetric matrices always qualify:
                <Code block mt="xs">{`CALL Eigen(A[1..3,1..3] : lambda[1..3], V[1..3,1..3])`}</Code>
              </List.Item>
            </List>

            <Title order={3} mt="sm">Practical Example: Linear System Solving</Title>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`A[1,1] = 2;  A[1,2] = 1;  A[1,3] = -1\nA[2,1] = -3; A[2,2] = -1; A[2,3] = 2\nA[3,1] = -2; A[3,2] = 1;  A[3,3] = 2\n\nb[1..3] = [8, -11, -3]\n\nx[1..3] = SolveLinear(A[1..3,1..3], b[1..3])`} />
              <Code block style={{ background: 'transparent' }}>
                {`A[1,1] = 2;  A[1,2] = 1;  A[1,3] = -1\nA[2,1] = -3; A[2,2] = -1; A[2,3] = 2\nA[3,1] = -2; A[3,2] = 1;  A[3,3] = 2\n\nb[1..3] = [8, -11, -3]\n\nx[1..3] = SolveLinear(A[1..3,1..3], b[1..3])`}
              </Code>
            </Paper>
          </Stack>
        );
      case 'functions':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">7. Functions & Procedures (Imperative Logic)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              While the global Editor window is declarative and order-independent, you can write procedural, sequential logic using **Functions** and **Procedures**. Inside these blocks, code is executed top-to-bottom.
            </Text>

            <Title order={3}>Functions (Scalar output)</Title>
            <Text size="sm">
              Functions take inputs and return a single, scalar value. Inside a function body:
              <br/>
              - Assign values using the sequential assignment operator <Code>:=</Code>.
              <br/>
              - Control flow is supported using <Code>IF-THEN-ELSE-END</Code> and <Code>REPEAT-UNTIL</Code> loops.
              <br/>
              - Assign the final returned value to the function's name.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`FUNCTION FrictionFactor(Re, epsilon_d)\n  IF Re < 2300 THEN\n    FrictionFactor := 64 / Re\n  ELSE\n    { Turbulent flow - Haaland approximation }\n    FrictionFactor := (1.8 * log10((epsilon_d / 3.7)^1.11 + 6.9 / Re))^-2\n  END\nEND\n\n{ Call function directly in equations }\nf = FrictionFactor(25000, 0.001)`} />
              <Code block style={{ background: 'transparent' }}>
                {`FUNCTION FrictionFactor(Re, epsilon_d)
  IF Re < 2300 THEN
    FrictionFactor := 64 / Re
  ELSE
    { Turbulent flow - Haaland approximation }
    FrictionFactor := (1.8 * log10((epsilon_d / 3.7)^1.11 + 6.9 / Re))^-2
  END
END

{ Call function directly in equations }
f = FrictionFactor(25000, 0.001)`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">Procedures (Multiple outputs)</Title>
            <Text size="sm">
              Procedures execute sequentially and can return multiple values.
              <br/>
              - Define the inputs and outputs separated by a colon <Code>:</Code> in the parameter list.
              <br/>
              - Invoke using a <Code>CALL</Code> statement.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`PROCEDURE CylinderGeo(diameter, height : area, volume)\n  radius := diameter / 2\n  area := 2 * pi * radius * (radius + height)\n  volume := pi * radius^2 * height\nEND\n\n{ Call procedure }\nCALL CylinderGeo(0.5, 2.0 : A_cyl, V_cyl)`} />
              <Code block style={{ background: 'transparent' }}>
                {`PROCEDURE CylinderGeo(diameter, height : area, volume)
  radius := diameter / 2
  area := 2 * pi * radius * (radius + height)
  volume := pi * radius^2 * height
END

{ Call procedure }
CALL CylinderGeo(0.5, 2.0 : A_cyl, V_cyl)`}
              </Code>
            </Paper>
          </Stack>
        );
      case 'modules':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">8. Modular Submodels (Modules)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              A <strong>Module</strong> is a declarative submodel. Unlike procedures (which solve sequentially), modules contain equations that are grafted directly into the global system of equations and solved <strong>simultaneously</strong>.
            </Text>

            <Title order={3}>Defining and Calling Modules</Title>
            <Text size="sm">
              - Define inputs and outputs separated by a colon <Code>:</Code>.
              <br/>
              - Write declarative equations inside using the standard equality operator <Code>=</Code>.
              <br/>
              - When called, the solver automatically prefixes all internal variables inside the module with a unique namespace (e.g. <code>m1.temp</code>, <code>m2.temp</code>) so they do not conflict.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`MODULE ParallelPipe(P1, P2, D, L, rho, mu : m_dot)\n  { Friction factors and mass flow relations inside the module }\n  delta_P = P1 - P2\n  delta_P = f * (L / D) * (rho * V^2 / 2)\n  Re = rho * V * D / mu\n  f = 64 / Re { Laminar flow assumption }\n  A = pi * D^2 / 4\n  m_dot = rho * V * A\nEND\n\n{ Call module - equations solved simultaneously with main system }\nCALL ParallelPipe(150 [kPa], 100 [kPa], 0.05, 10, 1000, 0.001 : m_flow_1)\nCALL ParallelPipe(150 [kPa], 100 [kPa], 0.08, 10, 1000, 0.001 : m_flow_2)\nm_flow_total = m_flow_1 + m_flow_2`} />
              <Code block style={{ background: 'transparent' }}>
                {`MODULE ParallelPipe(P1, P2, D, L, rho, mu : m_dot)
  { Friction factors and mass flow relations inside the module }
  delta_P = P1 - P2
  delta_P = f * (L / D) * (rho * V^2 / 2)
  Re = rho * V * D / mu
  f = 64 / Re { Laminar flow assumption }
  A = pi * D^2 / 4
  m_dot = rho * V * A
END

{ Call module - equations solved simultaneously with main system }
CALL ParallelPipe(150 [kPa], 100 [kPa], 0.05, 10, 1000, 0.001 : m_flow_1)
CALL ParallelPipe(150 [kPa], 100 [kPa], 0.08, 10, 1000, 0.001 : m_flow_2)
m_flow_total = m_flow_1 + m_flow_2`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">PROCEDURE vs MODULE</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '150px' }}>Feature</Table.Th>
                  <Table.Th>Procedure</Table.Th>
                  <Table.Th>Module</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><strong>Execution Mode</strong></Table.Td>
                  <Table.Td>Sequential (imperative, top-to-bottom)</Table.Td>
                  <Table.Td>Simultaneous (declarative equations added to global system)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Assignment</strong></Table.Td>
                  <Table.Td>Uses assignment operator <Code>:=</Code></Table.Td>
                  <Table.Td>Uses equality operator <Code>=</Code></Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Control Flow</strong></Table.Td>
                  <Table.Td>Supports <Code>IF</Code>, <Code>REPEAT-UNTIL</Code></Table.Td>
                  <Table.Td>Not supported (must use mathematical algebraic equations)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><strong>Use Cases</strong></Table.Td>
                  <Table.Td>Explicit calculations, complex procedural logic</Table.Td>
                  <Table.Td>Reusable sub-assemblies, physical equipment blocks</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        );
      case 'thermo':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">9. Thermodynamic Fluid Properties (CoolProp)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frEES is equipped with a direct bridge to the industry-standard **CoolProp** thermodynamic database, allowing you to fetch high-accuracy properties for dozens of fluids.
            </Text>

            <Title order={3}>Syntax & Structure</Title>
            <Text>
              Property calls require a fluid name as the first argument, followed by exactly **two** independent state variables (using named syntax):
            </Text>
            <Paper withBorder p="sm" bg="dark.8">
              <Code block>{`Result = PropertyFunction(FluidName, InputIndicator1 = Value1, InputIndicator2 = Value2)`}</Code>
            </Paper>
            <Text size="sm">
              Example: <code>h1 = Enthalpy(R134a, T=25 [C], P=100 [kPa])</code>
            </Text>

            <Title order={3} mt="sm">Supported Fluid Names</Title>
            <Group gap="xs">
              <Badge color="blue" variant="filled">Water</Badge>
              <Badge color="blue" variant="filled">Steam</Badge>
              <Badge color="indigo" variant="filled">Air</Badge>
              <Badge color="cyan" variant="filled">CarbonDioxide (R744)</Badge>
              <Badge color="cyan" variant="filled">Nitrogen</Badge>
              <Badge color="cyan" variant="filled">Oxygen</Badge>
              <Badge color="cyan" variant="filled">Hydrogen</Badge>
              <Badge color="cyan" variant="filled">Helium</Badge>
              <Badge color="cyan" variant="filled">Argon</Badge>
              <Badge color="teal" variant="filled">Methane</Badge>
              <Badge color="teal" variant="filled">Ethane</Badge>
              <Badge color="teal" variant="filled">Propane (R290)</Badge>
              <Badge color="teal" variant="filled">Isobutane (R600a)</Badge>
              <Badge color="teal" variant="filled">Butane (R600)</Badge>
              <Badge color="violet" variant="filled">R134a</Badge>
              <Badge color="violet" variant="filled">R12</Badge>
              <Badge color="violet" variant="filled">R22</Badge>
              <Badge color="violet" variant="filled">R32</Badge>
              <Badge color="violet" variant="filled">R123</Badge>
              <Badge color="violet" variant="filled">R245fa</Badge>
              <Badge color="violet" variant="filled">R404a</Badge>
              <Badge color="violet" variant="filled">R407c</Badge>
              <Badge color="violet" variant="filled">R410a</Badge>
              <Badge color="violet" variant="filled">R1234yf</Badge>
              <Badge color="violet" variant="filled">R1234ze</Badge>
              <Badge color="pink" variant="filled">Ammonia (R717)</Badge>
            </Group>

            <Title order={3} mt="sm">Available Property Functions</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Function Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>SI Unit</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>Temperature</Code></Table.Td>
                  <Table.Td>Absolute Temperature</Table.Td>
                  <Table.Td>K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Pressure</Code></Table.Td>
                  <Table.Td>Absolute Pressure</Table.Td>
                  <Table.Td>Pa</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Enthalpy</Code></Table.Td>
                  <Table.Td>Specific Enthalpy</Table.Td>
                  <Table.Td>J/kg</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Entropy</Code></Table.Td>
                  <Table.Td>Specific Entropy</Table.Td>
                  <Table.Td>J/kg-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>IntEnergy</Code></Table.Td>
                  <Table.Td>Specific Internal Energy</Table.Td>
                  <Table.Td>J/kg</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Density</Code></Table.Td>
                  <Table.Td>Mass Density</Table.Td>
                  <Table.Td>kg/m³</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Volume</Code></Table.Td>
                  <Table.Td>Specific Volume (1 / Density)</Table.Td>
                  <Table.Td>m³/kg</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Quality</Code></Table.Td>
                  <Table.Td>Vapor quality (vapor mass fraction)</Table.Td>
                  <Table.Td>dimensionless (0 to 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Cp</Code> or <Code>specheat</Code></Table.Td>
                  <Table.Td>Specific heat at constant pressure</Table.Td>
                  <Table.Td>J/kg-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Cv</Code></Table.Td>
                  <Table.Td>Specific heat at constant volume</Table.Td>
                  <Table.Td>J/kg-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Viscosity</Code></Table.Td>
                  <Table.Td>Dynamic Viscosity</Table.Td>
                  <Table.Td>Pa-s</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Conductivity</Code></Table.Td>
                  <Table.Td>Thermal Conductivity</Table.Td>
                  <Table.Td>W/m-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Soundspeed</Code></Table.Td>
                  <Table.Td>Speed of Sound</Table.Td>
                  <Table.Td>m/s</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="sm">Input Indicators</Title>
            <Text size="sm">
              To query a state, use the following indicators as names:
              <br/>
              - <Code>T</Code>: Temperature
              <br/>
              - <Code>P</Code>: Pressure
              <br/>
              - <Code>H</Code>: Enthalpy
              <br/>
              - <Code>S</Code>: Entropy
              <br/>
              - <Code>U</Code>: Internal Energy
              <br/>
              - <Code>X</Code> or <Code>Q</Code>: Quality (vapor fraction, e.g. <code>x=1</code> for saturated vapor)
              <br/>
              - <Code>V</Code>, <Code>D</Code>, or <Code>Rho</Code>: density or specific volume
            </Text>

            <Title order={3} mt="sm">Ideal Gases (Chemical Formulas)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Spelled chemical formulas select <strong>ideal-gas</strong> property routines whose enthalpy
              is referenced to the <strong>enthalpy of formation at 298.15 K, 1 atm</strong> — the
              convention that makes combustion energy balances work directly (EES behavior).{' '}
              <code>Enthalpy(CO2, T=298.15)</code> returns −8941.6 kJ/kg, not 0. Full names
              (Nitrogen, CarbonDioxide, Methane) keep the real-fluid CoolProp models above.
            </Text>
            <Group gap="xs">
              <Badge color="orange" variant="filled">N2</Badge>
              <Badge color="orange" variant="filled">O2</Badge>
              <Badge color="orange" variant="filled">CO2</Badge>
              <Badge color="orange" variant="filled">CO</Badge>
              <Badge color="orange" variant="filled">H2O</Badge>
              <Badge color="orange" variant="filled">H2</Badge>
              <Badge color="orange" variant="filled">CH4</Badge>
              <Badge color="orange" variant="filled">C2H6</Badge>
              <Badge color="orange" variant="filled">C3H8</Badge>
              <Badge color="orange" variant="filled">C4H10</Badge>
              <Badge color="orange" variant="filled">C2H4</Badge>
              <Badge color="orange" variant="filled">C2H2</Badge>
              <Badge color="orange" variant="filled">SO2</Badge>
              <Badge color="orange" variant="filled">NO</Badge>
              <Badge color="orange" variant="filled">NO2</Badge>
            </Group>
            <Text size="sm" style={{ lineHeight: 1.6 }}>
              Ideal-gas enthalpy depends on temperature only: <code>h = Enthalpy(N2, T=1000)</code>.
              Entropy is absolute (third law) and needs the pressure:{' '}
              <code>s = Entropy(N2, T=400, P=101325)</code>. Also available:{' '}
              <Code>IntEnergy(gas, T=...)</Code>, <Code>Cp</Code>/<Code>Cv(gas, T=...)</Code>,{' '}
              <Code>Volume(gas, T=..., P=...)</Code>, and the inverses{' '}
              <Code>Temperature(gas, h=...)</Code> and <Code>Temperature(gas, s=..., P=...)</Code>.
              Specific heats use the Cengel A-2(c) polynomial fits, valid through flame
              temperatures — far beyond the real-fluid equations of state.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`{ Adiabatic flame temperature with ideal-gas functions }
{ CH4 + 2 O2 + 7.52 N2 -> CO2 + 2 H2O + 7.52 N2; per kmol of fuel }
M_ch4 = 16.043
M_o2 = 31.999
M_n2 = 28.013
M_co2 = 44.01
M_h2o = 18.015
T_in = 298.15 [K]
H_react = 1 * M_ch4 * Enthalpy(CH4, T=T_in) / 1000 + 2 * M_o2 * Enthalpy(O2, T=T_in) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_in) / 1000
H_prod = 1 * M_co2 * Enthalpy(CO2, T=T_flame) / 1000 + 2 * M_h2o * Enthalpy(H2O, T=T_flame) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_flame) / 1000
H_react = H_prod`} />
              <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                {`{ Adiabatic flame temperature with ideal-gas functions }
{ CH4 + 2 O2 + 7.52 N2 -> CO2 + 2 H2O + 7.52 N2; per kmol of fuel }
M_ch4 = 16.043
M_o2 = 31.999
M_n2 = 28.013
M_co2 = 44.01
M_h2o = 18.015
T_in = 298.15 [K]
H_react = 1 * M_ch4 * Enthalpy(CH4, T=T_in) / 1000 + 2 * M_o2 * Enthalpy(O2, T=T_in) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_in) / 1000
H_prod = 1 * M_co2 * Enthalpy(CO2, T=T_flame) / 1000 + 2 * M_h2o * Enthalpy(H2O, T=T_flame) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_flame) / 1000
H_react = H_prod`}
              </Code>
            </Paper>
          </Stack>
        );
      case 'humidair':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">10. Psychrometrics (AirH2O / Humid Air)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Psychrometric calculations (heating, cooling, and humidifying moist air) are a core pillar of HVAC engineering. frEES provides dedicated functions for moist air by calling the specialized <code>AirH2O</code> (or <code>HumidAir</code>) database.
            </Text>

            <Title order={3}>The 3-Indicator Requirement</Title>
            <Text>
              Unlike pure fluids (which require 2 properties), moist air has an additional degree of freedom: the amount of water vapor. Therefore, you must specify exactly **three** indicators. Typically, one of these is the absolute pressure <Code>P</Code>.
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`P_atm = 101325 [Pa]\nT_db = 25 [C]\nRH = 0.60 { 60% relative humidity }\n\nh = Enthalpy(AirH2O, T=T_db, P=P_atm, R=RH)\nw = HumRat(AirH2O, T=T_db, P=P_atm, R=RH)\nT_wb = WetBulb(AirH2O, T=T_db, P=P_atm, R=RH)`} />
              <Code block style={{ background: 'transparent' }}>
                {`P_atm = 101325 [Pa]
T_db = 25 [C]
RH = 0.60 { 60% relative humidity }

h = Enthalpy(AirH2O, T=T_db, P=P_atm, R=RH)
w = HumRat(AirH2O, T=T_db, P=P_atm, R=RH)
T_wb = WetBulb(AirH2O, T=T_db, P=P_atm, R=RH)`}
              </Code>
            </Paper>

            <Title order={3} mt="sm">Available Psychrometric Functions</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Function Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>SI Unit</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>Enthalpy</Code></Table.Td>
                  <Table.Td>Enthalpy per unit mass of **dry air**</Table.Td>
                  <Table.Td>J/kg-dry-air</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Entropy</Code></Table.Td>
                  <Table.Td>Entropy per unit mass of **dry air**</Table.Td>
                  <Table.Td>J/kg-dry-air-K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Temperature</Code></Table.Td>
                  <Table.Td>Dry-bulb Temperature</Table.Td>
                  <Table.Td>K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Volume</Code></Table.Td>
                  <Table.Td>Specific volume of mixture per mass of **dry air**</Table.Td>
                  <Table.Td>m³/kg-dry-air</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>HumRat</Code></Table.Td>
                  <Table.Td>Humidity Ratio (mass of water / mass of dry air)</Table.Td>
                  <Table.Td>kg-water/kg-dry-air</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>RelHum</Code></Table.Td>
                  <Table.Td>Relative Humidity</Table.Td>
                  <Table.Td>dimensionless (0 to 1)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>WetBulb</Code></Table.Td>
                  <Table.Td>Wet-bulb Temperature</Table.Td>
                  <Table.Td>K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>DewPoint</Code></Table.Td>
                  <Table.Td>Dew-point Temperature</Table.Td>
                  <Table.Td>K</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>Cp</Code> or <Code>specheat</Code></Table.Td>
                  <Table.Td>Specific heat capacity of moist air per mass of dry air</Table.Td>
                  <Table.Td>J/kg-dry-air-K</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Title order={3} mt="sm">Psychrometric Input Indicators</Title>
            <Text size="sm">
              Define the state using these letters:
              <br/>
              - <Code>T</Code>: Dry-bulb Temperature
              <br/>
              - <Code>P</Code>: Total Pressure
              <br/>
              - <Code>H</Code>: Enthalpy
              <br/>
              - <Code>S</Code>: Entropy
              <br/>
              - <Code>V</Code>: Specific volume
              <br/>
              - <Code>W</Code>: Humidity ratio (humidity ratio)
              <br/>
              - <Code>R</Code> or <Code>RH</Code>: Relative humidity
              <br/>
              - <Code>B</Code> or <Code>Twb</Code>: Wet-bulb temperature
              <br/>
              - <Code>D</Code> or <Code>Tdp</Code>: Dew-point temperature
            </Text>
          </Stack>
        );
      case 'calculus':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">11. Numerical Integration (ODEs & Calculus)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              frEES includes equation-based calculus solvers that run numerical integration. You can compute integrals and solve systems containing first-order Ordinary Differential Equations (ODEs) alongside standard algebraic equations.
            </Text>

            <Title order={3}>Syntax</Title>
            <Text>
              To integrate an expression, use the built-in <Code>Integral</Code> function, which must appear **alone** on one side of an equation:
            </Text>
            <Paper withBorder p="sm" bg="dark.8">
              <Code block>{`Result = Integral(IntegrandExpression, IntegrationVar, LowerLimit, UpperLimit [, StepSize])`}</Code>
            </Paper>

            <Title order={3} mt="sm">Theoretical Foundation</Title>
            <Text style={{ lineHeight: 1.6 }}>
              The integration variable (e.g. <code>t</code>) is stepped from the lower limit to the upper limit. At each step, the solver treats <code>t</code> as a temporary constant and solves the remaining algebraic equations in the system. The integrand expression is then evaluated, and accumulation is computed using a **second-order predictor-corrector** (Euler predictor, trapezoidal corrector) scheme.
            </Text>
            <List spacing="xs" mb="sm">
              <List.Item><strong>Adaptive Step Sizing:</strong> If the 5th argument is omitted, frEES automatically varies the step size to satisfy a relative error tolerance of 1e-6.</List.Item>
              <List.Item><strong>Fixed Step Sizing:</strong> If you supply a positive number as the 5th argument, frEES forces the solver to take exactly that step size.</List.Item>
            </List>

            <Title order={3} mt="sm">Solving first-order ODEs</Title>
            <Text>
              An ODE dy/dt = f(t, y) with initial condition y(t0) = y0 can be modeled as:
            </Text>
            <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
              <CopyButton code={`y = y0 + Integral(dydt, t, 0, 5)\ndydt = y * cos(t)\ny0 = 1`} />
              <Code block style={{ background: 'transparent' }}>
                {`y = y0 + Integral(dydt, t, 0, 5)
dydt = y * cos(t)
y0 = 1`}
              </Code>
            </Paper>
            <Text size="sm">
              The analytical solution is y(t) = exp(sin(t)). At t = 5, the solver will converge to y = 0.3833.
            </Text>
          </Stack>
        );
      case 'complex':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">12. Complex Number Arithmetic</Title>
            <Text style={{ lineHeight: 1.6 }}>
              Electrical, vibration, and control engineering models frequently rely on complex number arithmetic. frEES supports full complex variables when **Complex Mode** is active.
            </Text>

            <Title order={3}>Activating Complex Mode</Title>
            <Text>
              You can toggle Complex Mode using the action bar or settings. Once active, frEES automatically:
              <br/>
              1. Treats every variable as having a real component (suffix <code>_r</code>) and an imaginary component (suffix <code>_i</code>).
              <br/>
              2. Doubles the system dimensions (a system of $N$ variables becomes a simultaneous system of $2N$ real equations).
            </Text>

            <Title order={3} mt="sm">Imaginary Constants</Title>
            <Text>
              Enter imaginary numbers using the notation <Code>1i</Code> or <Code>1j</Code>:
            </Text>
            <Paper withBorder p="sm" bg="dark.8"><Code block>{`z1 = 3 + 4i\nz2 = 5 - 2j`}</Code></Paper>

            <Title order={3} mt="sm">Supported Complex Functions</Title>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: '150px' }}>Function</Table.Th>
                  <Table.Th>Description</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Code>real(z)</Code></Table.Td>
                  <Table.Td>Extracts the real part of z</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>imag(z)</Code></Table.Td>
                  <Table.Td>Extracts the imaginary part of z</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>abs(z)</Code></Table.Td>
                  <Table.Td>Computes the magnitude / absolute value of complex z</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sin(z), cos(z)</Code></Table.Td>
                  <Table.Td>Complex sine and cosine</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>exp(z)</Code></Table.Td>
                  <Table.Td>Complex exponential ($e^z$)</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>ln(z)</Code></Table.Td>
                  <Table.Td>Complex natural logarithm</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Code>sqrt(z)</Code></Table.Td>
                  <Table.Td>Complex square root</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Alert color="indigo" title="Finding Phase Angles without atan2">
              Since <code>atan2</code> is not supported directly in complex mode, you can solve for a real phase angle <code>theta</code> declaratively using the solver itself:
              <Paper withBorder p="sm" mt="xs" bg="dark.9">
                <Code block>{`z = 3 + 4i\nreal(z) = abs(z) * cos(theta)\nimag(z) = abs(z) * sin(theta)`}</Code>
              </Paper>
              The solver will solve for <code>theta</code> in radians simultaneously!
            </Alert>
          </Stack>
        );
      case 'examples':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">13. Engineering Examples & Case Studies</Title>
            <Text>
              These real-world examples highlight how students and engineers can use frEES to model multi-domain physics and thermodynamic cycles.
            </Text>

            <Accordion variant="separated">
              <Accordion.Item value="mech">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Mechanical Engineering: Ideal Rankine Steam Cycle</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    This example analyzes an ideal Rankine steam power cycle, computing state enthalpies, turbine work, pump work, thermal efficiency, and mass flow rate.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Ideal Rankine Steam Power Cycle }\nP_high = 8000 [kPa]  { Boiler pressure }\nP_low = 10 [kPa]     { Condenser pressure }\nT_boiler = 500 [C]   { Boiler temperature }\neta_turb = 0.85      { Isentropic turbine efficiency }\neta_pump = 0.90      { Isentropic pump efficiency }\nW_dot_net = 10000 [kW] { Target net power output }\n\n{ State 1: Turbine Inlet (Superheated Steam) }\nh[1] = Enthalpy(Water, P=P_high, T=T_boiler)\ns[1] = Entropy(Water, P=P_high, T=T_boiler)\nT[1] = T_boiler\n\n{ State 2s: Isentropic Turbine Exit }\ns_2s = s[1]\nh_2s = Enthalpy(Water, P=P_low, s=s_2s)\n\n{ State 2: Actual Turbine Exit }\nh[2] = h[1] - eta_turb * (h[1] - h_2s)\ns[2] = Entropy(Water, P=P_low, h=h[2])\nT[2] = Temperature(Water, P=P_low, h=h[2])\n\n{ State 3: Condenser Exit (Saturated Liquid) }\nh[3] = Enthalpy(Water, P=P_low, x=0)\nv[3] = Volume(Water, P=P_low, x=0)\ns[3] = Entropy(Water, P=P_low, x=0)\nT[3] = Temperature(Water, P=P_low, x=0)\n\n{ State 4s: Isentropic Pump Exit }\ns_4s = s[3]\nh_4s = Enthalpy(Water, P=P_high, s=s_4s)\n\n{ State 4: Actual Pump Exit }\nh[4] = h[3] + (h_4s - h[3]) / eta_pump\ns[4] = Entropy(Water, P=P_high, h=h[4])\nT[4] = Temperature(Water, P=P_high, h=h[4])\n\n{ Work and Heat Transfers }\nw_turb = h[1] - h[2]\nw_pump = h[4] - h[3]\nq_boiler = h[1] - h[4]\nq_cond = h[2] - h[3]\n\n{ Performance Parameters }\nw_net = w_turb - w_pump\neta_th = w_net / q_boiler * 100\n\n{ Mass flow rate needed for 10 MW net power }\nW_dot_net = m_dot * w_net`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ Ideal Rankine Steam Power Cycle }
P_high = 8000 [kPa]  { Boiler pressure }
P_low = 10 [kPa]     { Condenser pressure }
T_boiler = 500 [C]   { Boiler temperature }
eta_turb = 0.85      { Isentropic turbine efficiency }
eta_pump = 0.90      { Isentropic pump efficiency }
W_dot_net = 10000 [kW] { Target net power output }

{ State 1: Turbine Inlet (Superheated Steam) }
h[1] = Enthalpy(Water, P=P_high, T=T_boiler)
s[1] = Entropy(Water, P=P_high, T=T_boiler)
T[1] = T_boiler

{ State 2s: Isentropic Turbine Exit }
s_2s = s[1]
h_2s = Enthalpy(Water, P=P_low, s=s_2s)

{ State 2: Actual Turbine Exit }
h[2] = h[1] - eta_turb * (h[1] - h_2s)
s[2] = Entropy(Water, P=P_low, h=h[2])
T[2] = Temperature(Water, P=P_low, h=h[2])

{ State 3: Condenser Exit (Saturated Liquid) }
h[3] = Enthalpy(Water, P=P_low, x=0)
v[3] = Volume(Water, P=P_low, x=0)
s[3] = Entropy(Water, P=P_low, x=0)
T[3] = Temperature(Water, P=P_low, x=0)

{ State 4s: Isentropic Pump Exit }
s_4s = s[3]
h_4s = Enthalpy(Water, P=P_high, s=s_4s)

{ State 4: Actual Pump Exit }
h[4] = h[3] + (h_4s - h[3]) / eta_pump
s[4] = Entropy(Water, P=P_high, h=h[4])
T[4] = Temperature(Water, P=P_high, h=h[4])

{ Work and Heat Transfers }
w_turb = h[1] - h[2]
w_pump = h[4] - h[3]
q_boiler = h[1] - h[4]
q_cond = h[2] - h[3]

{ Performance Parameters }
w_net = w_turb - w_pump
eta_th = w_net / q_boiler * 100

{ Mass flow rate needed for 10 MW net power }
W_dot_net = m_dot * w_net`}
                    </Code>
                  </Paper>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="elec">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Electrical Engineering: AC Load Power Factor Correction</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    This example analyzes a parallel inductive load (like an electric motor) and determines the capacitor value needed to correct the power factor from 0.70 to a target of 0.98. Enable **Complex Mode** for this example.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ AC Power Factor Correction - Enable Complex Mode! }\nV_rms = 230 + 0i      { Grid Voltage }\nf = 50 [Hz]           { Grid Frequency }\nomega = 2 * pi * f    { Angular Frequency }\n\n{ Inductive Load (e.g. Motor) }\nR_load = 15 [ohm]\nL_load = 0.05 [H]\nZ_load = R_load + 1i * omega * L_load\n\n{ Uncorrected Circuit Analysis }\nI_load = V_rms / Z_load\nS_uncorrected = V_rms * (real(I_load) - 1i * imag(I_load)) { V * conj(I) }\nP_active = real(S_uncorrected)\nQ_reactive_old = imag(S_uncorrected)\nPF_old = P_active / abs(S_uncorrected)\n\n{ Target Power Factor (0.98) }\nPF_new = 0.98\nS_corrected_mag = P_active / PF_new\nQ_reactive_new = sqrt(S_corrected_mag^2 - P_active^2)\n\n{ Reactive power needed from Capacitor }\nQ_c = Q_reactive_old - Q_reactive_new\n\n{ Capacitor impedance and capacitance }\nQ_c = abs(V_rms)^2 / abs(Z_c)\nZ_c = -1i / (omega * C_corr)`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ AC Power Factor Correction - Enable Complex Mode! }
V_rms = 230 + 0i      { Grid Voltage }
f = 50 [Hz]           { Grid Frequency }
omega = 2 * pi * f    { Angular Frequency }

{ Inductive Load (e.g. Motor) }
R_load = 15 [ohm]
L_load = 0.05 [H]
Z_load = R_load + 1i * omega * L_load

{ Uncorrected Circuit Analysis }
I_load = V_rms / Z_load
S_uncorrected = V_rms * (real(I_load) - 1i * imag(I_load)) { V * conj(I) }
P_active = real(S_uncorrected)
Q_reactive_old = imag(S_uncorrected)
PF_old = P_active / abs(S_uncorrected)

{ Target Power Factor (0.98) }
PF_new = 0.98
S_corrected_mag = P_active / PF_new
Q_reactive_new = sqrt(S_corrected_mag^2 - P_active^2)

{ Reactive power needed from Capacitor }
Q_c = Q_reactive_old - Q_reactive_new

{ Capacitor impedance and capacitance }
Q_c = abs(V_rms)^2 / abs(Z_c)
Z_c = -1i / (omega * C_corr)`}
                    </Code>
                  </Paper>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="circuit-matrix">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Electrical Engineering: DC Mesh Analysis with Matrix Algebra</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    This example applies Kirchhoff's Voltage Law to a three-mesh resistive network with two voltage sources. The mesh equations are written directly as a resistance matrix and solved in one step with <Code>SolveLinear</Code>.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ DC Circuit Mesh Analysis via Matrix Algebra }\nV_s1 = 10 [V]   { Source driving mesh 1 }\nV_s2 = 8 [V]    { Source driving mesh 3 }\n\nR_1 = 2 [ohm];  R_2 = 4 [ohm];  R_3 = 2 [ohm]\nR_4 = 6 [ohm];  R_5 = 4 [ohm]\n\n{ Resistance matrix from Kirchhoff's Voltage Law }\n{ Diagonal: total resistance around each mesh. Off-diagonal: -(shared resistance) }\nR[1,1] = R_1 + R_2;  R[1,2] = -R_2;             R[1,3] = 0\nR[2,1] = -R_2;       R[2,2] = R_2 + R_3 + R_4;  R[2,3] = -R_4\nR[3,1] = 0;          R[3,2] = -R_4;             R[3,3] = R_4 + R_5\n\n{ Source vector: net EMF driving each mesh }\nV[1..3] = [V_s1, 0, V_s2]\n\n{ Solve R * I = V for the mesh currents }\nI[1..3] = SolveLinear(R[1..3,1..3], V[1..3])\n\n{ Branch currents through the shared resistors }\nI_R2 = I[1] - I[2]\nI_R4 = I[2] - I[3]\n\n{ Energy check: delivered power equals dissipated power }\nP_delivered = V_s1 * I[1] + V_s2 * I[3]`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ DC Circuit Mesh Analysis via Matrix Algebra }
V_s1 = 10 [V]   { Source driving mesh 1 }
V_s2 = 8 [V]    { Source driving mesh 3 }

R_1 = 2 [ohm];  R_2 = 4 [ohm];  R_3 = 2 [ohm]
R_4 = 6 [ohm];  R_5 = 4 [ohm]

{ Resistance matrix from Kirchhoff's Voltage Law }
{ Diagonal: total resistance around each mesh. Off-diagonal: -(shared resistance) }
R[1,1] = R_1 + R_2;  R[1,2] = -R_2;             R[1,3] = 0
R[2,1] = -R_2;       R[2,2] = R_2 + R_3 + R_4;  R[2,3] = -R_4
R[3,1] = 0;          R[3,2] = -R_4;             R[3,3] = R_4 + R_5

{ Source vector: net EMF driving each mesh }
V[1..3] = [V_s1, 0, V_s2]

{ Solve R * I = V for the mesh currents }
I[1..3] = SolveLinear(R[1..3,1..3], V[1..3])

{ Branch currents through the shared resistors }
I_R2 = I[1] - I[2]
I_R4 = I[2] - I[3]

{ Energy check: delivered power equals dissipated power }
P_delivered = V_s1 * I[1] + V_s2 * I[3]`}
                    </Code>
                  </Paper>
                  <Text size="xs" mt="xs" c="dimmed">
                    The solver expands SolveLinear into the three KVL equations and finds the mesh currents I[1] = 3 A, I[2] = 2 A, I[3] = 2 A, so the shared resistor R_4 carries no current and the sources deliver 46 W. The same pattern scales to any n×n nodal or mesh formulation.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="vibration-eigen">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Mechanical Vibrations: Natural Frequencies & Mode Shapes (Eigenvalues)</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    Two equal carts coupled by three springs form a classic 2-DOF free-vibration problem. The natural frequencies are the square roots of the eigenvalues of the dynamic matrix $D = K/m$, and the eigenvector columns are the mode shapes.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Two-DOF Vibration: Natural Frequencies & Mode Shapes }\nm = 10 [kg]       { Mass of each cart }\nk = 1000 [N/m]    { Stiffness of each of the three springs }\n\n{ Stiffness matrix for two equal masses coupled by three springs }\nK[1,1] = 2*k;  K[1,2] = -k\nK[2,1] = -k;   K[2,2] = 2*k\n\n{ Dynamic matrix D = K/m (equal masses) }\nD[1,1] = K[1,1]/m; D[1,2] = K[1,2]/m\nD[2,1] = K[2,1]/m; D[2,2] = K[2,2]/m\n\n{ Eigenvalues are omega^2; columns of Phi are the mode shapes }\nCALL Eigen(D[1..2,1..2] : lambda[1..2], Phi[1..2,1..2])\n\nomega[1] = sqrt(lambda[1]);  omega[2] = sqrt(lambda[2])\nf[1] = omega[1]/(2*pi);      f[2] = omega[2]/(2*pi)`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ Two-DOF Vibration: Natural Frequencies & Mode Shapes }
m = 10 [kg]       { Mass of each cart }
k = 1000 [N/m]    { Stiffness of each of the three springs }

{ Stiffness matrix for two equal masses coupled by three springs }
K[1,1] = 2*k;  K[1,2] = -k
K[2,1] = -k;   K[2,2] = 2*k

{ Dynamic matrix D = K/m (equal masses) }
D[1,1] = K[1,1]/m; D[1,2] = K[1,2]/m
D[2,1] = K[2,1]/m; D[2,2] = K[2,2]/m

{ Eigenvalues are omega^2; columns of Phi are the mode shapes }
CALL Eigen(D[1..2,1..2] : lambda[1..2], Phi[1..2,1..2])

omega[1] = sqrt(lambda[1]);  omega[2] = sqrt(lambda[2])
f[1] = omega[1]/(2*pi);      f[2] = omega[2]/(2*pi)`}
                    </Code>
                  </Paper>
                  <Text size="xs" mt="xs" c="dimmed">
                    Eigenvalues come back ascending: lambda = 100 and 300, so omega = 10 and 17.32 rad/s (f = 1.59 and 2.76 Hz). The first mode shape (0.707, 0.707) has both carts moving in phase; the second (0.707, −0.707) is the anti-phase mode where the middle spring works.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="stress-eigen">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Solid Mechanics: Principal Stresses from the Stress Tensor (Eigenvalues)</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    The principal stresses of a plane stress state are the eigenvalues of the Cauchy stress tensor, and the principal directions are its eigenvectors — no Mohr's circle construction needed.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Principal Stresses of a 2D Stress State }\nsigma_x = 60 [MPa]\nsigma_y = 20 [MPa]\ntau_xy = 15 [MPa]\n\n{ Cauchy stress tensor }\nS[1,1] = sigma_x;  S[1,2] = tau_xy\nS[2,1] = tau_xy;   S[2,2] = sigma_y\n\n{ Principal stresses = eigenvalues; principal directions = eigenvectors }\nCALL Eigen(S[1..2,1..2] : sigma_p[1..2], N[1..2,1..2])\n\n{ Maximum in-plane shear stress and major principal angle }\ntau_max = (sigma_p[2] - sigma_p[1]) / 2\ntheta_p = arctan(N[2,2]/N[1,2]) * 180/pi`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ Principal Stresses of a 2D Stress State }
sigma_x = 60 [MPa]
sigma_y = 20 [MPa]
tau_xy = 15 [MPa]

{ Cauchy stress tensor }
S[1,1] = sigma_x;  S[1,2] = tau_xy
S[2,1] = tau_xy;   S[2,2] = sigma_y

{ Principal stresses = eigenvalues; principal directions = eigenvectors }
CALL Eigen(S[1..2,1..2] : sigma_p[1..2], N[1..2,1..2])

{ Maximum in-plane shear stress and major principal angle }
tau_max = (sigma_p[2] - sigma_p[1]) / 2
theta_p = arctan(N[2,2]/N[1,2]) * 180/pi`}
                    </Code>
                  </Paper>
                  <Text size="xs" mt="xs" c="dimmed">
                    With sigma_x = 60, sigma_y = 20, tau_xy = 15 MPa the principal stresses are 15 and 65 MPa (ascending), tau_max = 25 MPa, and the major principal axis sits at theta_p = 18.43° — matching the Mohr's circle result tan(2θ) = 2τ/(σx−σy). Stresses solve in SI (Pa) per the frEES SI-always rule.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="chem">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Chemical Engineering: Adiabatic Flame Temperature</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    Finds the adiabatic flame temperature of methane ($CH_4$) burned with 100% theoretical air, balancing stoichiometric enthalpies and variable specific heat capacities.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Adiabatic Flame Temp - Methane Combustion }\nT_reactants = 298.15 [K]  { Inlet temp }\n\n{ Enthalpies of formation in kJ/kmol }\nhf_ch4 = -74850\nhf_o2 = 0\nhf_n2 = 0\nhf_co2 = -393520\nhf_h2o = -241820\n\n{ Enthalpy of reactants at T_reactants (sensible enthalpy is 0) }\nH_reactants = 1 * hf_ch4 + 2 * hf_o2 + 7.52 * hf_n2\n\n{ Enthalpy of products at Adiabatic Flame Temp (T_flame) }\n{ Specific heats modeled as polynomial function of T }\n{ Cp = A + B*T + C*T^2 + D*T^3 }\n\n{ Sensible enthalpy integrations from reference 298.15K }\ndH_co2 = Integral(Cp_co2, T, 298.15, T_flame)\ndH_h2o = Integral(Cp_h2o, T, 298.15, T_flame)\ndH_n2 = Integral(Cp_n2, T, 298.15, T_flame)\n\n{ Sensible heats in kJ/kmol-K }\nCp_co2 = 22.26 + 5.981e-2 * T - 3.501e-5 * T^2 + 7.469e-9 * T^3\nCp_h2o = 32.24 + 0.1923e-2 * T + 1.055e-5 * T^2 - 3.595e-9 * T^3\nCp_n2 = 28.90 - 0.1571e-2 * T + 0.8081e-5 * T^2 - 2.873e-9 * T^3\n\nH_products = 1 * (hf_co2 + dH_co2) + 2 * (hf_h2o + dH_h2o) + 7.52 * (hf_n2 + dH_n2)\n\n{ Energy Balance: H_reactants = H_products }\nH_reactants = H_products`} />
                    <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                      {`{ Adiabatic Flame Temp - Methane Combustion }
T_reactants = 298.15 [K]  { Inlet temp }

{ Enthalpies of formation in kJ/kmol }
hf_ch4 = -74850
hf_o2 = 0
hf_n2 = 0
hf_co2 = -393520
hf_h2o = -241820

{ Enthalpy of reactants at T_reactants (sensible enthalpy is 0) }
H_reactants = 1 * hf_ch4 + 2 * hf_o2 + 7.52 * hf_n2

{ Enthalpy of products at Adiabatic Flame Temp (T_flame) }
{ Specific heats modeled as polynomial function of T }
{ Cp = A + B*T + C*T^2 + D*T^3 }

{ Sensible enthalpy integrations from reference 298.15K }
dH_co2 = Integral(Cp_co2, T, 298.15, T_flame)
dH_h2o = Integral(Cp_h2o, T, 298.15, T_flame)
dH_n2 = Integral(Cp_n2, T, 298.15, T_flame)

{ Sensible heats in kJ/kmol-K }
Cp_co2 = 22.26 + 5.981e-2 * T - 3.501e-5 * T^2 + 7.469e-9 * T^3
Cp_h2o = 32.24 + 0.1923e-2 * T + 1.055e-5 * T^2 - 3.595e-9 * T^3
Cp_n2 = 28.90 - 0.1571e-2 * T + 0.8081e-5 * T^2 - 2.873e-9 * T^3

H_products = 1 * (hf_co2 + dH_co2) + 2 * (hf_h2o + dH_h2o) + 7.52 * (hf_n2 + dH_n2)

{ Energy Balance: H_reactants = H_products }
H_reactants = H_products`}
                    </Code>
                  </Paper>
                  <Text size="xs" mt="xs" c="dimmed">
                    The upper limit T_flame is an unknown of the system: frEES inlines the c_p polynomials into the integrals and solves the energy balance directly (about 2345 K, matching the ideal-gas table data) with no manual guesses needed.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              {CENGEL_EXAMPLES.map((ex) => (
                <Accordion.Item value={ex.value} key={ex.value}>
                  <Accordion.Control>
                    <Text fw={600} c="cyan.4">{ex.title}</Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Text size="sm" mb="sm">{ex.description}</Text>
                    <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                      <CopyButton code={ex.code} />
                      <Code block style={{ background: 'transparent', maxHeight: '300px', overflowY: 'auto' }}>
                        {ex.code}
                      </Code>
                    </Paper>
                    <Text size="xs" mt="xs" c="dimmed">{ex.note}</Text>
                  </Accordion.Panel>
                </Accordion.Item>
              ))}
            </Accordion>
          </Stack>
        );
      case 'api':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">14. Solver Reference & Troubleshooting API</Title>
            <Text style={{ lineHeight: 1.6 }}>
              This section is a technical reference for debugging failed systems, syntax limitations, and error codes in frEES.
            </Text>

            <Accordion variant="separated">
              <Accordion.Item value="dof">
                <Accordion.Control><strong>Degrees of Freedom (DOF) Mismatch</strong></Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.6 }}>
                    This error occurs when the number of independent equations does not match the number of unique variables.
                    <br/><br/>
                    - <strong>Underspecified:</strong> There are fewer equations than variables (e.g. 2 equations, 3 variables). The system has infinite solutions. To fix: specify boundary values for one of the variables or write another equation.
                    <br/>
                    - <strong>Overspecified:</strong> There are more equations than variables. The system is over-determined. To fix: remove redundant equations or define the variables that were assumed constants.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="conv">
                <Accordion.Control><strong>Newton Solver Divergence / "Did Not Converge"</strong></Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.6 }}>
                    Newton's method is extremely fast but can fail if guess values are poor, or if the equations contain mathematical singularities.
                    <br/><br/>
                    - <strong>Singularities / Domain Errors:</strong> If a variable becomes negative during intermediate steps, functions like <code>sqrt()</code> or <code>ln()</code> will throw domain errors. Set **lower bounds** (e.g. 0.0001) to keep values safe.
                    <br/>
                    - <strong>Divide by Zero:</strong> Avoid expressions like <code>y = 1 / x</code> if <code>x</code> starts with a guess value of 0. Change the initial guess to a non-zero value.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="warnings">
                <Accordion.Control><strong>Understanding Warnings vs Errors</strong></Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" style={{ lineHeight: 1.6 }}>
                    - <strong>Error:</strong> Prevents compilation or solving (e.g., syntax errors, DOF mismatch, division by zero). The solver halts.
                    <br/>
                    - <strong>Warning:</strong> The solver successfully completes and provides math solutions, but issues a warning (e.g., unit dimension inconsistencies). Always check warnings to verify that your equations represent correct physical relationships.
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          background: 'var(--mantine-color-dark-8)',
          minHeight: 'calc(100vh - 60px)'
        }
      }}
    >
      <AppShell.Header bg="dark.8" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text span inherit variant="gradient" gradient={{ from: 'blue.4', to: 'cyan.3', deg: 90 }}>
                frEES
              </Text>
              <Text span inherit size="lg" c="dimmed" fw={500}>
                Documentation Portal
              </Text>
            </Title>
          </Group>
          <Badge color="blue" variant="filled" size="lg">v1.2.0 (Stable)</Badge>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" bg="dark.9" style={{ borderRight: '1px solid var(--mantine-color-dark-4)' }}>
        <AppShell.Section grow component={ScrollArea}>
          <Text fw={700} size="xs" c="dimmed" mb="sm" style={{ letterSpacing: '1px' }}>
            DOCUMENTATION SECTIONS
          </Text>
          {SECTIONS.map((section) => (
            <NavLink
              key={section.id}
              label={section.label}
              active={active === section.id}
              onClick={() => {
                setActive(section.id);
                if (opened) toggle();
              }}
              variant="light"
              color="blue"
              styles={{
                label: { fontWeight: active === section.id ? 600 : 400 },
                root: { borderRadius: '6px', marginBottom: '2px' }
              }}
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="md" pt="md" pb="xl">
          {renderContent()}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
