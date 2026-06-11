import { Badge, Button, Checkbox, Group, Stack, Text, Tooltip } from '@mantine/core'
import { CheckResponse, SolveResponse, TableRowResult } from './api'
import { withStableKeys } from './format'

interface StatusTone {
  color: string
  icon: string
}

function statusTone(ok: boolean, warningCount: number): StatusTone {
  if (ok) {
    return warningCount > 0
      ? { color: 'yellow', icon: '⚠' }
      : { color: 'green', icon: '✓' }
  }
  return { color: 'red', icon: '✗' }
}

function checkLabel(solvable: boolean, warningCount: number): string {
  if (solvable) {
    return warningCount > 0 ? 'Check: Warnings' : 'Check: OK'
  }
  return 'Check: Errors'
}

function solveLabel(success: boolean, warningCount: number): string {
  if (success) {
    return warningCount > 0 ? 'Solve: Warnings' : 'Solve: OK'
  }
  return 'Solve: Failed'
}

function solveMessage(result: SolveResponse): string {
  if (!result.success) return result.error || 'Solve failed'
  if (result.unitWarnings.length > 0) {
    return `Solve successful with ${result.unitWarnings.length} unit consistency warning(s)`
  }
  return 'Solve successful'
}

function WarningsTooltip({ warnings }: Readonly<{ warnings: string[] }>) {
  return (
    <Stack gap={2}>
      {withStableKeys(warnings).map((w) => (
        <Text size="xs" key={w.key}>
          ⚠ {w.value}
        </Text>
      ))}
    </Stack>
  )
}

function CheckStatus({ checkResult }: Readonly<{ checkResult: CheckResponse }>) {
  const warningCount = checkResult.unitWarnings.length
  const tone = statusTone(checkResult.solvable, warningCount)
  return (
    <>
      <Tooltip
        label={<WarningsTooltip warnings={checkResult.unitWarnings} />}
        disabled={warningCount === 0}
      >
        <Badge
          color={tone.color}
          variant="light"
          leftSection={tone.icon}
          style={{ cursor: warningCount > 0 ? 'help' : 'default' }}
        >
          {checkLabel(checkResult.solvable, warningCount)}
        </Badge>
      </Tooltip>
      <Text size="xs" c={tone.color} style={{ fontWeight: 500 }}>
        {checkResult.message}
      </Text>
    </>
  )
}

function SolveStatus({ result }: Readonly<{ result: SolveResponse }>) {
  const tone = statusTone(result.success, result.unitWarnings.length)
  return (
    <>
      <Badge color={tone.color} variant="light" leftSection={tone.icon}>
        {solveLabel(result.success, result.unitWarnings.length)}
      </Badge>
      <Text size="xs" c={tone.color} style={{ fontWeight: 500 }}>
        {solveMessage(result)}
      </Text>
    </>
  )
}

interface EquationActionBarProps {
  checking: boolean
  solving: boolean
  solvable: boolean
  findAll: boolean
  complexMode: boolean
  checkResult: CheckResponse | null
  result: SolveResponse | null
  onCheck: () => void
  onSolve: () => void
  onFindAllChange: (checked: boolean) => void
  onComplexModeChange: (checked: boolean) => void
}

export function EquationActionBar({
  checking,
  solving,
  solvable,
  findAll,
  complexMode,
  checkResult,
  result,
  onCheck,
  onSolve,
  onFindAllChange,
  onComplexModeChange,
}: Readonly<EquationActionBarProps>) {
  return (
    <Group mt="sm" gap="sm">
      <Button variant="default" onClick={onCheck} loading={checking}>
        Check (F4)
      </Button>
      <Tooltip label={solvable ? 'Solve the system' : 'Run Check first'}>
        <Button onClick={onSolve} loading={solving} disabled={!solvable}>
          Solve (F2)
        </Button>
      </Tooltip>
      <Checkbox
        label="Find all solutions"
        checked={findAll}
        onChange={(e) => onFindAllChange(e.currentTarget.checked)}
      />
      <Checkbox
        label="Complex mode"
        checked={complexMode}
        onChange={(e) => onComplexModeChange(e.currentTarget.checked)}
      />

      {checkResult && (
        <Group gap="xs" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {result === null && <CheckStatus checkResult={checkResult} />}
          {result && <SolveStatus result={result} />}
        </Group>
      )}
    </Group>
  )
}

function TableRunSummary({ results }: Readonly<{ results: TableRowResult[] }>) {
  const solvedCount = results.filter((r) => r.success).length
  const allSolved = solvedCount === results.length
  return (
    <Group gap="xs">
      <Badge
        color={allSolved ? 'green' : 'red'}
        variant="light"
        leftSection={allSolved ? '✓' : '✗'}
      >
        Table: {solvedCount}/{results.length} runs solved
      </Badge>
      {!allSolved && (
        <Text size="xs" c="red" fw={500}>
          Failed runs are marked ✗ — hover for the reason.
        </Text>
      )}
    </Group>
  )
}

function TableCheckSummary({
  checkResult,
  message,
}: Readonly<{ checkResult: CheckResponse | null; message: string }>) {
  const ok = checkResult?.solvable === true
  return (
    <Group gap="xs">
      <Badge
        color={ok ? 'green' : 'red'}
        variant="light"
        leftSection={ok ? '✓' : '✗'}
      >
        {ok ? 'Table Check: OK' : 'Table Check: Errors'}
      </Badge>
      <Text size="xs" c={ok ? 'green' : 'red'} fw={500}>
        {message}
      </Text>
    </Group>
  )
}

function TableStatusLine({
  results,
  checkResult,
  checkMessage,
}: Readonly<{
  results: TableRowResult[]
  checkResult: CheckResponse | null
  checkMessage: string
}>) {
  if (results.length > 0) {
    return <TableRunSummary results={results} />
  }
  if (checkResult || checkMessage) {
    return <TableCheckSummary checkResult={checkResult} message={checkMessage} />
  }
  return (
    <Text size="xs" c="dimmed">
      Configure columns, fill input values (use the ⤓ column fill), then
      Check Table.
    </Text>
  )
}

interface TableActionBarProps {
  tableChecking: boolean
  tableSolving: boolean
  tableCheckResult: CheckResponse | null
  tableCheckMessage: string
  tableResults: TableRowResult[]
  onCheckTable: () => void
  onSolveTable: () => void
}

export function TableActionBar({
  tableChecking,
  tableSolving,
  tableCheckResult,
  tableCheckMessage,
  tableResults,
  onCheckTable,
  onSolveTable,
}: Readonly<TableActionBarProps>) {
  return (
    <Group mt="sm" gap="sm">
      <Button variant="default" onClick={onCheckTable} loading={tableChecking}>
        Check Table (F4)
      </Button>
      <Tooltip
        label={
          tableCheckResult?.solvable
            ? 'Solve every table run'
            : 'Run Check Table first'
        }
      >
        <Button
          onClick={onSolveTable}
          loading={tableSolving}
          disabled={tableCheckResult?.solvable !== true}
        >
          Solve Table (F2)
        </Button>
      </Tooltip>

      <TableStatusLine
        results={tableResults}
        checkResult={tableCheckResult}
        checkMessage={tableCheckMessage}
      />
    </Group>
  )
}
