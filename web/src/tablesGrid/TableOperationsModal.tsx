import { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  Select,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  TextInput,
} from '@mantine/core'
import { ParamTableSpec, TableSpec } from '../tables'
import {
  filterTableRows,
  transformTableColumn,
  groupTableSummary,
  rollingTableStatistics,
  joinTables,
  functionTableToParamTable,
  FilterOperator,
  AggregationOp,
} from './tableOperations'

interface Props {
  opened: boolean
  onClose: () => void
  tables: TableSpec[]
  activeTableId: string | null
  onAddTable: (table: ParamTableSpec) => void
}

export default function TableOperationsModal({
  opened,
  onClose,
  tables,
  activeTableId,
  onAddTable,
}: Readonly<Props>) {
  // Convert any function tables to parametric representation so all tables are wrangleable
  const availableTables = useMemo(
    () =>
      tables.map((t) => {
        if (t.kind === 'parametric') return t
        return functionTableToParamTable(t)
      }),
    [tables],
  )

  const [activeTab, setActiveTab] = useState<string | null>('filter')
  const [selectedTableId, setSelectedTableId] = useState<string>(
    activeTableId && availableTables.some((t) => t.id === activeTableId)
      ? activeTableId
      : (availableTables[0]?.id ?? ''),
  )

  const currentTable = useMemo(
    () => availableTables.find((t) => t.id === selectedTableId) ?? availableTables[0],
    [availableTables, selectedTableId],
  )

  const colOptions = useMemo(() => {
    if (!currentTable) return []
    return currentTable.vars.map((v) => ({
      value: v,
      label: currentTable.columnUnits?.[v] ? `${v} [${currentTable.columnUnits[v]}]` : v,
    }))
  }, [currentTable])

  // --- Filter State ---
  const [filterMode, setFilterMode] = useState<'column' | 'custom'>('column')
  const [filterCol, setFilterCol] = useState<string>('')
  const effectiveFilterCol =
    filterCol && currentTable?.vars.includes(filterCol) ? filterCol : (currentTable?.vars[0] ?? '')
  const [filterOp, setFilterOp] = useState<FilterOperator>('>')
  const [filterVal1, setFilterVal1] = useState<number>(0)
  const [filterVal2, setFilterVal2] = useState<number>(100)
  const [filterCustomExpr, setFilterCustomExpr] = useState<string>('')
  const [filterMissingPolicy, setFilterMissingPolicy] = useState<'drop' | 'keep'>('drop')
  const [filterOutName, setFilterOutName] = useState<string>('')

  // --- Transform State ---
  const [targetCol, setTargetCol] = useState<string>('derived')
  const [transformExpr, setTransformExpr] = useState<string>('')
  const [transformUnit, setTransformUnit] = useState<string>('')
  const [transformOutName, setTransformOutName] = useState<string>('')

  // --- Group & Aggregate State ---
  const [groupCols, setGroupCols] = useState<string[]>([])
  const [aggCol, setAggCol] = useState<string>('')
  const effectiveAggCol =
    aggCol && currentTable?.vars.includes(aggCol) ? aggCol : (currentTable?.vars[0] ?? '')
  const [aggOp, setAggOp] = useState<AggregationOp>('mean')
  const [groupOutName, setGroupOutName] = useState<string>('')

  // --- Rolling Stats State ---
  const [rollingCol, setRollingCol] = useState<string>('')
  const effectiveRollingCol =
    rollingCol && currentTable?.vars.includes(rollingCol) ? rollingCol : (currentTable?.vars[0] ?? '')
  const [rollingWindow, setRollingWindow] = useState<number>(5)
  const [rollingMean, setRollingMean] = useState<boolean>(true)
  const [rollingStd, setRollingStd] = useState<boolean>(false)
  const [rollingMedian, setRollingMedian] = useState<boolean>(false)
  const [rollingOutName, setRollingOutName] = useState<string>('')

  // --- Join State ---
  const [joinTableBId, setJoinTableBId] = useState<string>('')
  const effectiveJoinTableBId =
    joinTableBId && joinTableBId !== selectedTableId && availableTables.some((t) => t.id === joinTableBId)
      ? joinTableBId
      : (availableTables.find((t) => t.id !== selectedTableId)?.id ?? '')
  const tableB = useMemo(
    () => availableTables.find((t) => t.id === effectiveJoinTableBId),
    [availableTables, effectiveJoinTableBId],
  )
  const [joinKeyA, setJoinKeyA] = useState<string>('')
  const effectiveJoinKeyA =
    joinKeyA && currentTable?.vars.includes(joinKeyA) ? joinKeyA : (currentTable?.vars[0] ?? '')
  const [joinKeyB, setJoinKeyB] = useState<string>('')
  const effectiveJoinKeyB =
    joinKeyB && tableB?.vars.includes(joinKeyB) ? joinKeyB : (tableB?.vars[0] ?? '')
  const [joinType, setJoinType] = useState<'inner' | 'left' | 'outer'>('inner')
  const [joinMode, setJoinMode] = useState<'exact' | 'interpolate'>('exact')
  const [extrapPolicy, setExtrapPolicy] = useState<'clamp' | 'nan'>('nan')
  const [joinOutName, setJoinOutName] = useState<string>('')

  const [error, setError] = useState<string | null>(null)

  const handleApplyFilter = () => {
    setError(null)
    if (!currentTable) return
    try {
      const condition =
        filterMode === 'custom'
          ? { operator: filterOp, customExpression: filterCustomExpr }
          : {
              column: effectiveFilterCol,
              operator: filterOp,
              value: filterVal1,
              value2: filterVal2,
            }
      const baseName = filterOutName.trim() || `${currentTable.name}_filtered`
      const { table: newTable } = filterTableRows(
        currentTable,
        {
          condition,
          name: baseName,
          missingPolicy: filterMissingPolicy,
        },
        tables,
      )
      onAddTable(newTable)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleApplyTransform = () => {
    setError(null)
    if (!currentTable) return
    if (!targetCol.trim()) {
      setError('Target column name is required.')
      return
    }
    if (!transformExpr.trim()) {
      setError('Transform expression is required.')
      return
    }
    try {
      const baseName = transformOutName.trim() || `${currentTable.name}_transformed`
      const { table: newTable } = transformTableColumn(
        currentTable,
        {
          targetColumn: targetCol.trim(),
          expression: transformExpr.trim(),
          unit: transformUnit.trim() || undefined,
          name: baseName,
        },
        tables,
      )
      onAddTable(newTable)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleApplyGroup = () => {
    setError(null)
    if (!currentTable) return
    if (groupCols.length === 0) {
      setError('Please select at least one column to group by.')
      return
    }
    if (!effectiveAggCol) {
      setError('Please select a column to aggregate.')
      return
    }
    try {
      const baseName = groupOutName.trim() || `${currentTable.name}_summary`
      const { table: newTable } = groupTableSummary(
        currentTable,
        {
          groupColumns: groupCols,
          aggregations: [{ column: effectiveAggCol, op: aggOp }],
          name: baseName,
        },
        tables,
      )
      onAddTable(newTable)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleApplyRolling = () => {
    setError(null)
    if (!currentTable) return
    const ops: ('mean' | 'std' | 'median')[] = []
    if (rollingMean) ops.push('mean')
    if (rollingStd) ops.push('std')
    if (rollingMedian) ops.push('median')
    if (ops.length === 0) {
      setError('Please select at least one rolling statistic.')
      return
    }
    try {
      const baseName = rollingOutName.trim() || `${currentTable.name}_rolling`
      const { table: newTable } = rollingTableStatistics(
        currentTable,
        {
          column: effectiveRollingCol,
          windowSize: rollingWindow,
          operations: ops,
          name: baseName,
        },
        tables,
      )
      onAddTable(newTable)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const handleApplyJoin = () => {
    setError(null)
    if (!currentTable || !tableB) {
      setError('Both tables must be selected for a join.')
      return
    }
    if (!effectiveJoinKeyA || !effectiveJoinKeyB) {
      setError('Join keys must be selected for both tables.')
      return
    }
    try {
      const baseName = joinOutName.trim() || `${currentTable.name}_joined_${tableB.name}`
      const { table: newTable } = joinTables(
        currentTable,
        tableB,
        {
          type: joinType,
          keyA: effectiveJoinKeyA,
          keyB: effectiveJoinKeyB,
          mode: joinMode,
          extrapolationPolicy: extrapPolicy,
          name: baseName,
        },
        tables,
      )
      onAddTable(newTable)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Measurement Table Operations & Wrangling"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Select
            label="Source Table"
            size="xs"
            w={260}
            data={availableTables.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.rows.length} rows)`,
            }))}
            value={selectedTableId}
            onChange={(val) => {
              if (val) setSelectedTableId(val)
            }}
          />
          {currentTable && (
            <Badge variant="light" color="blue">
              {currentTable.vars.length} columns | {currentTable.rows.length} rows
            </Badge>
          )}
        </Group>

        {error && (
          <Alert color="red" title="Operation Error">
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="filter">Row Filter</Tabs.Tab>
            <Tabs.Tab value="transform">Transform Column</Tabs.Tab>
            <Tabs.Tab value="group">Group & Aggregate</Tabs.Tab>
            <Tabs.Tab value="rolling">Rolling Statistics</Tabs.Tab>
            <Tabs.Tab value="join">Join / Align</Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: ROW FILTER */}
          <Tabs.Panel value="filter" pt="sm">
            <Stack gap="xs">
              <SegmentedControl
                size="xs"
                value={filterMode}
                onChange={(val) => setFilterMode(val as 'column' | 'custom')}
                data={[
                  { value: 'column', label: 'Column Condition' },
                  { value: 'custom', label: 'Custom Predicate Expression' },
                ]}
              />

              {filterMode === 'column' ? (
                <Group grow align="end">
                  <Select
                    label="Column"
                    size="xs"
                    data={colOptions}
                    value={effectiveFilterCol}
                    onChange={(v) => v && setFilterCol(v)}
                  />
                  <Select
                    label="Operator"
                    size="xs"
                    data={[
                      { value: '>', label: '> (greater than)' },
                      { value: '>=', label: '>= (greater or equal)' },
                      { value: '<', label: '< (less than)' },
                      { value: '<=', label: '<= (less or equal)' },
                      { value: '==', label: '== (equal)' },
                      { value: '!=', label: '!= (not equal)' },
                      { value: 'between', label: 'between (range)' },
                      { value: 'is_finite', label: 'is finite (non-NaN)' },
                      { value: 'is_nan', label: 'is missing / NaN' },
                    ]}
                    value={filterOp}
                    onChange={(v) => v && setFilterOp(v as FilterOperator)}
                  />
                  {filterOp !== 'is_finite' && filterOp !== 'is_nan' && (
                    <NumberInput
                      label="Value"
                      size="xs"
                      value={filterVal1}
                      onChange={(v) => setFilterVal1(Number(v) || 0)}
                    />
                  )}
                  {filterOp === 'between' && (
                    <NumberInput
                      label="Max Value"
                      size="xs"
                      value={filterVal2}
                      onChange={(v) => setFilterVal2(Number(v) || 0)}
                    />
                  )}
                </Group>
              ) : (
                <TextInput
                  label="Predicate Expression (e.g. temp > 25 && pressure <= 101.3)"
                  size="xs"
                  placeholder="x > 0 && y < 100"
                  value={filterCustomExpr}
                  onChange={(e) => setFilterCustomExpr(e.currentTarget.value)}
                />
              )}

              <Group align="end" justify="space-between">
                <Select
                  label="Missing (NaN) values"
                  size="xs"
                  w={180}
                  data={[
                    { value: 'drop', label: 'Drop missing rows' },
                    { value: 'keep', label: 'Keep missing rows' },
                  ]}
                  value={filterMissingPolicy}
                  onChange={(v) => v && setFilterMissingPolicy(v as 'drop' | 'keep')}
                />
                <TextInput
                  label="Output Table Name"
                  size="xs"
                  placeholder={`${currentTable?.name || 'table'}_filtered`}
                  value={filterOutName}
                  onChange={(e) => setFilterOutName(e.currentTarget.value)}
                />
                <Button size="xs" onClick={handleApplyFilter}>
                  Apply Filter
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          {/* TAB 2: TRANSFORM COLUMN */}
          <Tabs.Panel value="transform" pt="sm">
            <Stack gap="xs">
              <Group grow align="end">
                <TextInput
                  label="Target Column Name"
                  size="xs"
                  placeholder="e.g. power, temp_k"
                  value={targetCol}
                  onChange={(e) => setTargetCol(e.currentTarget.value)}
                />
                <TextInput
                  label="Unit (Optional)"
                  size="xs"
                  placeholder="e.g. kW, K, m/s"
                  value={transformUnit}
                  onChange={(e) => setTransformUnit(e.currentTarget.value)}
                />
              </Group>

              <TextInput
                label="Expression"
                size="xs"
                placeholder="e.g. sqrt(x^2 + y^2) or pressure * 1000 or temp + 273.15"
                value={transformExpr}
                onChange={(e) => setTransformExpr(e.currentTarget.value)}
              />

              <Text size="xs" c="dimmed">
                Available math functions: sqrt, log, exp, sin, cos, abs, min, max, pow. Case-insensitive column references.
              </Text>

              <Group justify="space-between" align="end">
                <TextInput
                  label="Output Table Name"
                  size="xs"
                  placeholder={`${currentTable?.name || 'table'}_transformed`}
                  value={transformOutName}
                  onChange={(e) => setTransformOutName(e.currentTarget.value)}
                />
                <Button size="xs" onClick={handleApplyTransform}>
                  Compute Transform
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          {/* TAB 3: GROUP & AGGREGATE */}
          <Tabs.Panel value="group" pt="sm">
            <Stack gap="xs">
              <MultiSelect
                label="Group-by Column(s)"
                size="xs"
                placeholder="Select categorical or discrete key columns"
                data={colOptions}
                value={groupCols}
                onChange={setGroupCols}
              />

              <Group grow align="end">
                <Select
                  label="Column to Aggregate"
                  size="xs"
                  data={colOptions}
                  value={effectiveAggCol}
                  onChange={(v) => v && setAggCol(v)}
                />
                <Select
                  label="Aggregation Operation"
                  size="xs"
                  data={[
                    { value: 'mean', label: 'Mean (Average)' },
                    { value: 'std', label: 'Standard Deviation' },
                    { value: 'median', label: 'Median' },
                    { value: 'min', label: 'Minimum' },
                    { value: 'max', label: 'Maximum' },
                    { value: 'sum', label: 'Sum' },
                    { value: 'count', label: 'Sample Count' },
                  ]}
                  value={aggOp}
                  onChange={(v) => v && setAggOp(v as AggregationOp)}
                />
              </Group>

              <Group justify="space-between" align="end">
                <TextInput
                  label="Output Table Name"
                  size="xs"
                  placeholder={`${currentTable?.name || 'table'}_summary`}
                  value={groupOutName}
                  onChange={(e) => setGroupOutName(e.currentTarget.value)}
                />
                <Button size="xs" onClick={handleApplyGroup}>
                  Generate Summary
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          {/* TAB 4: ROLLING STATISTICS */}
          <Tabs.Panel value="rolling" pt="sm">
            <Stack gap="xs">
              <Group grow align="end">
                <Select
                  label="Target Column"
                  size="xs"
                  data={colOptions}
                  value={effectiveRollingCol}
                  onChange={(v) => v && setRollingCol(v)}
                />
                <NumberInput
                  label="Window Size (k rows)"
                  size="xs"
                  min={1}
                  max={500}
                  value={rollingWindow}
                  onChange={(v) => setRollingWindow(Number(v) || 5)}
                />
              </Group>

              <Group gap="md">
                <Button
                  size="xs"
                  variant={rollingMean ? 'filled' : 'outline'}
                  onClick={() => setRollingMean(!rollingMean)}
                >
                  Moving Mean
                </Button>
                <Button
                  size="xs"
                  variant={rollingStd ? 'filled' : 'outline'}
                  onClick={() => setRollingStd(!rollingStd)}
                >
                  Moving Std Dev
                </Button>
                <Button
                  size="xs"
                  variant={rollingMedian ? 'filled' : 'outline'}
                  onClick={() => setRollingMedian(!rollingMedian)}
                >
                  Moving Median
                </Button>
              </Group>

              <Group justify="space-between" align="end">
                <TextInput
                  label="Output Table Name"
                  size="xs"
                  placeholder={`${currentTable?.name || 'table'}_rolling`}
                  value={rollingOutName}
                  onChange={(e) => setRollingOutName(e.currentTarget.value)}
                />
                <Button size="xs" onClick={handleApplyRolling}>
                  Compute Rolling Stats
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>

          {/* TAB 5: JOIN & ALIGN */}
          <Tabs.Panel value="join" pt="sm">
            <Stack gap="xs">
              <Group grow align="end">
                <Select
                  label="Second Table (Table B)"
                  size="xs"
                  data={availableTables
                    .filter((t) => t.id !== selectedTableId)
                    .map((t) => ({
                      value: t.id,
                      label: `${t.name} (${t.rows.length} rows)`,
                    }))}
                  value={effectiveJoinTableBId}
                  onChange={(v) => v && setJoinTableBId(v)}
                />
                <Select
                  label="Join Mode"
                  size="xs"
                  data={[
                    { value: 'exact', label: 'Exact Key Match' },
                    { value: 'interpolate', label: 'Continuous Temporal Alignment (Linear Interp)' },
                  ]}
                  value={joinMode}
                  onChange={(v) => v && setJoinMode(v as 'exact' | 'interpolate')}
                />
              </Group>

              <Group grow align="end">
                <Select
                  label={`Key in Table A (${currentTable?.name || 'A'})`}
                  size="xs"
                  data={colOptions}
                  value={effectiveJoinKeyA}
                  onChange={(v) => v && setJoinKeyA(v)}
                />
                <Select
                  label={`Key in Table B (${tableB?.name || 'B'})`}
                  size="xs"
                  data={tableB ? tableB.vars.map((v) => ({ value: v, label: v })) : []}
                  value={effectiveJoinKeyB}
                  onChange={(v) => v && setJoinKeyB(v)}
                />
              </Group>

              <Group grow align="end">
                <Select
                  label="Join Type"
                  size="xs"
                  data={[
                    { value: 'inner', label: 'Inner Join (only matching keys)' },
                    { value: 'left', label: 'Left Join (keep all Table A rows)' },
                    { value: 'outer', label: 'Outer Join (keep all rows)' },
                  ]}
                  value={joinType}
                  onChange={(v) => v && setJoinType(v as 'inner' | 'left' | 'outer')}
                />
                {joinMode === 'interpolate' && (
                  <Select
                    label="Extrapolation Policy"
                    size="xs"
                    data={[
                      { value: 'nan', label: 'NaN outside bounds' },
                      { value: 'clamp', label: 'Clamp to edge values' },
                    ]}
                    value={extrapPolicy}
                    onChange={(v) => v && setExtrapPolicy(v as 'clamp' | 'nan')}
                  />
                )}
              </Group>

              <Group justify="space-between" align="end">
                <TextInput
                  label="Output Table Name"
                  size="xs"
                  placeholder={`${currentTable?.name || 'A'}_joined_${tableB?.name || 'B'}`}
                  value={joinOutName}
                  onChange={(e) => setJoinOutName(e.currentTarget.value)}
                />
                <Button size="xs" onClick={handleApplyJoin} disabled={!tableB}>
                  Execute Join
                </Button>
              </Group>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Modal>
  )
}
