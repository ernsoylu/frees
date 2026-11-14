// Phase O: the ribbon's behaviour — tabs from the registry, the contextual tab,
// unavailable and toggle states, arrow keys, collapse and peek; Phase P's slots.
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MantineProvider } from '@mantine/core'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Ribbon, RibbonGroup } from './Ribbon'
import { useRibbonSlots } from './ribbonSlots'
import { COMMAND_SPECS, resolveCommands, type CommandHandlers, type CommandId } from './commands'
import { contextHandler, publishContext, usePublishContext, withdrawContext } from './contextActions'
import { readRibbonDensity } from './ribbonPrefs'
import { referenceSlug, searchFunctions, ALL_CATEGORIES } from './functionSearch'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => vi.unstubAllGlobals())

const wrap = ({ children }: { children: ReactNode }) => <MantineProvider env="test">{children}</MantineProvider>
const cmds = (over: Partial<CommandHandlers> = {}) =>
  resolveCommands({ ...Object.fromEntries((Object.keys(COMMAND_SPECS) as CommandId[]).map((id) => [id, { run: vi.fn() }])), ...over } as CommandHandlers)

describe('Ribbon', () => {
  it('shows the permanent tabs, and the contextual one only for its window', () => {
    const { rerender } = render(<Ribbon commands={cmds()} context={null} density="expanded" onDensityChange={vi.fn()} />, { wrapper: wrap })
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Home', 'Insert', 'Data', 'Analysis', 'View', 'Help'])
    rerender(<Ribbon commands={cmds()} context="table" density="expanded" onDensityChange={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'Table' })).toBeTruthy()
    // Focusing a table does not switch tabs.
    expect(screen.getByRole('tab', { name: 'Home' }).getAttribute('aria-selected')).toBe('true')
  })

  it('falls back to Home when the contextual tab goes, and stays there when it returns', () => {
    const r = (context: 'table' | null) => <Ribbon commands={cmds()} context={context} density="expanded" onDensityChange={vi.fn()} />
    const { rerender } = render(r('table'), { wrapper: wrap })
    fireEvent.click(screen.getByRole('tab', { name: 'Table' }))
    expect(screen.getByRole('tab', { name: 'Table' }).getAttribute('aria-selected')).toBe('true')
    rerender(r(null))
    rerender(r('table'))
    expect(screen.getByRole('tab', { name: 'Home' }).getAttribute('aria-selected')).toBe('true')
  })

  it('labels each group, keeps an unavailable command focusable with its reason, and presses toggles', () => {
    const run = vi.fn()
    render(<Ribbon commands={cmds({ 'run.stop': { run, unavailable: 'Nothing is running.' }, 'run.findAll': { run: vi.fn(), checked: true } })} context={null} density="expanded" onDensityChange={vi.fn()} />, { wrapper: wrap })
    expect(screen.getByRole('group', { name: 'Solve Setup' })).toBeTruthy()
    const stop = screen.getByRole('button', { name: 'Stop' })
    expect(stop.getAttribute('aria-disabled')).toBe('true')
    expect(document.getElementById(stop.getAttribute('aria-describedby')!)?.textContent).toContain('Unavailable: Nothing is running.')
    fireEvent.click(stop)
    expect(run).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Find All Solutions' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('moves focus with the arrow keys inside the panel', () => {
    render(<Ribbon commands={cmds()} context={null} density="expanded" onDensityChange={vi.fn()} />, { wrapper: wrap })
    const first = screen.getByRole('button', { name: 'New Project' })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open Project…' }))
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(first)
  })

  it('collapses on double-click and peeks the panel on a tab click when collapsed', () => {
    const toggle = vi.fn()
    const { rerender } = render(<Ribbon commands={cmds({ 'view.ribbon': { run: toggle } })} context={null} density="expanded" onDensityChange={vi.fn()} />, { wrapper: wrap })
    fireEvent.doubleClick(screen.getByRole('tab', { name: 'Insert' }))
    expect(toggle).toHaveBeenCalledOnce()
    rerender(<Ribbon commands={cmds({ 'view.ribbon': { run: toggle } })} context={null} density="collapsed" onDensityChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'New X-Y Plot' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Insert' }))
    expect(screen.getByRole('button', { name: 'New X-Y Plot' })).toBeTruthy()
  })

  it('takes a window\'s own groups into a tab slot', () => {
    function Canvas() {
      const { on, slots } = useRibbonSlots()
      const own = <><button type="button">Arrange</button><button type="button">Tidy</button></>
      if (!on) return own
      return slots.schematic ? createPortal(<RibbonGroup label="Arrange">{own}</RibbonGroup>, slots.schematic) : null
    }
    const r = (ribbon: boolean) => (
      <>
        {ribbon && <Ribbon commands={cmds()} context="schematic" density="expanded" onDensityChange={vi.fn()} />}
        <Canvas />
      </>
    )
    const { rerender } = render(r(false), { wrapper: wrap })
    expect(screen.getByRole('button', { name: 'Arrange' })).toBeTruthy()
    rerender(r(true))
    // On, but the Schematic tab is not shown: the control has no place yet.
    expect(screen.queryByRole('button', { name: 'Arrange' })).toBeNull()
    fireEvent.click(screen.getByRole('tab', { name: 'Schematic' }))
    const arrange = screen.getByRole('group', { name: 'Arrange' }).querySelector('button')!
    expect(arrange.textContent).toBe('Arrange')
    // Arrow keys move between portaled controls too: React bubbles their keys
    // through the window that owns them, so the ribbon listens on the DOM.
    arrange.focus()
    fireEvent.keyDown(arrange, { key: 'ArrowRight' })
    expect(document.activeElement?.textContent).toBe('Tidy')
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(arrange)
    rerender(r(false))
    expect(screen.getByRole('button', { name: 'Arrange' })).toBeTruthy()
  })

  it('defaults to collapsed below 900 px of height', () => {
    localStorage.removeItem('frees.ribbonDensity')
    expect(readRibbonDensity(800)).toBe('collapsed')
    expect(readRibbonDensity(1000)).toBe('expanded')
  })
})

describe('context actions', () => {
  it('runs the latest handler and notifies only when availability changes', () => {
    const first = vi.fn()
    const second = vi.fn()
    function Panel({ run, reason }: { run: () => void; reason: string | null }) {
      usePublishContext('w1', { 'table.addRow': { run, unavailable: reason } })
      return null
    }
    const { rerender, unmount } = render(<Panel run={first} reason={null} />)
    rerender(<Panel run={second} reason={null} />)
    act(() => contextHandler('w1', 'table.addRow')!.run())
    expect(second).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()
    rerender(<Panel run={second} reason="Busy." />)
    expect(contextHandler('w1', 'table.addRow')?.unavailable).toBe('Busy.')
    unmount()
    expect(contextHandler('w1', 'table.addRow')).toBeUndefined()
  })

  it('keeps a newer publication when an older one is withdrawn', () => {
    const a = { 'plot.export': { run: vi.fn() } }
    const b = { 'plot.export': { run: vi.fn() } }
    publishContext('p', a)
    publishContext('p', b)
    withdrawContext('p', a)
    expect(contextHandler('p', 'plot.export')).toBe(b['plot.export'])
    withdrawContext('p', b)
  })
})

describe('function browser search', () => {
  it('finds by purpose across categories and links documented functions', () => {
    const hits = searchFunctions('specific enthalpy', ALL_CATEGORIES)
    expect(hits.map((h) => h.item.label)).toContain('Enthalpy')
    expect(referenceSlug(hits.find((h) => h.item.label === 'Enthalpy')!.item)).toBe('enthalpy')
    expect(searchFunctions('no such thing at all', ALL_CATEGORIES)).toEqual([])
  })
})
