// Phase R: a tool is a dialog by default and a labelled region when docked, with the same content.
import { fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { beforeEach, expect, it, vi } from 'vitest'
import { ToolFrame, ToolSection } from './ToolFrame'
import { TOOL_STEPS, ToolHostContext } from './toolHost'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  Object.defineProperty(document, 'fonts', { configurable: true, value: new EventTarget() })
})

const tool = (
  <ToolFrame title="Curve Fit" onClose={() => {}}>
    <ToolSection step="Target"><span>model</span></ToolSection>
    <ToolSection step="Run"><button>Fit</button></ToolSection>
  </ToolFrame>
)

it('is a plain dialog without a host, and offers to dock with one', () => {
  const { unmount } = render(<MantineProvider env="test">{tool}</MantineProvider>)
  expect(screen.getByRole('dialog', { name: 'Curve Fit', hidden: true })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Dock as Window', hidden: true })).toBeNull()
  unmount()
  const toggle = vi.fn()
  render(<MantineProvider env="test"><ToolHostContext.Provider value={{ docked: false, toggle }}>{tool}</ToolHostContext.Provider></MantineProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Dock as Window', hidden: true }))
  expect(toggle).toHaveBeenCalledTimes(1)
})

it('is a region with the same sections, in the fixed order, when docked', () => {
  render(<MantineProvider env="test"><ToolHostContext.Provider value={{ docked: true, toggle: () => {} }}>{tool}</ToolHostContext.Provider></MantineProvider>)
  expect(screen.queryByRole('dialog', { hidden: true })).toBeNull()
  const region = screen.getByRole('region', { name: 'Curve Fit', hidden: true })
  const steps = [...region.querySelectorAll('[data-tool-step]')].map((e) => e.getAttribute('data-tool-step'))
  expect(steps).toEqual(['Target', 'Run'])
  expect(steps.map((s) => TOOL_STEPS.indexOf(s as (typeof TOOL_STEPS)[number]))).toEqual([0, 4])
  expect(screen.getByRole('button', { name: 'Open as Dialog', hidden: true })).toBeTruthy()
})
