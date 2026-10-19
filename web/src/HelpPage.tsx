import {
  AppShell,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Title,
  Text,
  Code,
  List,
  Paper,
  Stack,
  Table,
  Badge,
  Alert,
  Button,
  TextInput,
  CloseButton,
  Accordion as MantineAccordion,
  Highlight,
  Divider,
  Box,
  SimpleGrid,
  Card,
  Anchor,
  Slider,
  Kbd,
  Tabs,
  TableOfContents,
  UnstyledButton,
  Collapse
} from '@mantine/core';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { useState, useEffect, useMemo, useRef } from 'react';
import { getReference, getFluids, check, solve, DEFAULT_STOP_CRITERIA, type UnitInfo, type ConstantInfo, type VariableResult } from './api';
import { DOCS_CATALOG } from './docsCatalog';
import Latex from './Latex';
import { EXAMPLES } from './examples';
import { REFERENCE_PAGES, type ReferencePage } from './referenceCatalog';
import { buildSearchIndex, searchDocs, type SearchHit, type SearchKind } from './searchIndex';

// Facet chips shown in the search dropdown, in display order.
const SEARCH_FACETS: [SearchKind, string][] = [
  ['guide', 'Guides'],
  ['reference', 'Reference'],
  ['component', 'Components'],
  ['example', 'Examples'],
];
import { VERSION_LABEL } from './version';
import {
  FLUID_PROPERTY_OUTPUTS,
  FLUID_INPUT_INDICATORS,
  AIRH2O_OUTPUTS,
  AIRH2O_INDICATORS,
  UTILITY_PROPERTY_FUNCS,
  type FuncEntry
} from './helpReference';
import { CYCLE_EXAMPLES } from './helpExamples';
import {
  SolverPipelineDiagram,
  DegreesOfFreedomDiagram,
  DependentPropertiesDiagram,
  GuessConvergenceDiagram,
  BraytonCycleDiagram,
  RefrigerationCycleDiagram,
  RankineCycleDiagram,
  EvThermalDiagram,
  LearningMapDiagram
} from './docs/DocDiagrams';

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
      color={copied ? "green" : "teal"}
      onClick={handleCopy}
      style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
    >
      {copied ? "Copied!" : "Copy Code"}
    </Button>
  );
}

// Compact numeric display for inline solution tables.
function formatRunValue(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-4 || a >= 1e7)) return v.toExponential(4);
  return String(Number(v.toPrecision(6)));
}

// A fenced block tagged ```run (every one is verified against the backend by
// scripts/check-doc-snippets.mjs). Run executes the real Check → Solve pipeline
// and renders the solution inline; Open in Editor hands the code to the main
// app through the frees.pendingSnippet localStorage key (consumed in App.tsx).
/** A `vary=` slider spec parsed from a runnable fence's info string. */
interface VarySpec { name: string; min: number; step: number; max: number }

function RunnableCode({ code, title, vary = [] }: Readonly<{ code: string; title?: string; vary?: VarySpec[] }>) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vars, setVars] = useState<VariableResult[] | null>(null);
  // Slider values, seeded at each range's midpoint (snapped to the step).
  const [varyVals, setVaryVals] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const v of vary) init[v.name] = v.min + Math.round((v.max - v.min) / 2 / v.step) * v.step;
    return init;
  });

  const run = async (vals: Record<string, number> = varyVals) => {
    // Sliders override the document's fixed values through the same overrides
    // channel the REPL uses ("name = value" beats the editor equation).
    const overrides = vary.map((v) => `${v.name} = ${vals[v.name]}`);
    setRunning(true);
    setError(null);
    try {
      const chk = await check(code, [], false, [], overrides);
      if (!chk.solvable) {
        setVars(null);
        setError(chk.message || 'The system did not pass Check.');
        return;
      }
      const sol = await solve(code, DEFAULT_STOP_CRITERIA, [], false, 'SI', false, [], undefined, overrides);
      if (!sol.success) {
        setVars(null);
        setError(sol.error || 'The solve did not converge.');
        return;
      }
      setVars(sol.variables);
    } finally {
      setRunning(false);
    }
  };

  const openInEditor = () => {
    const firstComment = /\{([^}]*)\}/.exec(code)?.[1]?.trim();
    localStorage.setItem('frees.pendingSnippet', JSON.stringify({
      title: (title || firstComment || 'Documentation example').slice(0, 80),
      text: code,
      ts: Date.now(),
    }));
    window.open('/', '_blank');
  };

  const shown = vars ? vars.slice(0, 60) : [];
  const hasUncertainty = shown.some((v) => (v.uncertainty ?? 0) !== 0);
  return (
    <Paper withBorder p="md" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))" mb="md">
      <Group justify={title ? 'space-between' : 'flex-end'} gap="xs" mb="xs">
        {title && <Badge color="teal" variant="light" leftSection={<IconBook size={12} />}>{title}</Badge>}
        <Group gap="xs">
          <Button size="xs" variant="filled" color="teal" onClick={() => run()} loading={running}>Run</Button>
          <Button size="xs" variant="light" onClick={openInEditor}>Open in Editor</Button>
        </Group>
      </Group>
      {vary.length > 0 && (
        <Stack gap={6} mb="sm">
          {vary.map((v) => (
            <Group key={v.name} gap="sm" wrap="nowrap">
              <Code style={{ whiteSpace: 'nowrap', minWidth: 130 }}>{v.name} = {formatRunValue(varyVals[v.name])}</Code>
              <Slider
                style={{ flexGrow: 1 }}
                size="sm"
                color="teal"
                min={v.min}
                max={v.max}
                step={v.step}
                value={varyVals[v.name]}
                label={null}
                onChange={(val) => setVaryVals((prev) => ({ ...prev, [v.name]: val }))}
                onChangeEnd={(val) => {
                  const next = { ...varyVals, [v.name]: val };
                  setVaryVals(next);
                  void run(next);
                }}
              />
            </Group>
          ))}
        </Stack>
      )}
      <Box style={{ position: 'relative' }}>
        <CopyButton code={code} />
        <Code block style={{ background: 'transparent', maxHeight: '340px', overflowY: 'auto' }}>{code}</Code>
      </Box>
      {error && (
        <Alert color="red" mt="sm" title="Did not solve">
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{error}</Text>
        </Alert>
      )}
      {vars && (
        <Box mt="sm">
          <Text size="sm" fw={700} c="teal.4" mb="xs">
            Solved — {vars.length} variable{vars.length === 1 ? '' : 's'}
          </Text>
          <Box style={{ maxHeight: 280, overflowY: 'auto' }}>
            <Table striped withTableBorder verticalSpacing={2} fz="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Variable</Table.Th>
                  <Table.Th>Value</Table.Th>
                  <Table.Th>Units</Table.Th>
                  {hasUncertainty && <Table.Th>±</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {shown.map((v) => (
                  <Table.Tr key={v.name}>
                    <Table.Td><Code>{v.name}</Code></Table.Td>
                    <Table.Td>{formatRunValue(v.value)}</Table.Td>
                    <Table.Td>{v.units}</Table.Td>
                    {hasUncertainty && <Table.Td>{(v.uncertainty ?? 0) !== 0 ? formatRunValue(v.uncertainty!) : ''}</Table.Td>}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
          {vars.length > shown.length && (
            <Text size="xs" c="dimmed" mt={4}>
              …and {vars.length - shown.length} more — open in the editor for the full solution, tables, and plots.
            </Text>
          )}
        </Box>
      )}
    </Paper>
  );
}

function formatSiFactor(factor: number): string {
  if (factor === 1) return '1';
  const abs = Math.abs(factor);
  if (abs !== 0 && (abs >= 1e5 || abs < 1e-3)) return factor.toExponential(4);
  return Number(factor.toPrecision(8)).toString();
}

/**
 * Live reference of every unit the solver accepts and the built-in constants,
 * fetched from /api/reference so it can never drift from the backend registry.
 * Units are grouped by the SI dimension they measure; a filter matches unit
 * symbol or dimension. Names are case-insensitive (shown lowercased).
 */
function UnitsReference() {
  const [units, setUnits] = useState<UnitInfo[]>([]);
  const [constants, setConstants] = useState<ConstantInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    getReference()
      .then((ref) => {
        if (cancelled) return;
        setUnits(ref.units);
        setConstants(ref.constants);
      })
      .finally(() => !cancelled && setLoaded(true));
    return () => { cancelled = true; };
  }, []);

  const q = query.trim().toLowerCase();
  const filteredUnits = q
    ? units.filter((u) => u.symbol.toLowerCase().includes(q) || u.dimension.toLowerCase().includes(q))
    : units;

  // Group by dimension, preserving the backend's dimension-then-symbol order.
  const groups = new Map<string, UnitInfo[]>();
  for (const u of filteredUnits) {
    const list = groups.get(u.dimension) ?? [];
    list.push(u);
    groups.set(u.dimension, list);
  }

  return (
    <Stack gap="md">
      <Title order={3} mt="sm">Supported Units</Title>
      <Text size="sm" c="dimmed">
        Every unit below is accepted inside <code>[ ]</code> annotations and in <code>Convert()</code>.
        Unit names are case-insensitive (shown lowercased). Units are grouped by the SI
        dimension they measure; the factor is the multiplier to SI base units.
      </Text>
      <TextInput
        placeholder="Filter units by symbol or dimension (e.g. pa, time, m/s)"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        rightSection={query ? <CloseButton size="sm" onClick={() => setQuery('')} /> : null}
        maw={420}
      />
      {!loaded && <Text size="sm" c="dimmed">Loading reference…</Text>}
      {loaded && groups.size === 0 && <Text size="sm" c="dimmed">No units match “{query}”.</Text>}
      {[...groups.entries()].map(([dimension, list]) => (
        <Paper key={dimension} withBorder p="sm">
          <Group gap="xs" mb="xs">
            <Badge variant="light" color="teal">{dimension === '-' ? 'dimensionless' : dimension}</Badge>
            <Text size="xs" c="dimmed">{list.length} unit{list.length === 1 ? '' : 's'}</Text>
          </Group>
          <Group gap={6}>
            {list.map((u) => (
              <Badge key={u.symbol} variant="default" style={{ fontFamily: 'monospace', textTransform: 'none' }}>
                {u.symbol} = {formatSiFactor(u.siFactor)} {dimension === '-' ? '' : dimension}
              </Badge>
            ))}
          </Group>
        </Paper>
      ))}

      <Title order={3} mt="md">Built-in Constants</Title>
      <Text size="sm" c="dimmed">
        Use these anywhere in equations by their <code>#</code>-suffixed name (by long-standing convention).
        They are substituted at parse time with the SI value and unit shown.
      </Text>
      <Table striped withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Value (SI)</Table.Th>
            <Table.Th>Unit</Table.Th>
            <Table.Th>Description</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {constants.map((c) => (
            <Table.Tr key={c.name}>
              <Table.Td style={{ fontFamily: 'monospace' }}>{c.name}</Table.Td>
              <Table.Td style={{ fontFamily: 'monospace' }}>{formatSiFactor(c.value)}</Table.Td>
              <Table.Td style={{ fontFamily: 'monospace' }}>{c.unit}</Table.Td>
              <Table.Td>{c.description}</Table.Td>
            </Table.Tr>
          ))}
         </Table.Tbody>
      </Table>
    </Stack>
  );
}

/** Compact table of function entries (name + description + example/unit). */
function FunctionTable({ rows }: Readonly<{ rows: FuncEntry[] }>) {
  return (
    <Table striped withTableBorder withColumnBorders>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: '38%' }}>Name</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th style={{ width: '26%' }}>Example / Unit</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.map((f) => (
          <Table.Tr key={f.name}>
            <Table.Td style={{ fontFamily: 'monospace' }}>{f.name}</Table.Td>
            <Table.Td>{f.desc}</Table.Td>
            <Table.Td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
              {f.example ? f.example : (f.unit ?? '')}
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

/**
 * Fluid property functions, supported fluids (live from /api/fluids), and the
 * humid-air / glycol classes.
 */
function FluidsReference() {
  const [fluids, setFluids] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFluids().then((f) => { if (!cancelled) setFluids(f); });
    return () => { cancelled = true; };
  }, []);

  return (
    <Stack gap="md">
      <Title order={3} mt="sm">Fluid Property Functions</Title>
      <Text size="sm" c="dimmed">
        Every function takes the fluid name first, then exactly two named
        coordinates (three for <Code>AirH2O</Code>, one of which must be{' '}
        <Code>P</Code>). Results are returned in <b>SI base units</b>.
      </Text>
      <FunctionTable rows={FLUID_PROPERTY_OUTPUTS} />

      <Title order={4} c="teal.3" mt="sm">State input indicators</Title>
      <Table striped withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr><Table.Th style={{ width: '26%' }}>Key</Table.Th><Table.Th>Meaning</Table.Th></Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {FLUID_INPUT_INDICATORS.map((i) => (
            <Table.Tr key={i.key}>
              <Table.Td style={{ fontFamily: 'monospace' }}>{i.key}</Table.Td>
              <Table.Td>{i.meaning}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Title order={3} mt="md">Supported Fluids</Title>
      <Text size="sm" c="dimmed">
        Names are case-insensitive and follow CoolProp's convention, with several
        aliases mapping to the same fluid (e.g. <Code>steam</Code>,{' '}
        <Code>h2o</Code> → Water). Spelled formulas (<Code>CO2</Code>,{' '}
        <Code>N2</Code>, <Code>CH4</Code>) are ideal gases with NASA
        polynomials. Real-fluid properties are computed in the browser by
        rustprop, a pure-Rust port of CoolProp 8.0.0; the list below is reported
        live by the engine.
      </Text>
      {fluids === null ? (
        <Text size="sm" c="dimmed">Loading fluids…</Text>
      ) : fluids.length === 0 ? (
        <Alert color="orange" variant="light">
          The engine returned no fluids, so the live list is empty. The function
          syntax below still applies.
        </Alert>
      ) : (
        <Group gap={6}>
          {fluids.map((f) => (
            <Badge key={f} variant="default" style={{ fontFamily: 'monospace', textTransform: 'none' }}>{f}</Badge>
          ))}
        </Group>
      )}

      <Title order={3} mt="md">Low-GWP Refrigerant Blends</Title>
      <Text size="sm" c="dimmed">
        <Code>R448A</Code>, <Code>R449A</Code>, <Code>R452A</Code>, <Code>R452B</Code>,{' '}
        <Code>R454A</Code>, <Code>R454B</Code>, <Code>R454C</Code>, <Code>R455A</Code>,{' '}
        <Code>R513A</Code> and <Code>R515B</Code> are real mixtures, computed with
        CoolProp 8's mixture model and matching it to the last digit. Use{' '}
        <Code>T</Code>/<Code>P</Code>, or <Code>x</Code> with <Code>T</Code> or{' '}
        <Code>P</Code> across the temperature glide. Blends have no property
        diagram. A blend's critical point comes from CoolProp's critical-curve
        search, which finds a single point only for <Code>R454C</Code>; the
        others refuse, exactly as in CoolProp.
      </Text>

      <Title order={3} mt="md">Humid Air (AirH2O)</Title>
      <Text size="sm" c="dimmed">
        Three coordinates required (one must be <Code>P</Code>). Works in SI
        internally — convert °F/psia inputs.
      </Text>
      <FunctionTable rows={AIRH2O_OUTPUTS} />
      <Table striped withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr><Table.Th style={{ width: '26%' }}>Key</Table.Th><Table.Th>Meaning</Table.Th></Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {AIRH2O_INDICATORS.map((i) => (
            <Table.Tr key={i.key}>
              <Table.Td style={{ fontFamily: 'monospace' }}>{i.key}</Table.Td>
              <Table.Td>{i.meaning}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Title order={3} mt="md">Aqueous Glycol Coolants</Title>
      <Text size="sm" c="dimmed">
        Incompressible mixtures written as base + mass percent:{' '}
        <Code>EG50</Code> (50% ethylene glycol), <Code>PG30</Code> (30% propylene
        glycol). Accepted bases: <Code>EG</Code>/<Code>MEG</Code>/
        <Code>EthyleneGlycol</Code> and <Code>PG</Code>/<Code>MPG</Code>/
        <Code>PropyleneGlycol</Code>. Single-phase — use <Code>T</Code> and{' '}
        <Code>P</Code> as the two indicators.
      </Text>

      <Title order={3} mt="md">Utility & Combustion Functions</Title>
      <FunctionTable rows={UTILITY_PROPERTY_FUNCS} />
    </Stack>
  );
}

/** Built-in constants — live from /api/reference, with a static fallback. */
function ConstantsReference() {
  const [constants, setConstants] = useState<ConstantInfo[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getReference().then((ref) => { if (!cancelled) setConstants(ref.constants); });
    return () => { cancelled = true; };
  }, []);
  const rows = constants ?? [];
  return (
    <Stack gap="md">
      <Title order={3} mt="sm">Built-in Constants</Title>
      <Text size="sm" c="dimmed">
        Physical and mathematical constants, available with a trailing{' '}
        <Code>#</Code> (by long-standing convention). Substituted at parse time with their SI
        value. The full unit list is on the <b>Units &amp; Constants</b> page.
      </Text>
      {constants === null && <Text size="sm" c="dimmed">Loading constants…</Text>}
      {constants !== null && rows.length === 0 && (
        <Alert color="orange" variant="light">
          The live constant list is unavailable (backend not reachable). The
          table below is the static fallback.
        </Alert>
      )}
      <Table striped withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Value (SI)</Table.Th>
            <Table.Th>Unit</Table.Th>
            <Table.Th>Description</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {(rows.length > 0 ? rows : []).map((c) => (
            <Table.Tr key={c.name}>
              <Table.Td style={{ fontFamily: 'monospace' }}>{c.name}</Table.Td>
              <Table.Td style={{ fontFamily: 'monospace' }}>{formatSiFactor(c.value)}</Table.Td>
              <Table.Td style={{ fontFamily: 'monospace' }}>{c.unit}</Table.Td>
              <Table.Td>{c.description}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}


// Examples are titled "Discipline: Specific title"; split on the first colon
// so the library can group them by discipline and show a short label.
function exampleCategory(title: string): string {
  const idx = title.indexOf(':');
  return idx >= 0 ? title.slice(0, idx).trim() : 'Other';
}

function exampleShortTitle(title: string): string {
  const idx = title.indexOf(':');
  return idx >= 0 ? title.slice(idx + 1).trim() : title;
}

// Grouped as [category, examples[]] in first-appearance order.
const EXAMPLE_CATEGORIES: [string, typeof CYCLE_EXAMPLES][] = (() => {
  const groups = new Map<string, typeof CYCLE_EXAMPLES>();
  for (const ex of CYCLE_EXAMPLES) {
    const category = exampleCategory(ex.title);
    const bucket = groups.get(category) ?? [];
    bucket.push(ex);
    groups.set(category, bucket);
  }
  return Array.from(groups.entries());
})();

// Workspace examples (from examples.ts) that are NOT featured in the "Open an
// Example" picker are surfaced here instead, grouped by their own category.
const WORKSPACE_EXAMPLE_CATEGORIES: [string, typeof EXAMPLES][] = (() => {
  const groups = new Map<string, typeof EXAMPLES>();
  for (const ex of EXAMPLES) {
    if (ex.featured) continue;
    const bucket = groups.get(ex.category) ?? [];
    bucket.push(ex);
    groups.set(ex.category, bucket);
  }
  return Array.from(groups.entries());
})();

// Every gallery category name (workspace + curated), deduped in display order —
// the facet chips of the Examples library.
const ALL_EXAMPLE_CATEGORY_NAMES: string[] = (() => {
  const names: string[] = [];
  for (const [cat] of WORKSPACE_EXAMPLE_CATEGORIES) if (!names.includes(cat)) names.push(cat);
  for (const [cat] of EXAMPLE_CATEGORIES) if (!names.includes(cat)) names.push(cat);
  return names;
})();


import {
  IconSearch,
  IconBook,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconArrowRight
} from '@tabler/icons-react';

interface NavItem {
  id: string;
  label: string;
  blurb?: string;
  keywords: string[];
}
interface NavCategory {
  title: string;
  /** The overview/landing page id for this group (rendered as a card grid). */
  overview?: string;
  items: NavItem[];
}

const CATEGORIES: NavCategory[] = [
  {
    title: 'Get Started',
    overview: 'started',
    items: [
      { id: 'started', label: 'Get Started Overview', blurb: 'What frees is, and a map of this documentation.', keywords: ['intro', 'philosophy', 'overview', 'getting started', 'welcome'] },
      { id: 'gs-first-solve', label: '1. Your First Solve', blurb: 'Type four lines and let frees find the unknown.', keywords: ['first solve', 'tutorial', 'quick start', 'f2', 'solve', 'ideal gas'] },
      { id: 'gs-declarative', label: '2. Thinking Declaratively', blurb: 'Why equation order never matters and any variable can be the unknown.', keywords: ['declarative', 'equality', 'order', 'unknown', 'assignment'] },
      { id: 'gs-units-check', label: '3. Units & Checking', blurb: 'Annotate inputs, work in SI, and verify with Check (F4).', keywords: ['units', 'check', 'f4', 'degrees of freedom', 'dof', 'guess', 'si'] },
      { id: 'gs-plots', label: '4. See It: Tables & Plots', blurb: 'Sweep an input with a parametric table and plot the response.', keywords: ['plot', 'parametric', 'sweep', 'table', 'solve table', 'plot curve', 'chart'] },
      { id: 'gs-repl', label: '5. Ask Questions: the REPL', blurb: 'Query the solved session, calculate with units, and call the CAS.', keywords: ['repl', 'terminal', 'console', 'workspace', 'query', 'interactive'] },
      { id: 'gs-components', label: '6. Wire Components', blurb: 'Instantiate and connect library components into a solved network.', keywords: ['components', 'connect', 'network', 'system', 'pipe', 'acausal'] },
      { id: 'gs-next', label: '7. Where to Go Next', blurb: 'A guided map of the rest of the documentation.', keywords: ['next steps', 'learn', 'map', 'where to go'] },
      { id: 'verification', label: 'Verification Suite', blurb: 'CI-enforced problems with independently derived expected values.', keywords: ['verification', 'validation', 'accuracy', 'trust', 'correctness', 'benchmark', 'ci'] },
    ]
  },
  {
    title: 'Language Fundamentals',
    overview: 'lang-overview',
    items: [
      { id: 'lang-overview', label: 'Overview', blurb: 'The grammar, variables, units, and built-in functions of the frees language.', keywords: ['language', 'fundamentals', 'overview', 'grammar'] },
      { id: 'syntax', label: 'Equation Syntax & Rules', blurb: 'Equality vs assignment, case-insensitivity, operators, and comments.', keywords: ['syntax', 'equality', 'case', 'comment', 'rules'] },
      { id: 'variables', label: 'Variables, Guesses & Bounds', blurb: 'Degrees of freedom, and the guesses and bounds that make nonlinear solves converge.', keywords: ['variables', 'guess', 'bounds', 'limits', 'variable info'] },
      { id: 'units', label: 'Units & Consistency', blurb: 'Annotate inputs, convert with Convert/ConvertTemp, and read SI results.', keywords: ['unit', 'units', 'supported units', 'unit list', 'si', 'convert', 'converttemp', 'temperature', 'dimension', 'annotation', 'constants', 'pi', 'gas constant', 'gravity', 'boltzmann', 'avogadro', 'planck'] },
      { id: 'arrays', label: 'Arrays & For Loops', blurb: 'Indexed variables and compile-time FOR expansion into equation families.', keywords: ['array', 'for', 'duplicate', 'loops', 'slice', 'index'] },
      { id: 'complex', label: 'Complex Numbers', blurb: 'Paired _r/_i components and the complex helper functions.', keywords: ['complex', 'imaginary', 'real', 'i', 'j', 'angle', 'polar', 'conj', 'magnitude', 'cis'] },
      { id: 'strings', label: 'String Variables', blurb: '$-suffixed strings for fluid names, geometry labels, and string functions.', keywords: ['string', 'chr$', 'concat$', 'copy$', 'lowercase$', 'uppercase$', 'trim$', 'stringlen', 'stringpos', 'stringval', 'date$', 'time$', 'timestamp$', 'unitsystem$', 'unitsof$'] },
      { id: 'math-funcs', label: 'Mathematical Functions', blurb: 'Trig, logs, rounding, conditionals — the differentiable scalar toolbox.', keywords: ['abs', 'sqrt', 'ln', 'log10', 'exp', 'sin', 'cos', 'tan', 'atan2', 'min', 'max', 'sum', 'avg', 'sinh', 'cosh', 'tanh', 'arcsinh', 'arccosh', 'arctanh', 'round', 'floor', 'ceil', 'trunc', 'sign', 'factorial', 'step', 'if', 'product', 'gcd', 'lcm', 'bitand', 'bitor', 'bitxor', 'bitnot', 'bitshiftl', 'bitshiftr', 'bitwise', 'shift', 'baseconvert'] },
      { id: 'special-funcs', label: 'Special & Statistical Functions', blurb: 'Bessel, gamma, error functions and statistical distributions.', keywords: ['bessel', 'besselk', 'bessely', 'bessel_i0', 'bessel_j0', 'chi_square', 'random', 'randg', 'probability', 'gamma', 'loggamma', 'digamma', 'beta', 'erf', 'erfc', 'erfinv'] },
    ]
  },
  {
    title: 'Matrices & Linear Algebra',
    overview: 'matrix-overview',
    items: [
      { id: 'matrix-overview', label: 'Overview', blurb: 'Declare, operate on, and solve with matrices and vectors.', keywords: ['matrix', 'linear algebra', 'overview', 'vector'] },
      { id: 'matrices-decl', label: 'Declaring Matrices & Vectors', blurb: 'Bracket literals, slice suffixes, and generation helpers.', keywords: ['matrix', 'vector', 'declaring', 'literal', 'semicolon', 'brackets', 'arrays'] },
      { id: 'matrices-ops', label: 'Matrix Operators (+, -, *, \\, \')', blurb: 'Element-wise vs matrix operations and the backslash solve.', keywords: ['operators', 'transpose', 'backslash', 'multiplication', 'solve', 'arrays'] },
      { id: 'matrices-blas', label: 'OpenBLAS Algebra Functions', blurb: 'Low-level BLAS primitives (axpy, gemv, gemm, …).', keywords: ['blas', 'axpy', 'scal', 'copy', 'asum', 'nrm2', 'gemv', 'ger', 'gemm', 'openblas'] },
      { id: 'matrices-sys', label: 'Linear Systems & Decomposition', blurb: 'SolveLinear, determinants, LU, eigenvalues, and rotations.', keywords: ['solvelinear', 'determinant', 'ludecompose', 'eigen', 'eigenvalues', 'eulerrotate', 'eulerdecompose', 'rotation'] },
    ]
  },
  {
    title: 'Programming & Tables',
    overview: 'prog-overview',
    items: [
      { id: 'prog-overview', label: 'Overview', blurb: 'Reusable functions, submodels, and tabulated data.', keywords: ['programming', 'tables', 'overview', 'logic'] },
      { id: 'functions', label: 'Custom Functions', blurb: 'function bodies, multiple outputs, and IF / WHILE / REPEAT control flow.', keywords: ['functions', 'procedures', 'call', 'custom', 'outputs', 'while', 'repeat', 'until', 'loop', 'if', 'then', 'else'] },
      { id: 'modules', label: 'Equation Submodels', blurb: 'Declarative function bodies solved simultaneously with the rest of the model.', keywords: ['module', 'submodel', 'modular', 'call module'] },
      { id: 'tables-code', label: 'Custom Tables (TABLE)', blurb: 'Inline tabulated data callable as a function.', keywords: ['table', 'interp', 'tabulated', 'custom tables', 'curve fit'] },
      { id: 'lookup-tables', label: 'Lookup Tables & Interpolation', blurb: 'Interpolate, differentiate, and look up tabulated columns.', keywords: ['lookup', 'interpolate', 'differentiate', 'table', 'interpolation', 'spline'] },
      { id: 'table-accessors', label: 'Table Accessors & Aggregates', blurb: 'Query Parametric tables and whole-table aggregates.', keywords: ['parametric', 'integral', 'run', 'tablevalue', 'tablerun#', 'nparametricruns', 'sum', 'avg', 'min', 'max', 'stddev', 'integralvalue'] },
    ]
  },
  {
    title: 'Fluids, Materials & Psychrometrics',
    overview: 'fluids-overview',
    items: [
      { id: 'fluids-overview', label: 'Overview', blurb: 'Real-fluid, ideal-gas, humid-air, and solid-material property data.', keywords: ['fluids', 'materials', 'overview', 'properties'] },
      { id: 'thermo', label: 'Fluid Properties (Real Fluids & Gas)', blurb: 'Enthalpy, entropy, density … for real fluids and ideal gases.', keywords: ['coolprop', 'fluids', 'water', 'steam', 'refrigerant', 'glycol', 'density', 'enthalpy', 'entropy', 'p_sat', 't_sat', 'molarmass', 'compressibilityfactor', 'prandtl', 'surfacetension', 'fugacity', 'enthalpy_fusion', 'dipole', 'p_crit', 't_crit', 'v_crit', 't_triple', 'isidealgas', 'phase$'] },
      { id: 'humidair', label: 'Psychrometrics (AirH2O)', blurb: 'Humid-air states from three coordinates; wet-bulb, dew-point, humidity ratio.', keywords: ['psychrometric', 'humid air', 'airh2o', 'relative humidity', 'wet bulb', 'dew point'] },
      { id: 'chemistry', label: 'Chemistry & Combustion', blurb: 'Molar mass from formulas, heating values, view factors, Heisler charts.', keywords: ['chemistry', 'combustion', 'molarmass', 'heatingvalue', 'lhv', 'hhv', 'stoichafr', 'afr', 'fuel', 'formula', 'molar mass', 'chemical', 'c8h18', 'ch4', 'ethanol', 'hydrocarbon'] },
      { id: 'solid-materials', label: 'Solid & Material Properties', blurb: 'Conductivity, specific heat, modulus … for common engineering solids.', keywords: ['material', 'solid', 'c_', 'k_', 'rho_', 'mu_', 'pv_', 'e_', 'nu_', 'epsilon_', 'volexpcoef', 'freezingpt', 'deltal\\l_293', 'ek_lj', 'sigma_lj'] },
      { id: 'state-tables', label: 'Fluid State Tables (STATE TABLE)', blurb: 'Group circuit state points, isolate fluids, and overlay cycles.', keywords: ['state table', 'states', 'fluid states', 'circuit', 'multi-fluid', 'multi-circuit', 'fill missing', 'state points', 'overlay'] },
    ]
  },
  {
    title: 'Solving & Optimization',
    overview: 'solving-overview',
    items: [
      { id: 'solving-overview', label: 'Overview', blurb: 'How frees solves, what to do when it doesn\'t, and the system-level analyses on top.', keywords: ['solving', 'optimization', 'overview', 'solver'] },
      { id: 'debugging', label: 'Debugging a Solve', blurb: 'Build incrementally, read residuals and blocking order, and seed guesses for stubborn nonlinear systems.', keywords: ['debug', 'debugging', 'troubleshoot', 'converge', 'convergence', 'diverge', 'residual', 'blocking', 'singular', 'guess', 'stall', 'wont solve', 'no solution'] },
      { id: 'errors', label: 'Errors & Diagnostics Index', blurb: 'Every checker and solver message, with its cause and fix.', keywords: ['error', 'errors', 'message', 'diagnostic', 'singular jacobian', 'max iterations', 'stalled', 'syntax error', 'degrees of freedom', 'dof', 'coolprop', 'range', 'unit warning', 'failed', 'pending', '429', 'poison'] },
      { id: 'uncertainty', label: 'Uncertainty Propagation', blurb: 'First-order RSS error propagation via UncertaintyOf.', keywords: ['uncertainty', 'propagation', 'error', 'uncertaintyof', 'svd'] },
      { id: 'optimization', label: 'Optimization & Sweeps', blurb: 'Parametric sweeps, single-objective optimization, and Pareto fronts.', keywords: ['optimization', 'sweep', 'parametric', 'minimization', 'maximization', 'nsga', 'pareto'] },
      { id: 'api', label: 'Solver Internals & Diagnostics', blurb: 'The compile/solve pipeline and how to read convergence diagnostics.', keywords: ['api', 'solver', 'newton', 'tarjan', 'residuals', 'jacobian', 'singular', 'convergence'] },
    ]
  },
  {
    title: 'Dynamic Systems & Control',
    overview: 'dynamics-overview',
    items: [
      { id: 'dynamics-overview', label: 'Overview', blurb: 'Transient integration, linearization, and the control-design suite.', keywords: ['dynamics', 'control', 'overview', 'transient'] },
      { id: 'calculus', label: 'Numerical Integration (ODEs)', blurb: 'Definite integrals and the scalar first-order ODE feedback pattern.', keywords: ['integral', 'ode', 'differential', 'calculus', 'runge-kutta'] },
      { id: 'dynamic-ode', label: 'Transient / ODE Systems (DYNAMIC)', blurb: 'Coupled, multi-state, stiff, event-driven ODE integration.', keywords: ['dynamic', 'transient', 'ode', 'der', 'state', 'event', 'ode45', 'ode23', 'ode23s', 'ode15s', 'rocket', 'odevalue', 'finalvalue', 'maxvalue', 'timeat', 'ode table', 'stiff', 'initial condition', 'apogee'] },
      { id: 'symbolic-cas', label: 'Control Systems & Symbolic CAS', blurb: 'Transfer functions, state space, Bode/Nyquist, LQR, and Laplace algebra.', keywords: ['symbolic', 'cas', 'laplace', 's', 'partial fractions', 'residue', 'transfer function', 'tf', 'identity', 'control', 'decompose', 'apart', 'numerator', 'denominator', 'state space', 'ss2tf', 'tf2ss', 'zp2tf', 'tf2zp', 'series', 'parallel', 'feedback', 'pole', 'zero', 'bode', 'nyquist', 'margin', 'frequency response', 'step', 'impulse', 'lsim', 'time response', 'lqr', 'place', 'pole placement', 'ackermann', 'pidtune', 'pid', 'riccati', 'controller design'] },
    ]
  },
  {
    title: 'System Modeling with Components',
    overview: 'components-overview',
    items: [
      { id: 'components-overview', label: 'Overview', blurb: 'Acausal, multi-domain system modeling with a 312-component library.', keywords: ['components', 'system modeling', 'overview', 'acausal', 'network', 'bond graph'] },
      { id: 'comp-first-network', label: 'Your First Component Network', blurb: 'Instantiate, connect, probe — a pipe run solved as a network.', keywords: ['component', 'network', 'instantiate', 'first', 'source', 'pipe', 'sink', 'probe', 'port'] },
      { id: 'comp-connections', label: 'Connections & Junctions', blurb: 'connect statements vs shared streams; junction rules and boundary conditions.', keywords: ['connect', 'junction', 'node', 'stream', 'shared name', 'branch', 'split', 'mixer', 'boundary condition'] },
      { id: 'comp-schematic', label: 'Reading the Schematic', blurb: 'The auto-drawn circuit: per-fluid lines, symbols, and results on hover.', keywords: ['schematic', 'diagram', 'drawing', 'circuit', 'canvas', 'visualise', 'visualize', 'draw', 'symbol', 'band', 'legend', 'hover', 'drag', 'zoom', 'pan', 'export svg', 'svg', 'layout', 'topology'] },
      { id: 'comp-domains', label: 'Domains & Fluid Families', blurb: 'Fluid, heat, electrical, mechanical — and the guarded fluid families.', keywords: ['domain', 'fluid', 'heat', 'electrical', 'mechanical', 'signal', 'sig', 'command', 'probe', 'moistair', 'gas', 'oil', 'liquid', 'twophase', 'domain$', 'across', 'through', 'transducer', 'humid air'] },
      { id: 'comp-library', label: 'The Component Library', blurb: 'A map of the thirteen domain libraries and their conventions.', keywords: ['library', 'components', 'catalog', 'signal', 'fluid', 'liquid', 'twophase', 'moistair', 'pneumatic', 'hydraulic', 'electrical', 'mechanical', 'powertrain', 'heat'] },
      { id: 'comp-variants', label: 'Fidelity Variants (model$)', blurb: 'One component, many models — select physics fidelity per instance.', keywords: ['variant', 'model$', 'fidelity', 'require', 'isentropic', 'volumetric', 'map'] },
      { id: 'comp-authoring', label: 'Writing Your Own Component', blurb: 'function [ports] = Name(params): ports, outputs, and VARIANT bodies.', keywords: ['component', 'custom', 'authoring', 'param', 'ports', 'variant', 'require', 'outputs'] },
      { id: 'comp-transient', label: 'Steady ↔ Transient Networks', blurb: 'Storage components carry the states; one wiring, both analyses.', keywords: ['transient', 'steady', 'storage', 'thermalmass', 'inertia', 'capacitor', 'accumulator', 'soc', 'ida', 'dae', 'ramp', 'time', 'sigstep', 'sigramp', 'drive cycle'] },
      { id: 'comp-linearize', label: 'From Plant to Controller (LINEARIZE)', blurb: 'Extract (A,B,C,D) from a transient network and design the loop.', keywords: ['linearize', 'state space', 'plant', 'abcd', 'input', 'output', 'lqr', 'controller'] },
      { id: 'comp-cycle-plots', label: 'Cycle Plots & Diagnostics', blurb: 'Source-mapped diagnostics and cycle overlays on property charts.', keywords: ['cycle', 'overlay', 'property plot', 'diagnostics', 'source-mapped'] },
      { id: 'comp-wizard', label: 'The Component Wizard', blurb: 'Guided instantiation with variant gating, UA helpers, and map ingestion.', keywords: ['wizard', 'component wizard', 'ua', 'correlation', 'map', 'insert'] },
      { id: 'comp-troubleshooting', label: 'Troubleshooting Networks', blurb: 'The strict parse errors, and the cold-start patterns that fix convergence.', keywords: ['troubleshooting', 'error', 'domain mismatch', 'port count', 'cold start', 'seed', 'pressure', 'mixer', 'capacity floor', 'converge'] },
    ]
  },
  {
    title: 'Tools & Workflow',
    overview: 'tools-overview',
    items: [
      { id: 'tools-overview', label: 'Overview', blurb: 'The interactive console, shortcuts, notes, and data-capture tools.', keywords: ['tools', 'workflow', 'overview'] },
      { id: 'repl', label: 'REPL Terminal & Workspace', blurb: 'A unit-aware console over the solved session, with scalar evaluation and CAS.', keywords: ['repl', 'terminal', 'workspace', 'console', 'vars', 'who', 'whos', 'calculator', 'cas', 'factor', 'expand', 'simplify', 'apart', 'laplace', 'diff', 'integrate', 'call', 'symbolic', 'interactive', 'ans'] },
      { id: 'shortcuts', label: 'Keyboard Shortcuts', blurb: 'Solve, Check, Variable Info, and block-solve hotkeys.', keywords: ['hotkey', 'shortcuts', 'keyboard', 'f2', 'f4', 'f9', 'ctrl'] },
      { id: 'reports', label: 'Notes & Narrative', blurb: 'Structure a document with comment narrative; figures come from named PLOT blocks.', keywords: ['notes', 'narrative', 'comments', 'report', 'document', 'figures'] },
      { id: 'plot-code', label: 'Plots in Code (PLOT)', blurb: 'Declare XY, property, Bode, Nyquist and pole-zero figures in code.', keywords: ['plot', 'graph', 'chart', 'code', 'programmatic', 'xy', 'property', 'psychro'] },
      { id: 'digitizer-fit', label: 'Graph Digitizer & Curve Fit', blurb: 'Turn a chart image or a table into a fitted equation.', keywords: ['digitizer', 'curve', 'fit', 'table', 'regression', 'equation', 'graph'] },
    ]
  },
  {
    title: 'Examples & Tutorials',
    items: [
      { id: 'journey-scalar', label: 'Journey 1: Scalar with units', blurb: 'Solve one equation, read SI, recover a missing unit.', keywords: ['journey', 'units', 'first solve', 'kpa', 'temperature'] },
      { id: 'journey-chain', label: 'Journey 2: Component chain', blurb: 'Source–pipe–sink with connect, then recover a missing boundary.', keywords: ['journey', 'connect', 'pipe', 'source', 'sink', 'boundary'] },
      { id: 'journey-upgrade', label: 'Journey 3: Map or transient', blurb: 'Swap a fan for a map, or add DYNAMIC, without losing the wiring.', keywords: ['journey', 'fanmap', 'map', 'dynamic', 'transient', 'time'] },
      { id: 'journey-loop', label: 'Mixers and closed loops', blurb: 'When a branch is not a mix, and how a loop actually closes.', keywords: ['mixer', 'closed loop', 'enthalpy', 'connect'] },
      { id: 'tut-msd', label: 'Tutorial: Mass–Spring–Damper → Bode', blurb: 'From a transient ring-down to the plant\'s frequency response, in stages.', keywords: ['tutorial', 'mass spring damper', 'oscillator', 'bode', 'transfer function', 'dynamic', 'vibration', 'resonance', 'damping'] },
      { id: 'tut-coil', label: 'Tutorial: AC Cooling Coil', blurb: 'Psychrometric coil analysis by hand, then rebuilt from components.', keywords: ['tutorial', 'cooling coil', 'psychrometrics', 'hvac', 'dehumidification', 'latent', 'sensible', 'shr', 'moist air', 'air conditioning'] },
      { id: 'tut-rlc', label: 'Tutorial: RLC Filter Response', blurb: 'Phasor spot checks, then the full Bode picture of a low-pass filter.', keywords: ['tutorial', 'rlc', 'filter', 'circuit', 'frequency response', 'bode', 'impedance', 'phasor', 'resonance', 'low-pass'] },
      { id: 'tut-vccycle', label: 'Tutorial: Refrigeration Cycle ± Uncertainty', blurb: 'An R134a cycle whose COP carries real instrument error bars.', keywords: ['tutorial', 'refrigeration', 'vapor compression', 'cop', 'uncertainty', 'r134a', 'cycle', 'error propagation'] },
      { id: 'tut-pump', label: 'Tutorial: Pump Selection', blurb: 'Digitize a datasheet curve, intersect the system curve, size the motor.', keywords: ['tutorial', 'pump', 'digitizer', 'head curve', 'system curve', 'operating point', 'table', 'shaft power'] },
      { id: 'examples', label: 'Engineering Examples Library', blurb: 'Verified, ready-to-run problems grouped by discipline.', keywords: ['examples', 'rankine', 'brayton', 'cold air standard', 'combined cycle', 'pipe network', 'truss', 'radiation', 'cooling loop', 'reforming', 'pid', 'fatigue', 'nuclear', 'siyavula', 'nozzle', 'co2', 'compressible', 'throat', 'sonic', 'pelton', 'turbine', 'turbomachinery', 'hydropower', 'impulse', 'vehicle', 'ev', 'electric vehicle', 'longitudinal', 'lateral', 'bicycle model', 'understeer', 'road load', 'drag', 'battery', 'pack', 'cell', 'sizing', 'motor', 'range', 'batemo', 'c-rate', 'ode', 'differential equations', 'runge-kutta', 'stiff', 'van der pol', 'robertson', 'lotka-volterra', 'predator-prey', 'pendulum', 'rlc', 'rc circuit', 'rl circuit', 'orbit', 'logistic', 'decay', 'cooling', 'mass-spring-damper', 'parachutist', 'torricelli'] },
    ]
  },
  {
    title: 'Architecture & Deployment',
    overview: 'deploy-overview',
    items: [
      { id: 'deploy-overview', label: 'Overview', blurb: 'The in-browser engine, the headless CLI, and static deployment.', keywords: ['architecture', 'deployment', 'overview', 'wasm', 'webassembly', 'offline'] },
      { id: 'arch-async', label: 'How a Solve Runs', blurb: 'Editor → Web Worker → WebAssembly engine → results, all inside the browser tab.', keywords: ['async', 'architecture', 'web worker', 'worker pool', 'wasm', 'webassembly', 'offline', 'compute', 'check'] },
      { id: 'arch-api', label: 'Worker & CLI Interface', blurb: 'Drive frees from scripts with frees-cli and the JSON request/response envelope.', keywords: ['api', 'cli', 'frees-cli', 'json', 'request', 'response', 'solve', 'check', 'integration', 'script'] },
      { id: 'deploy-docker', label: 'Local Development', blurb: 'Build the WebAssembly engine, run the Vite dev server, and run the test suites.', keywords: ['local', 'development', 'install', 'run', 'wasm-pack', 'vite', 'npm', 'localhost', 'tests'] },
      { id: 'deploy-railway', label: 'Static Deployment', blurb: 'Build the production bundle and host it on any static web server.', keywords: ['deploy', 'production', 'static', 'hosting', 'build', 'pwa', 'cdn'] },
      { id: 'deploy-health', label: 'Worker Lifecycle & Deadlines', blurb: 'Worker pool limits, cooperative deadlines, and memory and bundle budgets.', keywords: ['workers', 'worker pool', 'deadline', 'timeout', 'memory', 'bundle', 'budget', 'stop'] },
    ]
  },
  {
    title: 'Reference',
    overview: 'ref-index',
    items: [
      { id: 'ref-index', label: 'A–Z Function Index', blurb: 'Every documented symbol, alphabetically, linking to its reference page.', keywords: ['index', 'a-z', 'alphabetical', 'all functions', 'reference', 'list'] },
      { id: 'ref-units', label: 'Units & Constants', blurb: 'The live list of accepted units and built-in physical constants.', keywords: ['constant', 'pi#', 'e#', 'r#', 'g#', 'na#', 'k#', 'h#', 'c#', 'sigma#', 'gc#', 'qe#', 'avogadro', 'boltzmann', 'planck', 'gravity', 'gas constant', 'unit', 'units', 'si', 'dimension', 'kpa', 'pa', 'convert', 'deg', 'rad'] },
      { id: 'ref-fluids', label: 'Supported Fluids', blurb: 'The live real-fluid list, ideal gases, and glycol coolants.', keywords: ['fluid', 'water', 'steam', 'r134a', 'ammonia', 'air', 'airh2o', 'glycol', 'eg50', 'pg30', 'coolprop', 'supported fluids'] },
    ]
  }
];

// id → display label / blurb, for cross-links ([Related:] markers, landing cards).
const NAV_LABELS: Record<string, string> = {};
const NAV_BLURBS: Record<string, string> = {};
for (const cat of CATEGORIES) for (const it of cat.items) {
  NAV_LABELS[it.id] = it.label;
  if (it.blurb) NAV_BLURBS[it.id] = it.blurb;
}
// overview id → the category it introduces (so a landing page can list siblings).
const CATEGORY_BY_OVERVIEW = new Map<string, NavCategory>();
for (const cat of CATEGORIES) if (cat.overview) CATEGORY_BY_OVERVIEW.set(cat.overview, cat);

// The numbered Get-Started reading order, used for Prev/Next navigation.
const GETTING_STARTED_SEQUENCE = ['started', 'gs-first-solve', 'gs-declarative', 'gs-units-check', 'gs-plots', 'gs-repl', 'gs-components', 'gs-next'];

// Slugify a heading for an in-page anchor ("On this page" links).
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Strip markdown emphasis/code/math markers so heading text reads cleanly in a TOC.
function plainText(s: string): string {
  return s.replace(/[`*_$]/g, '').trim();
}

function renderInlineContent(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  let i = 0;

  // Order matters only where delimiters share a first character (** before *).
  const spanMarkers = [
    { delim: '$', type: 'math' },
    { delim: '`', type: 'code' },
    { delim: '**', type: 'bold' },
    { delim: '*', type: 'italic' },
  ] as const;

  while (i < text.length) {
    const span = spanMarkers.find((m) => text.startsWith(m.delim, i));
    if (span) {
      const endIdx = text.indexOf(span.delim, i + span.delim.length);
      if (endIdx !== -1) {
        const val = text.substring(i + span.delim.length, endIdx);
        const key = `inline-${span.type}-${i}`;
        if (span.type === 'bold') {
          // Recurse so nested code/math inside bold (e.g. **`Gamma(x):`**) renders.
          result.push(<strong key={key}>{renderInlineContent(val)}</strong>);
        } else if (span.type === 'italic') {
          result.push(<em key={key}>{renderInlineContent(val)}</em>);
        } else if (span.type === 'code') {
          result.push(<Code key={key}>{val}</Code>);
        } else if (span.type === 'math') {
          result.push(<Latex key={key} math={val} />);
        }
        i = endIdx + span.delim.length;
        continue;
      }
    }

    // No marker here, or an unterminated one: emit text up to the next possible
    // marker. Scan from i+1 so an unterminated delimiter can't stall the loop.
    let nextIdx = text.length;
    for (const m of spanMarkers) {
      const idx = text.indexOf(m.delim, i + 1);
      if (idx !== -1 && idx < nextIdx) {
        nextIdx = idx;
      }
    }
    result.push(text.substring(i, nextIdx));
    i = nextIdx;
  }
  return result;
}

// A line that continues a paragraph: not blank and not the start of any other block.
function isProseLine(t: string): boolean {
  return t !== '' && !/^(\d+\.\s|```|\$\$|\||- |\* |>|#|\[(Diagram|Component|Run|Related):|<!--)/.test(t);
}

interface MarkdownRendererProps {
  content: string;
  /** Navigate to another topic/reference id (for [Related:] cross-links). */
  onNavigate?: (id: string) => void;
}

function MarkdownRenderer({ content, onNavigate }: MarkdownRendererProps) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // 1. Fenced Code Block. The info string marks behavior: ```run blocks are
    // backend-verified (scripts/check-doc-snippets.mjs) and render with
    // Run / Open in Editor buttons; `vary=name=min:step:max` tokens add live
    // parameter sliders that re-solve through the overrides channel.
    if (trimmed.startsWith('```')) {
      const fence = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join('\n');
      const key = `code-${i}`;
      if (fence === 'run' || fence.startsWith('run ')) {
        const vary = [...fence.matchAll(/vary=([A-Za-z_][A-Za-z0-9_]*)=(-?[\d.eE+-]+):(-?[\d.eE+-]+):(-?[\d.eE+-]+)/g)]
          .map((m) => ({ name: m[1], min: Number(m[2]), step: Number(m[3]), max: Number(m[4]) }))
          .filter((v) => Number.isFinite(v.min) && Number.isFinite(v.step) && v.step > 0 && v.max > v.min);
        elements.push(<RunnableCode key={key} code={code} vary={vary} />);
      } else {
        elements.push(
          <Paper key={key} withBorder p="md" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))" mb="md" style={{ position: 'relative' }}>
            <CopyButton code={code} />
            <Code block style={{ background: 'transparent' }}>{code}</Code>
          </Paper>
        );
      }
      i++;
      continue;
    }
    
    // 1b. Block math: $$ ... $$ (single- or multi-line)
    if (trimmed.startsWith('$$')) {
      let mathText: string;
      if (trimmed.length > 4 && trimmed.endsWith('$$')) {
        mathText = trimmed.slice(2, -2).trim();
        i++;
      } else {
        const buf: string[] = [trimmed.substring(2)];
        i++;
        while (i < lines.length && !lines[i].includes('$$')) {
          buf.push(lines[i]);
          i++;
        }
        if (i < lines.length) {
          buf.push(lines[i].substring(0, lines[i].indexOf('$$')));
          i++;
        }
        mathText = buf.join('\n').trim();
      }
      elements.push(
        <div key={`blockmath-${i}`} style={{ margin: '0.6em 0', overflowX: 'auto' }}>
          <Latex math={mathText} block />
        </div>
      );
      continue;
    }

    // 2. Table Block
    if (trimmed.startsWith('|')) {
      // Parse header row
      const headers = trimmed.split('|').map(h => h.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      i++;
      
      // Check for separator row (e.g. | --- | --- |)
      if (i < lines.length && lines[i].trim().startsWith('|')) {
        const sepRow = lines[i].trim();
        const sepCols = sepRow.split('|').map(s => s.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        if (sepCols.every(col => col.startsWith('-') || col.endsWith('-'))) {
          i++;
        }
      }
      
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const rowCols = lines[i].trim().split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        rows.push(rowCols);
        i++;
      }
      
      const key = `table-${i}`;
      elements.push(
        <Table key={key} striped withTableBorder withColumnBorders mb="md">
          <Table.Thead>
            <Table.Tr>
              {headers.map((h, idx) => (
                <Table.Th key={idx}>{renderInlineContent(h)}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row, rIdx) => (
              <Table.Tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <Table.Td key={cIdx}>{renderInlineContent(cell)}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      );
      continue;
    }
    
    // 3. Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().substring(2));
        i++;
      }
      const key = `list-${i}`;
      elements.push(
        <List key={key} spacing="xs" size="sm" mb="md" style={{ lineHeight: 1.6 }}>
          {listItems.map((item, idx) => (
            <List.Item key={idx}>{renderInlineContent(item)}</List.Item>
          ))}
        </List>
      );
      continue;
    }
    
    // 4. Blockquotes / Alerts
    if (trimmed.startsWith('>')) {
      const alertLines: string[] = [];
      let color = 'blue';
      let title = 'Note';
      
      let firstLine = trimmed.substring(1).trim();
      if (firstLine.startsWith('[!NOTE]')) {
        color = 'blue';
        title = 'Note';
        firstLine = firstLine.substring(7).trim();
      } else if (firstLine.startsWith('[!WARNING]')) {
        color = 'orange';
        title = 'Warning';
        firstLine = firstLine.substring(10).trim();
      } else if (firstLine.startsWith('[!IMPORTANT]')) {
        color = 'indigo';
        title = 'Important';
        firstLine = firstLine.substring(12).trim();
      } else if (firstLine.startsWith('[!CAUTION]')) {
        color = 'red';
        title = 'Caution';
        firstLine = firstLine.substring(10).trim();
      } else if (firstLine.startsWith('[!TIP]')) {
        color = 'teal';
        title = 'Tip';
        firstLine = firstLine.substring(6).trim();
      }
      
      if (firstLine) {
        alertLines.push(firstLine);
      }
      i++;
      
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        alertLines.push(lines[i].trim().substring(1).trim());
        i++;
      }
      
      const key = `alert-${i}`;
      elements.push(
        <Alert key={key} color={color} title={title} mb="md">
          {alertLines.map((l, idx) => (
            <Text key={idx} size="sm">{renderInlineContent(l)}</Text>
          ))}
        </Alert>
      );
      continue;
    }
    
    // 5. Headings
    if (trimmed.startsWith('#')) {
      let order: 2 | 3 | 4 = 2;
      let titleText = '';
      if (trimmed.startsWith('### ')) {
        order = 4;
        titleText = trimmed.substring(4);
      } else if (trimmed.startsWith('## ')) {
        order = 3;
        titleText = trimmed.substring(3);
      } else if (trimmed.startsWith('# ')) {
        order = 2;
        titleText = trimmed.substring(2);
      }
      
      if (titleText) {
        const key = `heading-${i}`;
        // ## and ### get anchor ids: the "On this page" rail lists and scrolls to them.
        const anchorId = order === 2 ? undefined : slugify(plainText(titleText));
        elements.push(
          <Title key={key} id={anchorId} order={order} mt={order === 4 ? 'sm' : 'lg'} mb="xs"
            style={{
              scrollMarginTop: '112px',
              ...(order === 3 && { paddingBottom: 6, borderBottom: '1px solid var(--mantine-color-default-border)' }),
            }}>
            {renderInlineContent(titleText)}
          </Title>
        );
      }
      i++;
      continue;
    }
    
    // 6. Custom Diagrams & Components
    if (trimmed.startsWith('[Diagram:') && trimmed.endsWith(']')) {
      const diagName = trimmed.substring(9, trimmed.length - 1).trim();
      const key = `diagram-${i}`;
      if (diagName === 'SolverPipeline') {
        elements.push(<SolverPipelineDiagram key={key} />);
      } else if (diagName === 'DoF') {
        elements.push(<DegreesOfFreedomDiagram key={key} />);
      } else if (diagName === 'DependentProperties') {
        elements.push(<DependentPropertiesDiagram key={key} />);
      } else if (diagName === 'GuessConvergence') {
        elements.push(<GuessConvergenceDiagram key={key} />);
      } else if (diagName === 'RefrigerationCycle') {
        elements.push(<RefrigerationCycleDiagram key={key} />);
      } else if (diagName === 'RankineCycle') {
        elements.push(<RankineCycleDiagram key={key} />);
      } else if (diagName === 'EvThermal') {
        elements.push(<EvThermalDiagram key={key} />);
      } else if (diagName === 'LearningMap') {
        elements.push(<LearningMapDiagram key={key} onNavigate={onNavigate} />);
      }
      i++;
      continue;
    }
    
    if (trimmed.startsWith('[Component:') && trimmed.endsWith(']')) {
      const compName = trimmed.substring(11, trimmed.length - 1).trim();
      const key = `component-${i}`;
      if (compName === 'UnitsReference') {
        elements.push(<UnitsReference key={key} />);
      }
      i++;
      continue;
    }

    // 6b. Runnable example: [Run: example-id] — pulls a backend-verified example
    // from examples.ts and renders it as a copyable code block.
    if (trimmed.startsWith('[Run:') && trimmed.endsWith(']')) {
      const exId = trimmed.substring(5, trimmed.length - 1).trim();
      const ex = EXAMPLES.find((e) => e.id === exId);
      const key = `run-${i}`;
      if (ex) {
        elements.push(<RunnableCode key={key} code={ex.text} title={ex.title} />);
      } else {
        elements.push(
          <Alert key={key} color="orange" title="Missing example" mb="md">
            <Text size="sm">Example <Code>{exId}</Code> is referenced but not found in the library.</Text>
          </Alert>
        );
      }
      i++;
      continue;
    }
    
    // 6c. Related topics footer: [Related: id1, id2, …] — clickable cross-links to
    // other guide/reference pages, mirroring the reference pages' "See also" row.
    if (trimmed.startsWith('[Related:') && trimmed.endsWith(']')) {
      const ids = trimmed.substring(9, trimmed.length - 1).split(',').map((s) => s.trim()).filter(Boolean);
      const key = `related-${i}`;
      elements.push(
        <Box key={key} mt="xl" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
          <Text size="sm" fw={700} c="dimmed" mb="xs" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Related Topics
          </Text>
          <Group gap="xs">
            {ids.map((id) => {
              const label = NAV_LABELS[id] ?? id;
              return (
                <Badge
                  key={id}
                  component="a"
                  variant="light"
                  color="teal"
                  size="lg"
                  style={{ cursor: onNavigate ? 'pointer' : 'default', textTransform: 'none' }}
                  rightSection={<IconArrowRight size={12} />}
                  onClick={() => onNavigate?.(id)}
                >
                  {label}
                </Badge>
              );
            })}
          </Group>
        </Box>
      );
      i++;
      continue;
    }

    // 7. Regular Paragraph or spacer. HTML comments (the verified-example
    // markers the docs gate reads) are authoring metadata, not prose.
    if (trimmed.startsWith('<!--') && trimmed.endsWith('-->')) {
      i++;
      continue;
    }
    if (trimmed === '') {
      i++;
      continue;
    }
    // Consecutive prose lines are one hard-wrapped paragraph.
    const para = [trimmed];
    i++;
    while (i < lines.length && isProseLine(lines[i].trim())) {
      para.push(lines[i].trim());
      i++;
    }
    elements.push(
      <Text key={`p-${i}`} size="md" style={{ lineHeight: 1.6 }} mb="sm">
        {renderInlineContent(para.join(' '))}
      </Text>
    );
  }
  
  return <>{elements}</>;
}

// Reference pages grouped by category (alphabetical within each): the
// refcat: landing pages, the sibling nav of a reference page, and the home grid.
const REFERENCE_BY_CATEGORY: Map<string, ReferencePage[]> = (() => {
  const map = new Map<string, ReferencePage[]>();
  for (const p of REFERENCE_PAGES) {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category)!.push(p);
  }
  for (const pages of map.values()) pages.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
})();
const REFERENCE_BY_SLUG = new Map(REFERENCE_PAGES.map((p) => [p.slug, p]));

// Search narrows the nav to hits across the guides and every reference page.
const REFERENCE_NAV_CATEGORIES: NavCategory[] = [...REFERENCE_BY_CATEGORY].map(([cat, pages]) => ({
  title: 'Reference · ' + cat,
  items: pages.map((p) => ({
    id: 'refpage:' + p.slug,
    label: p.name,
    keywords: [p.name.toLowerCase(), cat.toLowerCase(), ...p.tags, ...p.related.map((r) => r.toLowerCase())],
  })),
}));
const ALL_CATEGORIES = [...CATEGORIES, ...REFERENCE_NAV_CATEGORIES];

const HOME = 'home';
const REFPAGE = 'refpage:';
const REFCAT = 'refcat:';

// Guide topic id → the nav category it belongs to (breadcrumbs, scope tabs).
const CATEGORY_OF_TOPIC = new Map<string, NavCategory>();
for (const cat of CATEGORIES) for (const it of cat.items) CATEGORY_OF_TOPIC.set(it.id, cat);

const isComponentCategory = (category: string) => category.startsWith('Component');

function pageFamily(page: ReferencePage): string {
  if (isComponentCategory(page.category)) return 'Component';
  if (page.category === 'Language Keywords') return 'Keyword';
  if (page.category.startsWith('Cookbook')) return 'Guide';
  return 'Function';
}

const SCOPE_TABS = [
  { value: 'docs', label: 'Documentation', target: HOME },
  { value: 'examples', label: 'Examples', target: 'examples' },
  { value: 'functions', label: 'Functions', target: 'ref-index' },
  { value: 'components', label: 'Components', target: 'components-overview' },
  { value: 'tutorials', label: 'Tutorials', target: 'journey-scalar' },
];

function refCategoryOf(active: string): string | undefined {
  if (active.startsWith(REFPAGE)) return REFERENCE_BY_SLUG.get(active.slice(REFPAGE.length))?.category;
  if (active.startsWith(REFCAT)) return active.slice(REFCAT.length);
  return undefined;
}

function scopeOf(active: string): string {
  if (active === 'examples') return 'examples';
  const refCategory = refCategoryOf(active);
  if (refCategory !== undefined) return isComponentCategory(refCategory) ? 'components' : 'functions';
  if (active === 'ref-index') return 'functions';
  const cat = CATEGORY_OF_TOPIC.get(active)?.title;
  if (cat === 'System Modeling with Components') return 'components';
  if (cat === 'Examples & Tutorials') return 'tutorials';
  return 'docs';
}

interface Crumb { label: string; id?: string }

function trailOf(active: string): Crumb[] {
  const home: Crumb = { label: 'Documentation Home', id: HOME };
  if (active === HOME) return [{ label: home.label }];
  const index: Crumb = { label: 'Function Index', id: 'ref-index' };
  if (active.startsWith(REFPAGE)) {
    const page = REFERENCE_BY_SLUG.get(active.slice(REFPAGE.length));
    return page ? [home, index, { label: page.category, id: REFCAT + page.category }, { label: page.name }] : [home];
  }
  if (active.startsWith(REFCAT)) return [home, index, { label: active.slice(REFCAT.length) }];
  const cat = CATEGORY_OF_TOPIC.get(active);
  if (!cat) return [home];
  if (cat.overview === active) return [home, { label: cat.title }];
  return [home, { label: cat.title, id: cat.overview }, { label: NAV_LABELS[active] }];
}

// Markdown whose ##/### headings feed the "On this page" rail, if the page has one.
function tocMarkdown(active: string): string | undefined {
  if (active.startsWith(REFPAGE)) return REFERENCE_BY_SLUG.get(active.slice(REFPAGE.length))?.body;
  if (CATEGORY_BY_OVERVIEW.has(active)) return undefined;
  return DOCS_CATALOG[active];
}

function headingCount(markdown: string): number {
  let inCode = false;
  let count = 0;
  for (const raw of markdown.split('\n')) {
    const t = raw.trim();
    if (t.startsWith('```')) inCode = !inCode;
    else if (!inCode && (t.startsWith('## ') || t.startsWith('### '))) count++;
  }
  return count;
}

function Breadcrumbs({ trail, onNavigate }: Readonly<{ trail: Crumb[]; onNavigate: (id: string) => void }>) {
  return (
    <Group gap={6} mb="md" wrap="wrap">
      {trail.map((c, idx) => (
        <Group key={c.label} gap={6} wrap="nowrap">
          {c.id
            ? <Anchor size="sm" c="teal.4" onClick={() => onNavigate(c.id!)}>{c.label}</Anchor>
            : <Text size="sm" c="dimmed">{c.label}</Text>}
          {idx < trail.length - 1 && <Text size="sm" c="dimmed">›</Text>}
        </Group>
      ))}
    </Group>
  );
}

// "Functions | Topics | Examples" link rows closing a reference page.
function SeeAlsoRow({ label, children }: Readonly<{ label: string; children: React.ReactNode[] }>) {
  if (children.length === 0) return null;
  return (
    <Group gap={8} align="baseline" wrap="wrap">
      <Text size="sm" fw={700} w={84}>{label}</Text>
      {children.flatMap((child, idx) => (idx ? [<Text key={`sep-${String((child as React.ReactElement).key)}`} size="sm" c="dimmed">|</Text>, child] : [child]))}
    </Group>
  );
}

// A reference page's `###` entries (examples, arguments, model variants) fold
// open and shut; examples start open, the rest closed.
interface BodySegment { text: string; title?: string; open?: boolean }

function foldSubsections(body: string): BodySegment[] {
  const segments: BodySegment[] = [{ text: '' }];
  let inCode = false;
  let section = '';
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (t.startsWith('```')) inCode = !inCode;
    if (!inCode && t.startsWith('## ')) {
      section = t.slice(3);
      segments.push({ text: '' });
    } else if (!inCode && t.startsWith('### ')) {
      segments.push({ text: '', title: t.slice(4), open: section === 'Examples' });
      continue;
    }
    segments[segments.length - 1].text += line + '\n';
  }
  return segments;
}

function FoldSection({ title, open, children }: Readonly<{ title: string; open: boolean; children: React.ReactNode }>) {
  const [expanded, { toggle }] = useDisclosure(open);
  return (
    <Box mb="sm" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 6 }}>
      <UnstyledButton onClick={toggle} aria-expanded={expanded} w="100%" px="sm" py={8}>
        <Group gap={8} wrap="nowrap">
          <IconChevronRight size={16} style={{ flexShrink: 0, transform: expanded ? 'rotate(90deg)' : undefined, transition: 'transform 150ms' }} />
          <Title order={4} fz="md" id={slugify(plainText(title))} style={{ scrollMarginTop: '112px' }}>
            {renderInlineContent(title)}
          </Title>
        </Group>
      </UnstyledButton>
      <Collapse expanded={expanded}>
        <Box px="md" pb="xs">{children}</Box>
      </Collapse>
    </Box>
  );
}

function ReferencePageView({ page, onNavigate }: Readonly<{ page: ReferencePage; onNavigate: (id: string) => void }>) {
  const verified = page.body.includes('verified-reference-example');
  const mono = pageFamily(page) === 'Guide' ? undefined : 'monospace';
  const functions = page.related.map((r) => {
    const target = REFERENCE_BY_SLUG.get(r.toLowerCase());
    return target
      ? <Anchor key={r} size="sm" ff="monospace" c="teal.4" onClick={() => onNavigate(REFPAGE + target.slug)}>{r}</Anchor>
      : <Text key={r} size="sm" ff="monospace">{r}</Text>;
  });
  const topics = page.guides.filter((g) => NAV_LABELS[g]).map((g) => (
    <Anchor key={g} size="sm" c="teal.4" onClick={() => onNavigate(g)}>{NAV_LABELS[g]}</Anchor>
  ));
  const examples = page.examples.map((id) => (
    <Anchor key={id} size="sm" ff="monospace" c="teal.4" onClick={() => onNavigate('examples')}>{id}</Anchor>
  ));
  return (
    <Stack gap="sm">
      <Group gap="sm" align="center">
        <Title order={1} fz={30} ff={mono}>{page.name}</Title>
        <Badge variant="outline" color="gray" tt="none">{pageFamily(page)}</Badge>
        {verified && <Badge variant="light" color="teal" tt="none" leftSection={<IconCheck size={12} />}>Verified example</Badge>}
      </Group>
      {page.summary && <Text size="lg" c="dimmed">{page.summary}</Text>}
      {foldSubsections(page.body).map((seg, idx) => (seg.title === undefined
        ? <MarkdownRenderer key={idx} content={seg.text} onNavigate={onNavigate} />
        : <FoldSection key={idx} title={seg.title} open={seg.open!}><MarkdownRenderer content={seg.text} onNavigate={onNavigate} /></FoldSection>))}
      {functions.length + topics.length + examples.length > 0 && (
        <>
          <Title id="see-also" order={3} mt="lg" mb="xs"
            style={{ scrollMarginTop: '112px', paddingBottom: 6, borderBottom: '1px solid var(--mantine-color-default-border)' }}>
            See Also
          </Title>
          <Stack gap={6}>
            <SeeAlsoRow label={isComponentCategory(page.category) ? 'Related' : 'Functions'}>{functions}</SeeAlsoRow>
            <SeeAlsoRow label="Topics">{topics}</SeeAlsoRow>
            <SeeAlsoRow label="Examples">{examples}</SeeAlsoRow>
          </Stack>
        </>
      )}
    </Stack>
  );
}

// Prev/Next pager for pages that belong to the numbered Get-Started sequence.
function PrevNext({ active, onNavigate }: Readonly<{ active: string; onNavigate: (id: string) => void }>) {
  const idx = GETTING_STARTED_SEQUENCE.indexOf(active);
  if (idx === -1) return null;
  const prev = idx > 0 ? GETTING_STARTED_SEQUENCE[idx - 1] : null;
  const next = idx < GETTING_STARTED_SEQUENCE.length - 1 ? GETTING_STARTED_SEQUENCE[idx + 1] : null;
  return (
    <Group justify="space-between" mt="xl" pt="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
      {prev
        ? <Button variant="default" leftSection={<IconChevronLeft size={16} />} onClick={() => onNavigate(prev)}>{NAV_LABELS[prev]}</Button>
        : <span />}
      {next
        ? <Button variant="filled" rightSection={<IconChevronRight size={16} />} onClick={() => onNavigate(next)}>{NAV_LABELS[next]}</Button>
        : <span />}
    </Group>
  );
}

function LandingCard({ title, blurb, meta, onClick }: Readonly<{ title: string; blurb?: string; meta?: string; onClick: () => void }>) {
  return (
    <Card withBorder padding="md" radius="md" style={{ cursor: 'pointer', height: '100%' }} onClick={onClick} className="doc-landing-card">
      <Text fw={600} size="lg" c="teal.4">{title}</Text>
      {blurb && <Text size="sm" mt={4}>{blurb}</Text>}
      {meta && <Text size="xs" c="dimmed" mt={6}>{meta}</Text>}
    </Card>
  );
}

// Category landing page: optional intro markdown + a card grid of the group's pages.
function CategoryLanding({ category, intro, onNavigate }: Readonly<{ category: NavCategory; intro?: string; onNavigate: (id: string) => void }>) {
  const cards = category.items.filter((it) => it.id !== category.overview);
  return (
    <Stack gap="md">
      <Title order={1} fz={30}>{category.title}</Title>
      {intro && <MarkdownRenderer content={intro} onNavigate={onNavigate} />}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="xs">
        {cards.map((it) => <LandingCard key={it.id} title={it.label} blurb={it.blurb} onClick={() => onNavigate(it.id)} />)}
      </SimpleGrid>
    </Stack>
  );
}

// Documentation Home: one card per guide category, then the reference families.
function DocsHome({ onNavigate }: Readonly<{ onNavigate: (id: string) => void }>) {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group gap="sm" align="center">
          <Title order={1} fz={34}>frees</Title>
          <Badge variant="outline" color="gray" tt="none">{VERSION_LABEL}</Badge>
        </Group>
        <Anchor size="sm" c="teal.4" onClick={() => onNavigate('ref-index')}>Function Index ({REFERENCE_PAGES.length})</Anchor>
      </Group>
      <Text size="lg">
        frees is a declarative equation-solving environment for engineering. Write the equations as they appear in a
        textbook — algebraic, matrix, or differential — and frees works out what is unknown, in what order to solve it,
        and with what uncertainty. Real-fluid properties, an acausal component library, and dynamic simulation all run
        in your browser.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {CATEGORIES.map((cat) => {
          const first = cat.overview ?? cat.items[0].id;
          const topics = cat.items.filter((it) => it.id !== cat.overview).length;
          return (
            <LandingCard key={cat.title} title={cat.title} blurb={NAV_BLURBS[first]}
              meta={`${topics} ${topics === 1 ? 'topic' : 'topics'}`} onClick={() => onNavigate(first)} />
          );
        })}
      </SimpleGrid>
      <Title order={3} mt="lg" pb={6} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        Reference by category
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
        {[...REFERENCE_BY_CATEGORY].map(([cat, pages]) => (
          <Group key={cat} gap={6} wrap="nowrap">
            <Anchor size="sm" c="teal.4" onClick={() => onNavigate(REFCAT + cat)}>{cat}</Anchor>
            <Text size="xs" c="dimmed">{pages.length}</Text>
          </Group>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

// One reference category: every symbol with its one-line summary (MathWorks-style category page).
function ReferenceCategory({ category, onNavigate }: Readonly<{ category: string; onNavigate: (id: string) => void }>) {
  const pages = REFERENCE_BY_CATEGORY.get(category) ?? [];
  return (
    <Stack gap="md">
      <Title order={1} fz={30}>{category}</Title>
      <Text c="dimmed">{pages.length} reference {pages.length === 1 ? 'page' : 'pages'}</Text>
      <Table verticalSpacing="xs" highlightOnHover>
        <Table.Tbody>
          {pages.map((p) => (
            <Table.Tr key={p.slug}>
              <Table.Td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                <Anchor ff="monospace" size="sm" c="teal.4" onClick={() => onNavigate(REFPAGE + p.slug)}>{p.name}</Anchor>
              </Table.Td>
              <Table.Td><Text size="sm">{p.summary}</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}

// Alphabetical A–Z index of every per-symbol reference page (the single source of
// truth for the function surface), with the categories as a second way in.
function ReferenceIndex({ onNavigate }: Readonly<{ onNavigate: (id: string) => void }>) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const pages = q
    ? REFERENCE_PAGES.filter((p) => p.name.toLowerCase().includes(q) || p.summary.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)))
    : REFERENCE_PAGES;
  // Group by uppercased first character of the name.
  const groups = new Map<string, ReferencePage[]>();
  for (const p of [...pages].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))) {
    const letter = (p.name[0] || '#').toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : '#';
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(p);
  }
  return (
    <Stack gap="md">
      <Title order={1} fz={30}>A–Z Function Index</Title>
      <Text size="sm" c="dimmed">
        Every documented function, block, keyword, and component — the canonical
        reference for each symbol. Click a name for its full page (syntax,
        arguments, examples, errors), or browse a category.
      </Text>
      <Group gap={6}>
        {[...REFERENCE_BY_CATEGORY.keys()].map((cat) => (
          <Badge key={cat} variant="light" color="gray" tt="none" style={{ cursor: 'pointer' }}
            onClick={() => onNavigate(REFCAT + cat)}>{cat}</Badge>
        ))}
      </Group>
      <TextInput
        placeholder="Filter by name, summary, or tag (e.g. enthalpy, bode, matrix)"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        leftSection={<IconSearch size={16} />}
        rightSection={query ? <CloseButton size="sm" onClick={() => setQuery('')} /> : null}
        maw={480}
      />
      {[...groups.entries()].map(([letter, list]) => (
        <Box key={letter}>
          <Title order={3} mb="xs">{letter}</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={6}>
            {list.map((p) => (
              <Anchor key={p.slug} size="sm" ff="monospace" c="teal.4" onClick={() => onNavigate(REFPAGE + p.slug)}>
                {p.name}
              </Anchor>
            ))}
          </SimpleGrid>
        </Box>
      ))}
      {pages.length === 0 && <Text size="sm" c="dimmed">No symbols match “{query}”.</Text>}
    </Stack>
  );
}

// A location.hash value that names a real portal page (home, guide topic,
// special page, refpage:slug or refcat:category). In-page heading anchors from
// the "On this page" rail are NOT topics — the hash router must ignore them.
function knownTopicId(id: string): boolean {
  if (!id) return false;
  if (id.startsWith(REFPAGE)) return REFERENCE_BY_SLUG.has(id.slice(REFPAGE.length));
  if (id.startsWith(REFCAT)) return REFERENCE_BY_CATEGORY.has(id.slice(REFCAT.length));
  if (Object.hasOwn(DOCS_CATALOG, id)) return true;
  return id === HOME || id === 'examples' || id === 'ref-index' || id === 'ref-units' || id === 'ref-fluids';
}

const hashTopic = () => decodeURIComponent(globalThis.location.hash.slice(1));

function NavGroup({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div>
      <Text size="xs" fw={700} c="dimmed" px="xs" mb={6} style={{ letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {title}
      </Text>
      {children}
    </div>
  );
}

export default function HelpPage() {
  const [opened, { toggle }] = useDisclosure();
  // Deep-linkable pages: /help#comp-first-network, /help#refpage:bode, … The
  // active page mirrors location.hash so doc URLs are shareable and the app's
  // error/help links can target a specific page. Unknown hashes are left to
  // the browser (they are in-page heading anchors).
  const [active, setActive] = useState(() => (knownTopicId(hashTopic()) ? hashTopic() : HOME));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const reinitializeToc = useRef<() => void>(() => {});
  useHotkeys([['/', () => searchRef.current?.focus()]]);

  useEffect(() => {
    const onHash = () => {
      const id = hashTopic();
      if (knownTopicId(id)) setActive(id);
    };
    globalThis.addEventListener('hashchange', onHash);
    return () => globalThis.removeEventListener('hashchange', onHash);
  }, []);
  // The rail re-reads the headings of each newly rendered page.
  useEffect(() => reinitializeToc.current(), [active]);
  // Examples-gallery facets: free-text filter + a single active category chip.
  const [exampleFilter, setExampleFilter] = useState('');
  const [exampleCat, setExampleCat] = useState<string | null>(null);

  // Build the full-text search index once, seeding it with the nav keywords.
  useEffect(() => {
    const timer = setTimeout(() => {
      const kw: Record<string, string[]> = {};
      for (const cat of ALL_CATEGORIES) for (const it of cat.items) kw[it.id] = it.keywords;
      buildSearchIndex(kw);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Search facet: restrict results to one kind of page (guide/reference/…).
  const [searchKind, setSearchKind] = useState<SearchKind | null>(null);
  // On a reference page or category, search starts scoped to that category;
  // dismissing the chip widens it to everything until the next navigation.
  const [scopeDismissed, setScopeDismissed] = useState(false);
  const refCategory = refCategoryOf(active);
  const scope = scopeDismissed ? undefined : refCategory;
  const scopeIds = useMemo(
    () => (scope === undefined ? undefined : new Set((REFERENCE_BY_CATEGORY.get(scope) ?? []).map((p) => REFPAGE + p.slug))),
    [scope]
  );

  // Intelligent full-text search across all docs, catalogs, and examples.
  const searchResults = useMemo<SearchHit[]>(
    () => (searchQuery.trim().length >= 2 ? searchDocs(searchQuery, 12, searchKind, scopeIds) : []),
    [searchQuery, searchKind, scopeIds]
  );

  // An active facet keeps the dropdown open even at zero hits, so the chips stay reachable.
  const showResults = searchFocused && searchQuery.trim().length >= 2 && (searchResults.length > 0 || searchKind !== null || scope !== undefined);

  // While searching, the nav narrows to the hits (or, with no content hits, to
  // a label/keyword match) across guides and reference pages alike.
  const searchNav = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return null;
    if (searchResults.length > 0) {
      const hitIds = new Set(searchResults.map(h => h.id));
      return ALL_CATEGORIES.map(c => ({ ...c, items: c.items.filter(i => hitIds.has(i.id)) }))
        .filter(c => c.items.length > 0);
    }
    return ALL_CATEGORIES.map(category => ({
      ...category,
      items: category.items.filter(item => (!scopeIds || scopeIds.has(item.id)) && (
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.keywords.some(kw => kw.toLowerCase().includes(q))
      )),
    })).filter(category => category.items.length > 0);
  }, [searchQuery, searchResults, scopeIds]);

  const navigateTo = (id: string) => {
    setActive(id);
    // Keep the URL shareable; guard so the hashchange listener doesn't loop.
    if (hashTopic() !== id) globalThis.location.assign(`#${id}`);
    setSearchQuery('');
    setSearchFocused(false);
    setScopeDismissed(false);
    if (opened) toggle();
    globalThis.scrollTo?.({ top: 0 });
  };

  const navItem = (id: string, label: string, mono = false) => (
    <NavLink
      key={id}
      label={label}
      active={active === id}
      onClick={() => navigateTo(id)}
      variant="light"
      color="teal"
      styles={{
        label: { fontSize: '13px', fontWeight: active === id ? 600 : 400, fontFamily: mono ? 'monospace' : undefined },
        root: {
          borderRadius: '0 6px 6px 0', paddingTop: 5, paddingBottom: 5, paddingLeft: '12px',
          borderLeft: `2px solid ${active === id ? 'var(--mantine-color-teal-5)' : 'transparent'}`,
        },
      }}
    />
  );

  // The left column is contextual: a reference page lists its category's
  // siblings and the guides that use it; everything else lists the guides.
  const renderNav = () => {
    if (searchNav) {
      return searchNav.length === 0
        ? <Text size="sm" c="dimmed" ta="center" mt="md">No matching topics found.</Text>
        : searchNav.map((category) => (
          <NavGroup key={category.title} title={category.title}>
            {category.items.map((item) => navItem(item.id, item.label, item.id.startsWith(REFPAGE)))}
          </NavGroup>
        ));
    }
    if (refCategory !== undefined) {
      const page = active.startsWith(REFPAGE) ? REFERENCE_BY_SLUG.get(active.slice(REFPAGE.length)) : undefined;
      const guides = (page?.guides ?? []).filter((g) => NAV_LABELS[g]);
      return (
        <>
          <NavGroup title="Contents">
            {navItem(HOME, 'Documentation Home')}
            {navItem('ref-index', 'Function Index (A–Z)')}
            {navItem(REFCAT + refCategory, refCategory)}
            {(REFERENCE_BY_CATEGORY.get(refCategory) ?? []).map((p) => navItem(REFPAGE + p.slug, p.name, true))}
          </NavGroup>
          {guides.length > 0 && (
            <NavGroup title="Related topics">
              {guides.map((g) => navItem(g, NAV_LABELS[g]))}
            </NavGroup>
          )}
        </>
      );
    }
    return (
      <>
        {navItem(HOME, 'Documentation Home')}
        {CATEGORIES.map((category) => (
          <NavGroup key={category.title} title={category.title}>
            {category.items.map((item) => navItem(item.id, item.label))}
          </NavGroup>
        ))}
      </>
    );
  };

  const renderContent = () => {
    if (active === HOME) return <DocsHome onNavigate={navigateTo} />;

    if (active === 'examples') {
      const q = exampleFilter.trim().toLowerCase();
      const matches = (title: string, desc: string, code: string) =>
        !q || title.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || code.toLowerCase().includes(q);
      const wsCats = WORKSPACE_EXAMPLE_CATEGORIES
        .filter(([cat]) => !exampleCat || cat === exampleCat)
        .map(([cat, exs]) => [cat, exs.filter((ex) => matches(ex.title, ex.description, ex.text))] as const)
        .filter(([, exs]) => exs.length > 0);
      const cycleCats = EXAMPLE_CATEGORIES
        .filter(([cat]) => !exampleCat || cat === exampleCat)
        .map(([cat, exs]) => [cat, exs.filter((ex) => matches(ex.title, ex.description, ex.code))] as const)
        .filter(([, exs]) => exs.length > 0);
      const nothing = wsCats.length === 0 && cycleCats.length === 0;
      return (
        <Stack gap="md">
          <Title order={2} c="teal.4">Engineering Examples Library</Title>
          <Text>
            Verified, ready-to-run problems grouped by discipline. Each lists the
            result you should get, so you can confirm your solve. Use the{' '}
            <b>Copy Code</b> button, paste into the editor, and press{' '}
            <Code>F2</Code> (Solve).
          </Text>
          <Group gap="xs">
            <TextInput
              placeholder="Filter examples…"
              value={exampleFilter}
              onChange={(e) => setExampleFilter(e.currentTarget.value)}
              leftSection={<IconSearch size={14} />}
              rightSection={exampleFilter ? <CloseButton size="sm" onClick={() => setExampleFilter('')} /> : null}
              w={260}
            />
            <Group gap={6}>
              {ALL_EXAMPLE_CATEGORY_NAMES.map((cat) => (
                <Badge
                  key={cat}
                  variant={exampleCat === cat ? 'filled' : 'light'}
                  color="teal"
                  style={{ cursor: 'pointer', textTransform: 'none' }}
                  onClick={() => setExampleCat(exampleCat === cat ? null : cat)}
                >
                  {cat}
                </Badge>
              ))}
            </Group>
          </Group>
          {nothing && (
            <Alert color="gray" title="No examples match">
              <Text size="sm">Nothing matches this filter — clear the text or the category chip to see the full library.</Text>
            </Alert>
          )}
          <Alert color="teal" variant="light" icon={<IconBook size={18} />}>
            <Text size="sm">
              Examples that solve an implicit or transcendental equation mention a{' '}
              <b>guess</b> (e.g. “set a guess <Code>yn ≈ 0.6</Code>”). Open{' '}
              <Code>Ctrl + I</Code> (Variable Info), enter it, then solve — a good
              guess is usually what makes a nonlinear problem converge. Examples
              built on a <Code>PARAMETRIC</Code> table are solved from the Tables
              tab with <b>Solve Table</b>, not the main Solve.
            </Text>
          </Alert>
          {wsCats.length > 0 && (
            <Stack gap="xs">
              <Title order={3} c="teal.4" mt="sm">Quick Workspace Examples</Title>
              <Text size="sm" c="dimmed">
                Additional ready-to-run documents (the rest are in the File →
                Open Example picker). Copy one into the editor and press Solve.
              </Text>
              {wsCats.map(([category, examples]) => (
                <Stack gap="xs" key={`ws-${category}`}>
                  <Title order={4} c="teal.3" mt="sm">{category}</Title>
                  <MantineAccordion variant="separated">
                    {examples.map((ex) => (
                      <MantineAccordion.Item value={ex.id} key={ex.id}>
                        <MantineAccordion.Control>
                          <Text fw={600} c="teal.3">{ex.title}</Text>
                        </MantineAccordion.Control>
                        <MantineAccordion.Panel>
                          <Text size="sm" mb="xs">{ex.description}</Text>
                          <RunnableCode code={ex.text} title={ex.title} />
                        </MantineAccordion.Panel>
                      </MantineAccordion.Item>
                    ))}
                  </MantineAccordion>
                </Stack>
              ))}
            </Stack>
          )}
          {cycleCats.map(([category, examples]) => (
            <Stack gap="xs" key={category}>
              <Title order={4} c="teal.3" mt="sm">{category}</Title>
              <MantineAccordion variant="separated">
                {examples.map((ex) => (
                  <MantineAccordion.Item value={ex.value} key={ex.value}>
                    <MantineAccordion.Control>
                      <Text fw={600} c="teal.3">{exampleShortTitle(ex.title)}</Text>
                    </MantineAccordion.Control>
                    <MantineAccordion.Panel>
                      <Text size="sm" mb="xs">{ex.description}</Text>
                      {ex.note && (
                        <Alert color="gray" py="xs" mb="sm">
                          {ex.note}
                        </Alert>
                      )}
                      {ex.diagram === 'BraytonCycle' && (
                        <Paper withBorder p="sm" mb="sm" bg="light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-8))">
                          <BraytonCycleDiagram />
                        </Paper>
                      )}
                      <RunnableCode code={ex.code} title={exampleShortTitle(ex.title)} />
                    </MantineAccordion.Panel>
                  </MantineAccordion.Item>
                ))}
              </MantineAccordion>
            </Stack>
          ))}
        </Stack>
      );
    }

    if (active.startsWith(REFPAGE)) {
      const page = REFERENCE_BY_SLUG.get(active.slice(REFPAGE.length));
      if (page) return <ReferencePageView page={page} onNavigate={navigateTo} />;
    }
    if (active.startsWith(REFCAT)) return <ReferenceCategory category={active.slice(REFCAT.length)} onNavigate={navigateTo} />;

    // Reference data pages (single source of truth; the old Quick-Reference
    // duplicate tables are gone — symbols live on their per-symbol pages).
    if (active === 'ref-index') return <ReferenceIndex onNavigate={navigateTo} />;
    if (active === 'ref-fluids') return <FluidsReference />;
    if (active === 'ref-units') {
      return (
        <Stack gap="xl">
          <UnitsReference />
          <ConstantsReference />
        </Stack>
      );
    }

    // Category landing page: intro markdown (if any) + a card grid of its pages.
    const landingCategory = CATEGORY_BY_OVERVIEW.get(active);
    if (landingCategory) {
      return (
        <>
          <CategoryLanding category={landingCategory} intro={DOCS_CATALOG[active]} onNavigate={navigateTo} />
          <PrevNext active={active} onNavigate={navigateTo} />
        </>
      );
    }

    const docContent = DOCS_CATALOG[active];
    if (docContent) {
      return (
        <>
          <MarkdownRenderer content={docContent} onNavigate={navigateTo} />
          <PrevNext active={active} onNavigate={navigateTo} />
        </>
      );
    }

    return null;
  };

  const toc = tocMarkdown(active);
  const showToc = toc !== undefined && headingCount(toc) >= 2;

  return (
    <AppShell
      header={{ height: 100 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding={0}
      styles={{ main: { background: 'var(--mantine-color-body)', minHeight: '100vh' } }}
    >
      <AppShell.Header bg="var(--mantine-color-body)">
        <Group h={58} px="md" justify="space-between" wrap="nowrap" gap="sm">
          <Group gap="xs" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <UnstyledButton onClick={() => navigateTo(HOME)} aria-label="Documentation home">
              <Group gap={8} wrap="nowrap">
                <Text fw={700} fz={22}>frees</Text>
                <Text c="dimmed" fz={22} fw={400} visibleFrom="xs">Documentation</Text>
              </Group>
            </UnstyledButton>
          </Group>
          <Group gap="sm" wrap="nowrap" style={{ flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
            <Box style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
              <TextInput
                ref={searchRef}
                placeholder={scope === undefined ? 'Search functions, guides, examples…' : `Search ${scope}…`}
                aria-label="Search documentation"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                leftSection={<IconSearch size={16} />}
                rightSection={searchQuery
                  ? <CloseButton onClick={() => setSearchQuery('')} size="sm" aria-label="Clear search" />
                  : <Kbd size="xs">/</Kbd>}
              />
              {showResults && (
                <Paper
                  shadow="md"
                  withBorder
                  p="xs"
                  style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    maxHeight: '60vh', overflowY: 'auto',
                  }}
                >
                  <Group gap="xs" px="xs" pb={4} justify="space-between">
                    <Group gap={6} wrap="nowrap">
                      <Text size="xs" c="dimmed" fw={700}>
                        {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
                      </Text>
                      {scope !== undefined && (
                        <Badge
                          size="xs" variant="outline" color="teal" tt="none"
                          rightSection={<CloseButton size={12} aria-label="Search everything" onMouseDown={(e) => e.preventDefault()} onClick={() => setScopeDismissed(true)} />}
                        >
                          Scoped to {scope}
                        </Badge>
                      )}
                    </Group>
                    <Group gap={4}>
                      {SEARCH_FACETS.map(([kind, label]) => (
                        <Badge
                          key={kind}
                          size="xs"
                          variant={searchKind === kind ? 'filled' : 'light'}
                          color="teal"
                          style={{ cursor: 'pointer', textTransform: 'none' }}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setSearchKind(searchKind === kind ? null : kind)}
                        >
                          {label}
                        </Badge>
                      ))}
                    </Group>
                  </Group>
                  <Divider mb={4} />
                  {searchResults.length === 0 && (
                    <Text size="xs" c="dimmed" px="xs" py={6}>
                      {scope === undefined
                        ? `No ${SEARCH_FACETS.find(([k]) => k === searchKind)?.[1].toLowerCase()} results — click the chip again to search everything.`
                        : `Nothing in ${scope} — clear the scope to search everything.`}
                    </Text>
                  )}
                  {searchResults.map((hit, idx) => (
                    <Box
                      key={`${hit.id}-${idx}`}
                      onClick={() => navigateTo(hit.id)}
                      px="xs"
                      py={6}
                      style={{ cursor: 'pointer', borderRadius: '4px' }}
                      onMouseDown={(e) => e.preventDefault()}
                      className="search-result-row"
                    >
                      <Group gap="xs" justify="space-between" wrap="nowrap">
                        <Text size="sm" fw={600} style={{ flexGrow: 1 }}>
                          <Highlight highlight={searchQuery.trim()} component="span">
                            {hit.label}
                          </Highlight>
                        </Text>
                        <Badge size="xs" variant="light" color="gray">{hit.section}</Badge>
                      </Group>
                      {hit.snippet && (
                        <Text size="xs" c="dimmed" lineClamp={2} mt={2}>
                          <Highlight highlight={searchQuery.trim().split(/\s+/)} component="span">
                            {hit.snippet}
                          </Highlight>
                        </Text>
                      )}
                    </Box>
                  ))}
                </Paper>
              )}
            </Box>
            <Badge variant="filled" color="teal" tt="none" visibleFrom="sm">{VERSION_LABEL}</Badge>
            <Button component="a" href={import.meta.env.BASE_URL} variant="outline" size="xs" visibleFrom="sm">
              Open app
            </Button>
          </Group>
        </Group>
        <Tabs value={scopeOf(active)} onChange={(v) => {
          const tab = SCOPE_TABS.find((t) => t.value === v);
          if (tab) navigateTo(tab.target);
        }}>
          <Tabs.List px="md" style={{ flexWrap: 'nowrap', overflowX: 'auto' }}>
            {SCOPE_TABS.map((t) => <Tabs.Tab key={t.value} value={t.value}>{t.label}</Tabs.Tab>)}
          </Tabs.List>
        </Tabs>
      </AppShell.Header>

      <AppShell.Navbar p="sm" bg="var(--mantine-color-body)">
        <AppShell.Section grow component={ScrollArea} offsetScrollbars>
          <Stack gap="md" py="xs">
            {renderNav()}
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Box px={{ base: 'md', md: 'xl' }} py="lg" style={{ display: 'flex', gap: 40, justifyContent: 'center' }}>
          <Box id="help-article" style={{ flex: 1, minWidth: 0, maxWidth: 880, overflowX: 'clip' }}>
            <Breadcrumbs trail={trailOf(active)} onNavigate={navigateTo} />
            {renderContent()}
          </Box>
          {showToc && (
            <Box visibleFrom="lg" w={220} style={{ flexShrink: 0 }}>
              <Box style={{ position: 'sticky', top: 124 }}>
                <Text size="xs" fw={700} c="dimmed" mb={6} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  On this page
                </Text>
                <TableOfContents
                  key={active}
                  variant="none"
                  size="sm"
                  color="teal"
                  reinitializeRef={reinitializeToc}
                  scrollSpyOptions={{
                    selector: '#help-article h3[id], #help-article h4[id]',
                    getDepth: (el) => (el.tagName === 'H4' ? 2 : 1),
                    offset: 120,
                  }}
                  getControlProps={({ active: current, data }) => ({
                    children: data.value,
                    onClick: () => data.getNode().scrollIntoView({ behavior: 'smooth', block: 'start' }),
                    style: {
                      color: current ? 'var(--mantine-color-teal-4)' : 'var(--mantine-color-dimmed)',
                      borderLeft: `2px solid ${current ? 'var(--mantine-color-teal-5)' : 'transparent'}`,
                      paddingLeft: 10 + (data.depth - 1) * 14,
                    },
                  })}
                />
              </Box>
            </Box>
          )}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
