import { Accordion, Button, Code, Group, List, Modal, Paper, Stack, Tabs, Text, Title } from '@mantine/core'

interface Props {
  onClose: () => void
  onLoadExample: (text: string) => void
}

export default function HelpModal({ onClose, onLoadExample }: Readonly<Props>) {
  return (
    <Modal opened onClose={onClose} title="frEES Documentation & Help" size="lg" centered>
      <Tabs defaultValue="started" color="blue" variant="outline">
        <Tabs.List mb="md">
          <Tabs.Tab value="started">Getting Started</Tabs.Tab>
          <Tabs.Tab value="vars">Variables & Bounds</Tabs.Tab>
          <Tabs.Tab value="units">Units & Conversions</Tabs.Tab>
          <Tabs.Tab value="arrays">Arrays & Loops</Tabs.Tab>
          <Tabs.Tab value="complex">Complex Mode</Tabs.Tab>
          <Tabs.Tab value="examples">Examples</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="started">
          <Stack gap="sm">
            <Title order={4} c="blue.4">The Core Equation Solver</Title>
            <Text size="sm">
              frEES is a web-based clone of the Engineering Equation Solver (EES). Unlike standard sequential programming languages, frEES is a declarative equation solver:
            </Text>
            <List size="sm" spacing="xs" withPadding>
              <List.Item>Equations can be entered in **any order**.</List.Item>
              <List.Item>Variable names are **case-insensitive**.</List.Item>
              <List.Item>Variables are solved in blocks grouped by structural dependency using Tarjan's algorithm, then resolved numerically using Newton's method.</List.Item>
            </List>
            <Title order={5} mt="xs">Basic Commands</Title>
            <Group gap="xs">
              <Paper withBorder p="xs" style={{ flex: 1 }}>
                <Text size="xs" style={{ fontWeight: 600 }}>Check (F4)</Text>
                <Text size="xs" c="dimmed">Parses equations, verifies syntax, checks degrees of freedom, and detects structural singularities.</Text>
              </Paper>
              <Paper withBorder p="xs" style={{ flex: 1 }}>
                <Text size="xs" style={{ fontWeight: 600 }}>Solve (F2)</Text>
                <Text size="xs" c="dimmed">Runs full numerical solving, displays values, residual errors, and calculations order blocks.</Text>
              </Paper>
            </Group>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="vars">
          <Stack gap="sm">
            <Title order={4} c="blue.4">Variable Information</Title>
            <Text size="sm">
              Newton's method requires initial guess values to start iterating. Click the **Variable Info** button in the header to customize settings:
            </Text>
            <List size="sm" spacing="xs" withPadding>
              <List.Item><strong>Guess Value</strong>: Starting point for iterations (default: 1.0). Controls convergence and selecting specific roots for non-linear equations.</List.Item>
              <List.Item><strong>Lower / Upper Bounds</strong>: Hard boundary limits. Newton steps are clamped to these limits.</List.Item>
              <List.Item><strong>Constrained Solutions</strong>: If a solution is pinned exactly on a bound and cannot resolve further, the solver flags it as constrained.</List.Item>
            </List>
            <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
              Note: A successful Check (F4) is required first to extract all variable names and populate the Variable Info grid.
            </Text>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="units">
          <Stack gap="sm">
            <Title order={4} c="blue.4">Units & Dimensional Consistency</Title>
            <Text size="sm">
              All solver calculations run strictly in SI base units to prevent mixed-unit mathematical errors.
            </Text>
            <Accordion variant="separated">
              <Accordion.Item value="annotations">
                <Accordion.Control>Unit Annotations</Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="xs">Declare units for numeric constants in square brackets:</Text>
                  <Code block>P = 140 [kPa]  {"{ converts kPa to Pa at parse time }"}</Code>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="conversions">
                <Accordion.Control>Convert Function</Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="xs">Fold multipliers into the equation using `Convert(From, To)`:</Text>
                  <Code block>W_dot = Q_dot * Convert(hp, kW)</Code>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="homogeneity">
                <Accordion.Control>Dimensional Warnings</Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm">
                    The compiler traverses the AST to verify dimensional homogeneity (e.g. adding `[m]` to `[s]` triggers warnings in the results, though it does not block the solver).
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="arrays">
          <Stack gap="sm">
            <Title order={4} c="blue.4">Array Variables & Loops</Title>
            <Text size="sm">
              frEES supports indexing syntax for array variables, allowing programmatic expansion.
            </Text>
            <Title order={5}>Duplicate Loops</Title>
            <Text size="sm">
              Generate multiple equations programmatically using the `DUPLICATE` loop syntax:
            </Text>
            <Code block>
              {`DUPLICATE i=1,5
  X[i] = i * 10
END`}
            </Code>
            <Text size="sm">
              This expands internally into five independent equations: <Code>X[1] = 10</Code> through <Code>X[5] = 50</Code>.
            </Text>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="complex">
          <Stack gap="sm">
            <Title order={4} c="blue.4">Complex Numbers Solving</Title>
            <Text size="sm">
              When **Complex mode** is toggled on:
            </Text>
            <List size="sm" spacing="xs" withPadding>
              <List.Item>Every variable `X` is split internally into real (`X_r`) and imaginary (`X_i`) components.</List.Item>
              <List.Item>All equations are evaluated for both real and imaginary branches, solving a system of $2N$ equations.</List.Item>
              <List.Item>Supports operators `+`, `-`, `*`, `/`, `^` (power) as well as complex calls to functions: `sin`, `cos`, `exp`, `ln`, `sqrt`.</List.Item>
            </List>
            <Text size="sm" c="dimmed" style={{ fontStyle: 'italic' }}>
              Try entering <Code>z^2 = -4</Code> and checking "Complex mode" before clicking Solve!
            </Text>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="examples">
          <Stack gap="sm">
            <Text size="sm">Select an example below to load it into the editor:</Text>
            <Stack gap="xs">
              <Paper withBorder p="xs">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text size="sm" style={{ fontWeight: 600 }}>1. Non-linear Bipartite Matching</Text>
                    <Text size="xs" c="dimmed">Basic simultaneous loop solving</Text>
                  </Stack>
                  <Button size="xs" variant="light" onClick={() => {
                    onLoadExample("x + y = 3\ny = z - 4\nz = x^2 - 3")
                    onClose()
                  }}>Load</Button>
                </Group>
              </Paper>

              <Paper withBorder p="xs">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text size="sm" style={{ fontWeight: 600 }}>2. Array Duplicate Loop & Sum</Text>
                    <Text size="xs" c="dimmed">Loop iteration and array aggregation</Text>
                  </Stack>
                  <Button size="xs" variant="light" onClick={() => {
                    onLoadExample("DUPLICATE i=1,5\n  X[i] = i * 2.5\nEND\nSumX = sum(X[1..5])")
                    onClose()
                  }}>Load</Button>
                </Group>
              </Paper>

              <Paper withBorder p="xs">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text size="sm" style={{ fontWeight: 600 }}>3. Complex Numbers Root</Text>
                    <Text size="xs" c="dimmed">Requires Complex mode to solve</Text>
                  </Stack>
                  <Button size="xs" variant="light" onClick={() => {
                    onLoadExample("z^2 = -4")
                    onClose()
                  }}>Load</Button>
                </Group>
              </Paper>

              <Paper withBorder p="xs">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Text size="sm" style={{ fontWeight: 600 }}>4. Ideal Gas Law (Units Conversion)</Text>
                    <Text size="xs" c="dimmed">Annotated units and Convert multipliers</Text>
                  </Stack>
                  <Button size="xs" variant="light" onClick={() => {
                    onLoadExample("P = 140 [kPa]\nV = 2 [m^3]\nm = 3 [kg]\nT = 300 [K]\nR = 0.287 [kJ/kg-K]\nP * V = m * R * Convert(kJ, J) * T")
                    onClose()
                  }}>Load</Button>
                </Group>
              </Paper>
            </Stack>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <Group justify="flex-end" mt="xl">
        <Button onClick={onClose}>Close</Button>
      </Group>
    </Modal>
  )
}
