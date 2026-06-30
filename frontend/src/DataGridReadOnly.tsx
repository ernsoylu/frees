import { useCallback, useMemo, useState } from 'react'
import {
  DataEditor,
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
  Theme as GdgTheme,
} from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { useComputedColorScheme, useMantineTheme } from '@mantine/core'
import { useElementSize } from '@mantine/hooks'
import { ParamRow } from './ParametricTableTab'
import { VariableDraft } from './VariableInfoModal'

// ---------------------------------------------------------------------------
// Read-only, virtualized data grid for solver-produced tables (code PARAMETRIC
// blocks and DYNAMIC/ODE trajectories). These can be very wide (every system
// variable becomes a column) and very tall (one row per ODE sample point), so
// they are rendered through glide-data-grid — a canvas grid that only paints
// the visible window — instead of the per-cell Mantine inputs used for small,
// editable parametric tables. The grid is themed from the Mantine tokens so it
// tracks the app's dark/light color scheme.
// ---------------------------------------------------------------------------

interface Props {
  vars: string[]
  rows: ParamRow[]
  /** Per-variable display metadata; only `units` is used here (header label). */
  varDrafts: Record<string, VariableDraft>
}

export default function DataGridReadOnly({ vars, rows, varDrafts }: Readonly<Props>) {
  const theme = useMantineTheme()
  const scheme = useComputedColorScheme('dark')
  const dark = scheme === 'dark'
  const { ref, width, height } = useElementSize()

  // Map glide's theme onto Mantine tokens so the grid matches the rest of the
  // app and follows the active color scheme. Header text uses the same teal the
  // Mantine table headers used; cell backgrounds use the dark surface shades.
  const gridTheme = useMemo<Partial<GdgTheme>>(() => {
    const c = theme.colors
    return {
      accentColor: c.teal[6],
      accentLight: dark ? 'rgba(56, 178, 172, 0.18)' : 'rgba(56, 178, 172, 0.12)',
      textDark: dark ? c.dark[0] : c.gray[9],
      textMedium: dark ? c.dark[1] : c.gray[7],
      textLight: dark ? c.dark[2] : c.gray[5],
      textHeader: c.teal[4],
      textHeaderSelected: c.teal[3],
      bgCell: dark ? c.dark[7] : theme.white,
      bgCellMedium: dark ? c.dark[6] : c.gray[0],
      bgHeader: dark ? c.dark[6] : c.gray[1],
      bgHeaderHovered: dark ? c.dark[5] : c.gray[2],
      bgHeaderHasFocus: dark ? c.dark[5] : c.gray[2],
      bgBubble: dark ? c.dark[5] : c.gray[1],
      bgBubbleSelected: c.teal[7],
      bgSearchResult: dark ? c.yellow[9] : c.yellow[2],
      borderColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      horizontalBorderColor: dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
      drilldownBorder: dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
      fontFamily: theme.fontFamilyMonospace,
      baseFontStyle: '12px',
      headerFontStyle: '600 12px',
      editorFontSize: '12px',
      cellHorizontalPadding: 8,
      cellVerticalPadding: 4,
    }
  }, [theme, dark])

  // Columns are user-resizable; remember overrides keyed by column id (var name).
  const [widthOverrides, setWidthOverrides] = useState<Record<string, number>>({})
  const columns = useMemo<GridColumn[]>(
    () =>
      vars.map((name) => {
        const units = varDrafts[name]?.units
        // Demangle flat solver names for display only: component port members are
        // stored as `brg$port$t` but shown dotted (`brg.port.t`), matching how the
        // rest of the app renders them. The column id / data key stays the raw
        // name so cell lookup and plot wiring are unaffected.
        const label = name.replace(/\$/g, '.')
        const title = units ? `${label} [${units}]` : label
        return {
          id: name,
          title,
          width: widthOverrides[name] ?? Math.max(96, title.length * 8 + 28),
        }
      }),
    [vars, varDrafts, widthOverrides],
  )

  // Cell values are already formatted strings (fmt6) on the ParamRow; paint them
  // right-aligned as read-only text (no overlay editor).
  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const name = vars[col]
      const value = rows[row]?.values[name] ?? ''
      return {
        kind: GridCellKind.Text,
        data: value,
        displayData: value,
        allowOverlay: false,
        contentAlign: 'right',
      }
    },
    [vars, rows],
  )

  const onColumnResize = useCallback((column: GridColumn, newSize: number) => {
    if (column.id) setWidthOverrides((w) => ({ ...w, [column.id as string]: newSize }))
  }, [])

  return (
    <div ref={ref} style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative' }}>
      {width > 0 && height > 0 && (
        <DataEditor
          theme={gridTheme}
          columns={columns}
          rows={rows.length}
          getCellContent={getCellContent}
          width={width}
          height={height}
          rowMarkers="number"
          smoothScrollX
          smoothScrollY
          getCellsForSelection
          onColumnResize={onColumnResize}
        />
      )}
    </div>
  )
}
