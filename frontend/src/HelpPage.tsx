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

function CopyButton({ code }: { code: string }) {
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

const SECTIONS = [
  { id: 'started', label: '1. Getting Started' },
  { id: 'syntax', label: '2. Equation Syntax & Math' },
  { id: 'variables', label: '3. Variables & Bounds' },
  { id: 'units', label: '4. Units & Consistency' },
  { id: 'arrays', label: '5. Arrays & Loops' },
  { id: 'functions', label: '6. Functions & Procedures' },
  { id: 'modules', label: '7. Modular Submodels' },
  { id: 'thermo', label: '8. Fluid Properties (CoolProp)' },
  { id: 'humidair', label: '9. Psychrometrics (AirH2O)' },
  { id: 'calculus', label: '10. Numerical Integration' },
  { id: 'complex', label: '11. Complex Numbers' },
  { id: 'examples', label: '12. Engineering Examples' },
  { id: 'api', label: '13. Solver Reference & API' },
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
              Paste this in the Equations Window, click <strong>Check (F4)</strong> to verify (2 variables, 2 equations), and click <strong>Solve (F2)</strong>. The solver will find the root: <code>x = 1.562</code>, <code>y = 1.438</code>.
            </Text>
          </Stack>
        );
      case 'syntax':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">2. Equation Syntax & Math Functions</Title>
            <Text>
              The equations window allows you to enter relationships between variables using standard mathematical notation.
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
      case 'functions':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">6. Functions & Procedures (Imperative Logic)</Title>
            <Text style={{ lineHeight: 1.6 }}>
              While the global equations window is declarative and order-independent, you can write procedural, sequential logic using **Functions** and **Procedures**. Inside these blocks, code is executed top-to-bottom.
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
            <Title order={2} c="blue.4">7. Modular Submodels (Modules)</Title>
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
            <Title order={2} c="blue.4">8. Thermodynamic Fluid Properties (CoolProp)</Title>
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
              <Badge color="cyan" variant="filled">CO2</Badge>
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
          </Stack>
        );
      case 'humidair':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">9. Psychrometrics (AirH2O / Humid Air)</Title>
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
            <Title order={2} c="blue.4">10. Numerical Integration (ODEs & Calculus)</Title>
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
            <Title order={2} c="blue.4">11. Complex Number Arithmetic</Title>
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
            <Title order={2} c="blue.4">12. Engineering Examples & Case Studies</Title>
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

              <Accordion.Item value="chem">
                <Accordion.Control>
                  <Text fw={600} c="cyan.4">Chemical Engineering: Adiabatic Flame Temperature</Text>
                </Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="sm">
                    Finds the adiabatic flame temperature of methane ($CH_4$) burned with 100% theoretical air, balancing stoichiometric enthalpies and variable specific heat capacities.
                  </Text>
                  <Paper withBorder p="md" bg="dark.8" radius="md" style={{ position: 'relative' }}>
                    <CopyButton code={`{ Adiabatic Flame Temp - Methane Combustion }\nT_reactants = 298.15 [K]  { Inlet temp }\n\n{ Enthalpies of formation in kJ/kmol }\nhf_ch4 = -74850\nhf_o2 = 0\nhf_n2 = 0\nhf_co2 = -393520\nhf_h2o = -241820\n\n{ Enthalpy of reactants at T_reactants (sensible enthalpy is 0) }\nH_reactants = 1 * hf_ch4 + 2 * hf_o2 + 7.52 * hf_n2\n\n{ Enthalpy of products at Adiabatic Flame Temp (T_flame) }\n{ Specific heats modeled as polynomial function of T }\n{ Cp = A + B*T + C*T^2 + D*T^3 }\n\n{ Sensible enthalpy integrations from reference 298.15K }\ndH_co2 = Integral(Cp_co2, T, 298.15, T_flame)\ndH_h2o = Integral(Cp_h2o, T, 298.15, T_flame)\ndH_n2 = Integral(Cp_n2, T, 298.15, T_flame)\n\n{ Sensible heats in kJ/kmol-K }\nCp_co2 = 22.26 + 5.98e-2 * T - 3.50e-5 * T^2 + 7.47e-9 * T^3\nCp_h2o = 32.24 + 0.19e-2 * T + 1.06e-5 * T^2 - 3.60e-9 * T^3\nCp_n2 = 28.90 - 0.16e-2 * T + 0.57e-5 * T^2 - 2.87e-9 * T^3\n\nH_products = 1 * (hf_co2 + dH_co2) + 2 * (hf_h2o + dH_h2o) + 7.52 * (hf_n2 + dH_n2)\n\n{ Energy Balance: H_reactants = H_products }\nH_reactants = H_products`} />
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
Cp_co2 = 22.26 + 5.98e-2 * T - 3.50e-5 * T^2 + 7.47e-9 * T^3
Cp_h2o = 32.24 + 0.19e-2 * T + 1.06e-5 * T^2 - 3.60e-9 * T^3
Cp_n2 = 28.90 - 0.16e-2 * T + 0.57e-5 * T^2 - 2.87e-9 * T^3

H_products = 1 * (hf_co2 + dH_co2) + 2 * (hf_h2o + dH_h2o) + 7.52 * (hf_n2 + dH_n2)

{ Energy Balance: H_reactants = H_products }
H_reactants = H_products`}
                    </Code>
                  </Paper>
                  <Text size="xs" mt="xs" c="dimmed">
                    *Tip: Set guess value of T_flame to <code>2000</code> and lower bound to <code>298</code> in Variable Info before solving.*
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        );
      case 'api':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">13. Solver Reference & Troubleshooting API</Title>
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
