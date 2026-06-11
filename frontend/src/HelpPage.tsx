import { AppShell, Burger, Group, NavLink, ScrollArea, Title, Text, Container, Code, List, Divider, Paper, Stack, Blockquote } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';

const SECTIONS = [
  { id: 'started', label: 'Getting Started' },
  { id: 'syntax', label: 'Equation Solving & Syntax' },
  { id: 'variables', label: 'Variables & Bounds' },
  { id: 'units', label: 'Units & Consistency' },
  { id: 'arrays', label: 'Arrays & Loops' },
  { id: 'complex', label: 'Complex Numbers' },
  { id: 'tables', label: 'Parametric Tables & Plots' },
  { id: 'examples', label: 'Engineering Examples' },
];

export default function HelpPage() {
  const [opened, { toggle }] = useDisclosure();
  const [active, setActive] = useState('started');

  const renderContent = () => {
    switch (active) {
      case 'started':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Getting Started with frEES</Title>
            <Text>
              Welcome to <strong>frEES</strong> (free Engineering Equation Solver), a powerful, web-based tool for solving systems of non-linear simultaneous equations.
            </Text>
            <Text>
              Unlike traditional sequential programming languages, frEES is declarative. You provide the equations, and the solver automatically determines the order of computation, grouping equations into blocks and solving them using robust numerical methods like Newton-Raphson.
            </Text>
            <Title order={3}>Quick Start</Title>
            <List spacing="xs">
              <List.Item><strong>Equations Window:</strong> Enter your mathematical models here. Order does not matter.</List.Item>
              <List.Item><strong>Check (F4):</strong> Compiles equations, checks for syntax errors, and verifies degrees of freedom (equations vs. unknowns).</List.Item>
              <List.Item><strong>Solve (F2):</strong> Runs the numerical solver and opens the Solution Window.</List.Item>
            </List>
            <Blockquote color="blue" mt="md">
              Try entering: <Code>x + y = 3</Code><br/>
              <Code>y = x^2 - 1</Code><br/>
              Then press F4 to Check, and F2 to Solve.
            </Blockquote>
          </Stack>
        );
      case 'syntax':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Equation Solving & Syntax</Title>
            <Text>
              The equations window allows you to define relationships between variables using standard algebraic notation.
            </Text>
            <Title order={3}>Rules & Syntax</Title>
            <List spacing="xs">
              <List.Item><strong>Case-Insensitive:</strong> <Code>Variable</Code> and <Code>VARIABLE</Code> are treated as the same.</List.Item>
              <List.Item><strong>Comments:</strong> Use curly braces <Code>{`{ this is a comment }`}</Code> or quotes <Code>"also a comment"</Code> to document your code.</List.Item>
              <List.Item><strong>Math Functions:</strong> Standard functions like <Code>sin()</Code>, <Code>cos()</Code>, <Code>exp()</Code>, <Code>ln()</Code>, <Code>sqrt()</Code>, <Code>abs()</Code> are supported.</List.Item>
              <List.Item><strong>Order Independence:</strong> The solver uses Tarjan's algorithm to analyze structural dependencies and reorder equations into solvable blocks automatically.</List.Item>
            </List>
            <Title order={4}>Structural Singularities</Title>
            <Text>
              If the number of equations does not match the number of variables, frEES will notify you during the <strong>Check</strong> phase that the system is underspecified or overspecified. Structural independence is required to solve.
            </Text>
          </Stack>
        );
      case 'variables':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Variables & Bounds</Title>
            <Text>
              Because frEES uses Newton's method to solve non-linear systems, initial guess values and boundary limits are critical for ensuring convergence, especially when multiple roots exist.
            </Text>
            <Title order={3}>Variable Information Window</Title>
            <Text>
              Clicking <strong>Variable Info</strong> in the top toolbar opens a grid where you can define:
            </Text>
            <List spacing="xs">
              <List.Item><strong>Guess Value:</strong> The starting point for the iteration. If an equation has multiple solutions (e.g., a quadratic), the solver will typically find the root closest to the guess value. Default is 1.0.</List.Item>
              <List.Item><strong>Lower / Upper Bounds:</strong> Restricts the search space. Newton steps will be clamped to these bounds. Useful to avoid unphysical negative values (like negative pressures or temperatures).</List.Item>
              <List.Item><strong>Units:</strong> Set display units for variables.</List.Item>
            </List>
            <Text c="dimmed" size="sm">
              Note: You must successfully <strong>Check</strong> the equations before the Variable Info grid populates.
            </Text>
          </Stack>
        );
      case 'units':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Units & Dimensional Consistency</Title>
            <Text>
              frEES has a robust internal unit system that prevents mixed-unit errors. All calculations are strictly performed in SI base units, while inputs and outputs can be formulated in any preferred unit.
            </Text>
            <Title order={3}>Unit Annotations</Title>
            <Text>You can attach units to numeric constants using square brackets:</Text>
            <Paper withBorder p="sm"><Code block>P_in = 140 [kPa]</Code></Paper>
            <Text size="sm">This converts 140 kPa to 140,000 Pa internally at parse time.</Text>

            <Title order={3}>The Convert() Function</Title>
            <Text>Use the built-in Convert function for unit multipliers:</Text>
            <Paper withBorder p="sm"><Code block>Area = 10 * Convert(ft^2, m^2)</Code></Paper>

            <Title order={3}>Dimensional Checking</Title>
            <Text>
              frEES verifies dimensional homogeneity across additions and equal signs. If you try to add a length to a time, it will generate a warning in the solution window (though it will not block the solver).
            </Text>
          </Stack>
        );
      case 'arrays':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Arrays & Loops</Title>
            <Text>
              frEES supports array syntax to represent multiple similar variables, enabling parameterized systems and finite difference models.
            </Text>
            <Title order={3}>Array Notation</Title>
            <Text>Arrays are accessed using square brackets, e.g., <Code>T[1]</Code>, <Code>T[2]</Code>.</Text>
            
            <Title order={3}>Duplicate Loops</Title>
            <Text>
              To avoid writing repetitive equations, use the <Code>DUPLICATE</Code> construct:
            </Text>
            <Paper withBorder p="sm">
              <Code block>
{`DUPLICATE i = 1, 5
  X[i] = i * 10
  Y[i] = X[i]^2
END`}
              </Code>
            </Paper>
            <Text>
              This block expands automatically at compile-time into 10 independent equations, treating <Code>X[1]</Code>, <Code>X[2]</Code>, etc., as unique variables.
            </Text>
          </Stack>
        );
      case 'complex':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Complex Numbers</Title>
            <Text>
              Electrical engineering and control theory problems often require complex arithmetic.
            </Text>
            <Text>
              When <strong>Complex Mode</strong> is enabled in the Equations Window action bar or Preferences:
            </Text>
            <List spacing="xs">
              <List.Item>Every variable is split into real and imaginary components.</List.Item>
              <List.Item>A system of $N$ equations becomes a system of $2N$ equations.</List.Item>
              <List.Item>You can input the imaginary unit using <Code>1i</Code> or <Code>1j</Code>.</List.Item>
            </List>
            <Title order={4}>Example</Title>
            <Paper withBorder p="sm">
              <Code block>
{`z = 3 + 4i
mag = abs(z)
phase = angle(z)`}
              </Code>
            </Paper>
          </Stack>
        );
      case 'tables':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Parametric Tables & Plots</Title>
            <Text>
              Parametric tables allow you to run the solver iteratively over a range of independent variables to observe their effect on dependent variables.
            </Text>
            <Title order={3}>Using Parametric Tables</Title>
            <List type="ordered" spacing="xs">
              <List.Item>Navigate to the <strong>Parametric Table</strong> tab.</List.Item>
              <List.Item>Click <strong>Configure Columns</strong> to select which variables to include.</List.Item>
              <List.Item>Enter fixed values in the cells. (Empty cells will be calculated by the solver).</List.Item>
              <List.Item>Click <strong>Solve Table</strong>. The engine will loop through every row, fixing the provided values as constants, and calculate the rest.</List.Item>
            </List>
            
            <Title order={3}>Plots</Title>
            <Text>
              Once a Parametric Table is solved, navigate to the <strong>Plots</strong> tab to visualize the data. You can configure X and Y axes based on table columns to generate high-quality engineering graphs.
            </Text>
          </Stack>
        );
      case 'examples':
        return (
          <Stack gap="md">
            <Title order={2} c="blue.4">Engineering Examples</Title>
            <Text>
              These real-life engineering examples demonstrate how frEES can be utilized by engineering students and professionals. Copy and paste them into the Equations Window.
            </Text>

            <Divider my="sm" />
            
            <Title order={3}>1. Mechanical Engineering: Heat Transfer</Title>
            <Text size="sm">Combines convection and radiation to find the steady-state temperature of a surface.</Text>
            <Paper withBorder p="sm">
              <Code block>
{`{ Heat Transfer - Convection and Radiation }
T_inf = 300 [K]
T_surr = 300 [K]
q_in = 5000 [W]
A = 2 [m^2]
h = 25 [W/m^2-K]
epsilon = 0.8
sigma = 5.67e-8 [W/m^2-K^4]

{ Energy Balance: Heat in = Convection + Radiation }
q_in = h * A * (T_surf - T_inf) + epsilon * sigma * A * (T_surf^4 - T_surr^4)
`}
              </Code>
            </Paper>

            <Divider my="sm" />

            <Title order={3}>2. Electrical Engineering: AC Circuit (Requires Complex Mode)</Title>
            <Text size="sm">Calculates the equivalent impedance and total current of a parallel RLC circuit.</Text>
            <Paper withBorder p="sm">
              <Code block>
{`{ Parallel AC Circuit - Enable Complex Mode! }
V_source = 120 + 0i
omega = 377 { rad/s, approx 60Hz }

{ Components }
R = 50
L = 0.1
C = 100e-6

{ Impedances }
Z_R = R
Z_L = 1i * omega * L
Z_C = 1 / (1i * omega * C)

{ Parallel Equivalent Impedance }
1 / Z_eq = 1 / Z_R + 1 / Z_L + 1 / Z_C

{ Ohm's Law }
I_total = V_source / Z_eq
`}
              </Code>
            </Paper>

            <Divider my="sm" />

            <Title order={3}>3. Chemical Engineering: CSTR Mass Balance</Title>
            <Text size="sm">Analyzes the steady-state concentration and conversion of a Continuous Stirred Tank Reactor.</Text>
            <Paper withBorder p="sm">
              <Code block>
{`{ CSTR Steady-State Mass Balance }
F_in = 10 [L/s]      { Volumetric flow rate }
C_in = 5 [mol/L]     { Inlet concentration }
k = 0.1 [1/s]        { First-order reaction rate constant }
V = 100 [L]          { Reactor volume }

{ Assume constant density, Flow in = Flow out }
F_out = F_in

{ Mass balance: In - Out + Generation = Accumulation (0 at steady state) }
{ Generation for a reactant is negative: -k * C_out * V }
F_in * C_in - F_out * C_out - k * C_out * V = 0

{ Conversion percentage }
Conversion = (C_in - C_out) / C_in * 100
`}
              </Code>
            </Paper>

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
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3} c="blue.4">frEES Documentation</Title>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <Text fw={500} size="sm" c="dimmed" mb="xs">
            TABLE OF CONTENTS
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
            />
          ))}
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="md" pt="md">
          {renderContent()}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
