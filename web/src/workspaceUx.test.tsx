import type { ComponentProps, ReactNode } from 'react'
import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import MobileLayout from './MobileLayout'
import Workspace from './Workspace'
import { Rail, TopBar } from './WorkspaceChrome'
import { newFunctionTable, newParamTable } from './tables'
import { TABLES_WORKBOOK_WINDOW_ID } from './tablesGrid/tablesWorkbookBridge'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  HTMLElement.prototype.scrollIntoView = () => {}
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function shell(children: ReactNode) {
  return <MantineProvider env="test">{children}</MantineProvider>
}

function mobileProps(): ComponentProps<typeof MobileLayout> {
  return {
    panelContent: { equations: 'Equation editor', workspace: 'Solved variables', [TABLES_WORKBOOK_WINDOW_ID]: 'Workbook' },
    tables: [], stateTables: [], activeTableId: null, plots: [], projectName: 'Test project',
    checking: false, solving: false, checkingTableId: null, solvingTableId: null,
    onActiveTableId: vi.fn(), onCheck: vi.fn(), onSolve: vi.fn(), onStop: vi.fn(),
    onCheckTable: vi.fn(), onSolveTable: vi.fn(), onSaveProject: vi.fn(), onSaveProjectAs: vi.fn(),
    onNewProject: vi.fn(), onOpenProject: vi.fn(), onOpenLibrary: vi.fn(), onPreferences: vi.fn(),
    onRenameProject: vi.fn(), onOpenExamples: vi.fn(), onOpenUrl: vi.fn(),
  }
}

it('shows navigation labels for new users and remembers a collapsed sidebar', () => {
  const onSelect = vi.fn()
  const rail = () => shell(<Rail active="equations" onSelect={onSelect} onPreferences={vi.fn()} onAbout={vi.fn()} />)
  const view = render(rail())
  fireEvent.click(screen.getByLabelText('Variable Explorer'))
  expect(onSelect).toHaveBeenCalledWith('workspace')
  expect(screen.getByText('Variables')).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Collapse sidebar'))
  view.unmount()
  render(rail())
  expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
  expect(screen.queryByText('Variables')).not.toBeInTheDocument()
})

it('offers a solve and examples from empty results, and recovers from an empty filter', () => {
  const onSolve = vi.fn()
  const onOpenExamples = vi.fn()
  const view = render(shell(<Workspace variables={[]} onSolve={onSolve} onOpenExamples={onOpenExamples} />))
  fireEvent.click(screen.getByText('Solve equations'))
  fireEvent.click(screen.getByText('Explore examples'))
  expect(onSolve).toHaveBeenCalledOnce()
  expect(onOpenExamples).toHaveBeenCalledOnce()
  expect(screen.getByLabelText('Filter workspace variables')).toBeDisabled()
  view.rerender(shell(<Workspace variables={[{ name: 'pressure', value: 10, units: 'Pa' }]} />))
  fireEvent.change(screen.getByLabelText('Filter workspace variables'), { target: { value: 'missing' } })
  fireEvent.click(screen.getByText('Clear filter'))
  expect(screen.getByText('pressure')).toBeInTheDocument()
})

it('keeps the sidebar compact on smaller screens unless the user expands it', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  render(shell(<Rail active="equations" onSelect={vi.fn()} onPreferences={vi.fn()} onAbout={vi.fn()} />))
  fireEvent.click(screen.getByLabelText('Expand sidebar'))
  expect(screen.getByText('Variables')).toBeInTheDocument()
  expect(localStorage.getItem('frees.railExpanded')).toBe('true')
})

it('shows mobile workspace results after solving and keeps Stop available across tabs', async () => {
  const props = mobileProps()
  props.onSolve = vi.fn().mockResolvedValue('workspace')
  const view = render(shell(<MobileLayout {...props} />))
  fireEvent.click(screen.getByText('Solve'))
  expect(await screen.findByText('Solved variables')).toBeInTheDocument()
  view.rerender(shell(<MobileLayout {...props} solvingTableId="background-table" />))
  fireEvent.click(screen.getByText('Terminal'))
  expect(screen.getByText('Check').closest('button')).toBeDisabled()
  fireEvent.click(screen.getByText('Stop solving'))
  expect(props.onStop).toHaveBeenCalledOnce()
})

it('selects tables by full name and only sends parametric tables to table actions', () => {
  const props = mobileProps()
  const param = { ...newParamTable([]), name: 'Pressure sweep' }
  const curve = { ...newFunctionTable([], true), name: 'Pressure calibration' }
  props.tables = [param, curve]
  props.activeTableId = param.id
  props.stateTables = [{ id: 'state:loop', name: 'Loop states' }]
  props.panelContent['state:loop'] = 'Fluid state results'
  render(shell(<MobileLayout {...props} />))
  fireEvent.click(screen.getByText('Tables'))
  fireEvent.click(screen.getByText('Solve table'))
  expect(props.onSolveTable).toHaveBeenCalledWith(param.id)
  fireEvent.click(screen.getByLabelText('Active table', { selector: 'input' }))
  fireEvent.click(screen.getByText(curve.name))
  expect(props.onActiveTableId).toHaveBeenCalledWith(curve.id)
  fireEvent.click(screen.getByText('Solve'))
  fireEvent.click(screen.getByText('Check'))
  expect(props.onSolve).toHaveBeenCalledOnce()
  expect(props.onCheck).toHaveBeenCalledOnce()
  expect(props.onCheckTable).not.toHaveBeenCalled()
  fireEvent.click(screen.getByLabelText('Active table', { selector: 'input' }))
  fireEvent.click(screen.getByText('Loop states'))
  expect(screen.getByText('Fluid state results')).toBeInTheDocument()
  expect(props.onActiveTableId).toHaveBeenCalledTimes(1)
})

it('selects similarly named plots without relying on two-letter abbreviations', () => {
  const props = mobileProps()
  props.plots = [{ id: 'a', name: 'Pressure inlet' }, { id: 'b', name: 'Pressure outlet' }]
  props.panelContent['plot:a'] = 'Inlet chart'
  props.panelContent['plot:b'] = 'Outlet chart'
  render(shell(<MobileLayout {...props} />))
  fireEvent.click(screen.getByLabelText('Plots'))
  fireEvent.click(screen.getByLabelText('Active plot', { selector: 'input' }))
  fireEvent.click(screen.getByText('Pressure outlet'))
  expect(screen.getByText('Outlet chart')).toBeInTheDocument()
})

function topBarProps(over: Partial<ComponentProps<typeof TopBar>> = {}): ComponentProps<typeof TopBar> {
  const props: Record<string, unknown> = {
    isTable: false, checking: false, solving: false, solveProgress: null, solvable: false, findAll: false,
    complexMode: false, checkResult: null, result: null, tableChecking: false, tableSolving: false,
    tableCheckResult: null, tableCheckMessage: '', tableResults: [], projectName: 'Test project', canPrintReport: false,
  }
  for (const k of ['onCheck', 'onSolve', 'onStop', 'onCheckTable', 'onSolveTable', 'onFindAllChange', 'onComplexModeChange',
    'onRenameProject', 'onNewProject', 'onOpenProject', 'onOpenLibrary', 'onSaveProject', 'onSaveProjectAs', 'onExportEquations',
    'onInsertFunction', 'onInsertComponent', 'onOpenExamples', 'onOpenUrl', 'onShareLink', 'onPrintReport', 'onOpenInspector',
    'onOpenWorkspace', 'onOpenTerminal', 'onVariableInfo', 'onMonteCarlo', 'onSensitivity', 'onMinMax', 'onCurveFit',
    'onParameterFit', 'onPidTuner']) props[k] = vi.fn()
  return { ...(props as ComponentProps<typeof TopBar>), ...over }
}

it('names the run target beside Check and Solve, and keeps Stop while any job runs (N2)', () => {
  const onSolveTable = vi.fn()
  const view = render(shell(<TopBar {...topBarProps({ isTable: true, targetLabel: 'Table: Sweep', onSolveTable })} />))
  expect(screen.getByTestId('run-target')).toHaveTextContent('Table: Sweep')
  fireEvent.click(screen.getByRole('button', { name: 'Solve' }))
  expect(onSolveTable).toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument()
  // A table run behind a focused Editor: the target is the model, but Stop stays.
  view.rerender(shell(<TopBar {...topBarProps({ targetLabel: 'Model', runBusy: true })} />))
  expect(screen.getByTestId('run-target')).toHaveTextContent('Model')
  expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
})
