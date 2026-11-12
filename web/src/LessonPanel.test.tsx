// Phase M1: the lesson panel runs a lesson's live lab and shows its grades.

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { afterEach, expect, it, vi } from 'vitest'
import LessonPanel from './LessonPanel'
import { LESSONS } from './lessons'

vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
afterEach(cleanup)

const lesson = LESSONS.find((l) => l.example === 'lab-thermostat')!

const panel = (props: Partial<Parameters<typeof LessonPanel>[0]>) => (
  <MantineProvider>
    <LessonPanel lesson={lesson} value={() => 267.36} solving={false} onSet={() => {}} onReset={() => {}} onClose={() => {}} {...props} />
  </MantineProvider>
)

it('runs the lab and lists each grade against its reference', () => {
  const onRunLab = vi.fn()
  const { rerender } = render(panel({ canRunLab: false, onRunLab }))
  expect(screen.getByText('Run the lab live').closest('button')).toBeDisabled()
  expect(screen.getByText('Solve the example first (F2).')).toBeTruthy()
  rerender(panel({ canRunLab: true, onRunLab }))
  fireEvent.click(screen.getByText('Run the lab live'))
  expect(onRunLab).toHaveBeenCalledTimes(1)
  rerender(panel({ canRunLab: true, onRunLab, labGrades: 'running' }))
  expect(screen.getByText('Grading…').closest('button')).toBeDisabled()
  rerender(panel({
    canRunLab: true,
    onRunLab,
    labGrades: [
      { label: 'Period in the 2 K band', expected: 267.36207, measured: 267.34, tolerance: 0.1, unit: 's', pass: true },
      { label: 'Period in the 4 K band', expected: 538.9965, measured: null, tolerance: 0.2, unit: 's', pass: false },
    ],
  }))
  const items = [...screen.getByTestId('lab-grades').children].map((li) => li.textContent)
  expect(items[0]).toMatch(/^✓ Period in the 2 K band: 267\.34 s \(reference 267\.36/)
  expect(items[1]).toMatch(/^✗ Period in the 4 K band: not reached/)
  rerender(panel({ canRunLab: true, onRunLab, labGrades: { error: 'boom' } }))
  expect(screen.getByTestId('lab-error').textContent).toBe('The lab could not run: boom')
})

it('a lesson without a lab has no lab section', () => {
  render(panel({ lesson: LESSONS.find((l) => !l.lab)! }))
  expect(screen.queryByText('Live lab')).toBeNull()
})
