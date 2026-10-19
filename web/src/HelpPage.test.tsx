import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import HelpPage from './HelpPage'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal('scrollTo', () => {})
  HTMLElement.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  vi.unstubAllGlobals()
  globalThis.location.hash = ''
})

const page = () => render(<MantineProvider env="test"><HelpPage /></MantineProvider>)

it('opens on the documentation home with a card per guide category', () => {
  page()
  expect(screen.getByRole('tab', { name: 'Documentation' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText('Reference by category')).toBeInTheDocument()
  fireEvent.click(screen.getAllByText('Language Keywords')[0])
  expect(globalThis.location.hash).toBe('#refcat:Language%20Keywords')
})

it('frames a reference page with its trail, scope, siblings and grouped See Also', () => {
  globalThis.location.hash = '#refpage:dynamic'
  page()
  const article = document.getElementById('help-article')!
  const trail = within(article)
  expect(trail.getByText('Function Index')).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: 'Functions' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText('Keyword')).toBeInTheDocument()
  expect(screen.getByText('Verified example')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'See Also' })).toBeInTheDocument()
  // Sibling keyword pages sit in the contextual nav.
  expect(screen.getAllByText('LINEARIZE').length).toBeGreaterThan(0)
  // Authoring markers never reach the reader.
  expect(article.textContent).not.toContain('verified-reference-example')
})

it('folds reference arguments shut and leaves examples open', () => {
  globalThis.location.hash = '#refpage:hypot'
  page()
  const article = within(document.getElementById('help-article')!)
  const example = article.getByRole('button', { name: /Verified example/, hidden: true })
  const argument = article.getByRole('button', { name: /x — First component/, hidden: true })
  expect(example).toHaveAttribute('aria-expanded', 'true')
  expect(argument).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(argument)
  expect(argument).toHaveAttribute('aria-expanded', 'true')
})

it('scopes search to the reference category until the chip is dismissed', async () => {
  globalThis.location.hash = '#refpage:dynamic'
  page()
  const search = screen.getByLabelText('Search documentation')
  expect(search).toHaveAttribute('placeholder', 'Search Language Keywords…')
  fireEvent.focus(search)
  fireEvent.change(search, { target: { value: 'linear' } })
  const chip = await screen.findByText('Scoped to Language Keywords')
  expect(chip).toBeInTheDocument()
  fireEvent.click(screen.getByLabelText('Search everything'))
  expect(screen.queryByText('Scoped to Language Keywords')).not.toBeInTheDocument()
  expect(search).toHaveAttribute('placeholder', 'Search functions, guides, examples…')
})
