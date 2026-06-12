import { useState } from 'react'
import {
  Button,
  Checkbox,
  ColorInput,
  Divider,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import {
  DIAGRAM_TYPES,
  PlotFormat,
  PlotKind,
  PlotSpec,
  PropertyConfig,
  PsychroConfig,
  XYConfig,
  diagramAxes,
  newPlotSpec,
} from './types'
import { defaultUnitId, unitIdsFor } from './units'

interface Props {
  /** Existing spec to edit, or null to create a new plot. */
  spec: PlotSpec | null
  /** Plot kinds this window offers (Plots: xy; Thermodynamics: property/psychro). */
  allowedKinds: PlotKind[]
  defaultName: string
  fluids: string[]
  tableVars: string[]
  hasStates: boolean
  onSave: (spec: PlotSpec) => void
  onClose: () => void
}

function XYSection({
  config,
  tableVars,
  onChange,
}: Readonly<{
  config: XYConfig
  tableVars: string[]
  onChange: (config: XYConfig) => void
}>) {
  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed">
        Plots solved parametric table runs. Configure and solve the table
        first.
      </Text>
      <Group grow>
        <Select
          label="X-axis variable"
          size="xs"
          data={tableVars}
          value={config.xVar}
          onChange={(xVar) => onChange({ ...config, xVar })}
          searchable
        />
        <MultiSelect
          label="Y-axis variables"
          size="xs"
          data={tableVars}
          value={config.yVars}
          onChange={(yVars) => onChange({ ...config, yVars })}
          searchable
        />
      </Group>
    </Stack>
  )
}

function PropertySection({
  config,
  fluids,
  hasStates,
  onChange,
}: Readonly<{
  config: PropertyConfig
  fluids: string[]
  hasStates: boolean
  onChange: (config: PropertyConfig) => void
}>) {
  return (
    <Stack gap="xs">
      <Group grow>
        <Select
          label="Fluid"
          size="xs"
          data={fluids}
          value={config.fluid}
          onChange={(fluid) => fluid && onChange({ ...config, fluid })}
          searchable
        />
        <Select
          label="Diagram"
          size="xs"
          data={DIAGRAM_TYPES}
          value={config.diagram}
          onChange={(diagram) => diagram && onChange({ ...config, diagram })}
        />
      </Group>
      <Group gap="md">
        <Checkbox
          label="Quality lines"
          size="xs"
          checked={config.quality}
          onChange={(e) => onChange({ ...config, quality: e.currentTarget.checked })}
        />
        <Checkbox
          label="Isolines (P/T/s)"
          size="xs"
          checked={config.isolines}
          onChange={(e) => onChange({ ...config, isolines: e.currentTarget.checked })}
        />
      </Group>
      <Divider label="State points" labelPosition="left" />
      {!hasStates && (
        <Text size="xs" c="dimmed">
          No states detected. Solve a system with numbered properties (h1,
          s1, T[2], ...) and they appear here and in the States tab.
        </Text>
      )}
      <Group gap="md">
        <Checkbox
          label="Overlay states"
          size="xs"
          checked={config.overlayStates}
          onChange={(e) =>
            onChange({ ...config, overlayStates: e.currentTarget.checked })
          }
        />
        <Checkbox
          label="Connect in order"
          size="xs"
          checked={config.connectStates}
          disabled={!config.overlayStates}
          onChange={(e) =>
            onChange({ ...config, connectStates: e.currentTarget.checked })
          }
        />
        <Checkbox
          label="Close cycle"
          size="xs"
          checked={config.closeCycle}
          disabled={!config.overlayStates || !config.connectStates}
          onChange={(e) => onChange({ ...config, closeCycle: e.currentTarget.checked })}
        />
      </Group>
    </Stack>
  )
}

function PsychroSection({
  config,
  onChange,
}: Readonly<{
  config: PsychroConfig
  onChange: (config: PsychroConfig) => void
}>) {
  return (
    <Stack gap="xs">
      <Group grow>
        <NumberInput
          label="Pressure [kPa]"
          size="xs"
          value={config.pressureKPa}
          onChange={(v) =>
            onChange({ ...config, pressureKPa: typeof v === 'number' ? v : 101.325 })
          }
          min={2}
        />
        <NumberInput
          label="T min [°C]"
          size="xs"
          value={config.tMinC}
          onChange={(v) =>
            onChange({ ...config, tMinC: typeof v === 'number' ? v : 0 })
          }
        />
        <NumberInput
          label="T max [°C]"
          size="xs"
          value={config.tMaxC}
          onChange={(v) =>
            onChange({ ...config, tMaxC: typeof v === 'number' ? v : 50 })
          }
        />
      </Group>
      <Group gap="md">
        <Checkbox
          label="Wet-bulb lines"
          size="xs"
          checked={config.wetBulb}
          onChange={(e) => onChange({ ...config, wetBulb: e.currentTarget.checked })}
        />
        <Checkbox
          label="Enthalpy lines"
          size="xs"
          checked={config.enthalpy}
          onChange={(e) => onChange({ ...config, enthalpy: e.currentTarget.checked })}
        />
        <Checkbox
          label="Specific volume lines"
          size="xs"
          checked={config.volume}
          onChange={(e) => onChange({ ...config, volume: e.currentTarget.checked })}
        />
      </Group>
      <Divider label="State points" labelPosition="left" />
      <Text size="xs" c="dimmed">
        States with a dry-bulb temperature and a humidity ratio (e.g. T1 and
        w1) are drawn on the chart.
      </Text>
      <Group gap="md">
        <Checkbox
          label="Overlay states"
          size="xs"
          checked={config.overlayStates}
          onChange={(e) =>
            onChange({ ...config, overlayStates: e.currentTarget.checked })
          }
        />
        <Checkbox
          label="Connect in order"
          size="xs"
          checked={config.connectStates}
          disabled={!config.overlayStates}
          onChange={(e) =>
            onChange({ ...config, connectStates: e.currentTarget.checked })
          }
        />
      </Group>
    </Stack>
  )
}

/** Axis properties whose units can be selected for the current plot. */
function axisProperties(spec: PlotSpec): { x: string; y: string } | null {
  if (spec.kind === 'property') {
    return diagramAxes(spec.property.diagram)
  }
  if (spec.kind === 'psychro') {
    return { x: 'T', y: 'w' }
  }
  return null
}

function XyLineColors({
  spec,
  format,
  onChange,
}: Readonly<{
  spec: PlotSpec
  format: PlotFormat
  onChange: (format: PlotFormat) => void
}>) {
  if (spec.xy.yVars.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        Select Y-axis variables first to configure their colors.
      </Text>
    )
  }
  return (
    <Group gap="xs">
      {spec.xy.yVars.map((yVar) => (
        <ColorInput
          key={yVar}
          label={`Color for ${yVar}`}
          size="xs"
          style={{ flex: '1 1 120px' }}
          value={format.lineColors?.[yVar] ?? '#228be6'}
          onChange={(color) => {
            const lineColors = { ...format.lineColors, [yVar]: color }
            onChange({ ...format, lineColors })
          }}
        />
      ))}
    </Group>
  )
}

function FormatSection({
  spec,
  onChange,
}: Readonly<{
  spec: PlotSpec
  onChange: (format: PlotFormat) => void
}>) {
  const format = spec.format
  const axes = axisProperties(spec)
  return (
    <Stack gap="xs">
      <Group grow>
        <TextInput
          label="Title"
          size="xs"
          value={format.title}
          placeholder="auto"
          onChange={(e) => onChange({ ...format, title: e.currentTarget.value })}
        />
        <NumberInput
          label="Font size"
          size="xs"
          value={format.fontSize}
          min={8}
          max={24}
          onChange={(v) =>
            onChange({ ...format, fontSize: typeof v === 'number' ? v : 13 })
          }
        />
      </Group>
      <Group grow>
        <TextInput
          label="X-axis label"
          size="xs"
          value={format.xLabel}
          placeholder="auto"
          onChange={(e) => onChange({ ...format, xLabel: e.currentTarget.value })}
        />
        <TextInput
          label="Y-axis label"
          size="xs"
          value={format.yLabel}
          placeholder="auto"
          onChange={(e) => onChange({ ...format, yLabel: e.currentTarget.value })}
        />
      </Group>
      <Group grow>
        <NumberInput
          label="X min (auto if empty)"
          size="xs"
          value={format.xMin ?? ''}
          onChange={(v) =>
            onChange({ ...format, xMin: typeof v === 'number' ? v : null })
          }
        />
        <NumberInput
          label="X max (auto if empty)"
          size="xs"
          value={format.xMax ?? ''}
          onChange={(v) =>
            onChange({ ...format, xMax: typeof v === 'number' ? v : null })
          }
        />
        <NumberInput
          label="X tick interval"
          size="xs"
          value={format.xTick ?? ''}
          min={0}
          onChange={(v) =>
            onChange({ ...format, xTick: typeof v === 'number' && v > 0 ? v : null })
          }
        />
      </Group>
      <Group grow>
        <NumberInput
          label="Y min (auto if empty)"
          size="xs"
          value={format.yMin ?? ''}
          onChange={(v) =>
            onChange({ ...format, yMin: typeof v === 'number' ? v : null })
          }
        />
        <NumberInput
          label="Y max (auto if empty)"
          size="xs"
          value={format.yMax ?? ''}
          onChange={(v) =>
            onChange({ ...format, yMax: typeof v === 'number' ? v : null })
          }
        />
        <NumberInput
          label="Y tick interval"
          size="xs"
          value={format.yTick ?? ''}
          min={0}
          onChange={(v) =>
            onChange({ ...format, yTick: typeof v === 'number' && v > 0 ? v : null })
          }
        />
      </Group>
      {axes && (
        <Group grow>
          <Select
            label={`X unit (${axes.x})`}
            size="xs"
            data={unitIdsFor(axes.x)}
            value={format.xUnit ?? defaultUnitId(axes.x, format.celsius)}
            onChange={(xUnit) => onChange({ ...format, xUnit })}
          />
          <Select
            label={`Y unit (${axes.y})`}
            size="xs"
            data={unitIdsFor(axes.y)}
            value={format.yUnit ?? defaultUnitId(axes.y, false)}
            onChange={(yUnit) => onChange({ ...format, yUnit })}
          />
        </Group>
      )}
      <Group gap="md">
        <Checkbox
          label="Log X"
          size="xs"
          checked={format.xLog ?? false}
          indeterminate={format.xLog === null}
          onChange={(e) => onChange({ ...format, xLog: e.currentTarget.checked })}
        />
        <Checkbox
          label="Log Y"
          size="xs"
          checked={format.yLog ?? false}
          indeterminate={format.yLog === null}
          onChange={(e) => onChange({ ...format, yLog: e.currentTarget.checked })}
        />
        <Checkbox
          label="Grid"
          size="xs"
          checked={format.grid}
          onChange={(e) => onChange({ ...format, grid: e.currentTarget.checked })}
        />
        <Checkbox
          label="Legend"
          size="xs"
          checked={format.legend}
          onChange={(e) => onChange({ ...format, legend: e.currentTarget.checked })}
        />
      </Group>

      <Divider label="Line Colors" labelPosition="left" />
      {spec.kind === 'xy' ? (
        <XyLineColors spec={spec} format={format} onChange={onChange} />
      ) : (
        <Group grow>
          <ColorInput
            label="States Overlay / Cycle path color"
            size="xs"
            value={format.lineColors?.['states'] ?? '#ffa94b'}
            onChange={(color) => {
              const lineColors = { ...format.lineColors, states: color }
              onChange({ ...format, lineColors })
            }}
          />
        </Group>
      )}
    </Stack>
  )
}

const KIND_OPTIONS = [
  { value: 'property', label: 'Property diagram' },
  { value: 'psychro', label: 'Psychrometric chart' },
  { value: 'xy', label: 'X-Y (parametric table)' },
]

export default function PlotConfigModal({
  spec,
  allowedKinds,
  defaultName,
  fluids,
  tableVars,
  hasStates,
  onSave,
  onClose,
}: Readonly<Props>) {
  const [draft, setDraft] = useState<PlotSpec>(
    () => spec ?? newPlotSpec(allowedKinds[0], defaultName),
  )
  const creating = spec === null
  const kindOptions = KIND_OPTIONS.filter((o) =>
    allowedKinds.includes(o.value as PlotKind),
  )

  function changeKind(kind: PlotKind) {
    setDraft((d) => ({ ...d, kind, format: { ...d.format, celsius: kind === 'psychro' } }))
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={creating ? 'Add Plot' : `Configure — ${draft.name}`}
      size="lg"
    >
      <Stack gap="sm">
        <Group grow align="flex-end">
          <TextInput
            label="Plot name"
            size="xs"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.currentTarget.value })}
          />
          {kindOptions.length > 1 && (
            <SegmentedControl
              size="xs"
              data={kindOptions}
              value={draft.kind}
              onChange={(kind) => changeKind(kind as PlotKind)}
            />
          )}
        </Group>

        {draft.kind === 'xy' && (
          <XYSection
            config={draft.xy}
            tableVars={tableVars}
            onChange={(xy) => setDraft({ ...draft, xy })}
          />
        )}
        {draft.kind === 'property' && (
          <PropertySection
            config={draft.property}
            fluids={fluids}
            hasStates={hasStates}
            onChange={(property) =>
              setDraft((d) => ({
                ...d,
                property,
                // A new diagram has different axes; drop unit overrides.
                format:
                  property.diagram === d.property.diagram
                    ? d.format
                    : { ...d.format, xUnit: null, yUnit: null },
              }))
            }
          />
        )}
        {draft.kind === 'psychro' && (
          <PsychroSection
            config={draft.psychro}
            onChange={(psychro) => setDraft({ ...draft, psychro })}
          />
        )}

        <Divider label="Format" labelPosition="left" />
        <FormatSection
          spec={draft}
          onChange={(format) => setDraft({ ...draft, format })}
        />

        <Group justify="flex-end" mt="xs">
          <Button variant="default" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button size="xs" onClick={() => onSave(draft)}>
            {creating ? 'Add plot' : 'Apply'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
